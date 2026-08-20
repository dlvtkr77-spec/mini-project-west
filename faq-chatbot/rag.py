import json
import re
from pathlib import Path

from gemini import ask_gemini


ROOT = Path(__file__).parent
FAQ_PATH = ROOT / "faq.json"
SYNONYMS_PATH = ROOT / "synonyms.json"


def load_faqs():
    return json.loads(
        FAQ_PATH.read_text(encoding="utf-8")
    )


def load_synonyms():
    if not SYNONYMS_PATH.exists():
        return {}

    return json.loads(
        SYNONYMS_PATH.read_text(encoding="utf-8")
    )


def expand_question(question):
    synonyms = load_synonyms()
    expanded = question

    for short, full in synonyms.items():
        if short in expanded:
            expanded = expanded.replace(short, full)

    return expanded


def tokens(text):
    return set(
        re.findall(r"[가-힣A-Za-z0-9]+", text.lower())
    )


def retrieve(question, top_k=3, min_score=1):
    faqs = load_faqs()

    expanded_question = expand_question(question)
    question_lower = expanded_question.lower()
    question_tokens = tokens(expanded_question)

    ranked = []

    for faq in faqs:
        title = faq.get("title", "")
        text = faq.get("text", "")
        keywords = faq.get("keywords", [])

        searchable_text = (
            title
            + " "
            + text
            + " "
            + " ".join(keywords)
        ).lower()

        score = 0

        for keyword in keywords:
            if keyword.lower() in question_lower:
                score += 3

        for token in question_tokens:
            if len(token) >= 2 and token in searchable_text:
                score += 1

        certificate_words = [
            "한식",
            "지게차",
            "굴착기",
            "굴삭기",
            "요양보호사",
            "전기기능사",
            "위생사",
            "손해평가사",
            "공인중개사",
        ]

        for word in certificate_words:
            if word in question_lower and word in searchable_text:
                score += 3

        intent_words = [
            "접수",
            "시험비",
            "응시료",
            "수수료",
            "시험",
            "시험시간",
            "필기",
            "실기",
            "합격",
            "응시자격",
            "환불",
            "시험장",
        ]

        for word in intent_words:
            if word in question_lower and word in searchable_text:
                score += 2

        if score >= min_score:
            ranked.append((score, faq))

    ranked.sort(
        key=lambda x: x[0],
        reverse=True,
    )

    return ranked[:top_k]


def build_prompt(question, results):
    context = "\n\n".join(
        f"[FAQ {i + 1}]\n"
        f"제목: {faq['title']}\n"
        f"내용: {faq['text']}"
        for i, (_, faq) in enumerate(results)
    )

    return f"""
너는 자격증 시험 접수 안내 챗봇이다.

아래 FAQ 내용만 근거로 사용해서 사용자의 질문에 답해라.
FAQ에서 확인할 수 없는 내용은 추측하지 마라.
질문과 직접 관련된 FAQ를 우선해서 답변해라.
답변은 이해하기 쉽게 간결하게 작성해라.

[FAQ]
{context}

[사용자 질문]
{question}
""".strip()


def answer_question(question):
    results = retrieve(question)

    if not results:
        return {
            "status": "NOT_FOUND",
            "answer": "FAQ에서 확인할 수 없는 내용입니다.",
            "source": "없음",
        }

    prompt = build_prompt(question, results)

    try:
        answer = ask_gemini(prompt)

        sources = ", ".join(
            faq["title"]
            for _, faq in results
        )

        return {
            "status": "FOUND",
            "answer": answer,
            "source": sources,
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "answer": str(e),
            "source": "없음",
        }