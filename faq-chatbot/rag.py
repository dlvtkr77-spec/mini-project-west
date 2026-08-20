import json
import re
from pathlib import Path

from gemini import ask_gemini


ROOT = Path(__file__).parent
FAQ_PATH = ROOT / "faq.json"

FAQ = json.loads(FAQ_PATH.read_text(encoding="utf-8"))


def tokens(text):
    return set(re.findall(r"[가-힣A-Za-z0-9]+", text.lower()))


def retrieve(question, top_k=3, min_score=2):
    question_tokens = tokens(question)
    ranked = []

    for faq in FAQ:
        keywords = faq.get("keywords", [])

        keyword_hits = sum(
            1 for keyword in keywords
            if keyword.lower() in question.lower()
        )

        faq_text = (
            faq.get("title", "")
            + " "
            + faq.get("text", "")
            + " "
            + " ".join(keywords)
        )

        overlap = len(question_tokens & tokens(faq_text))

        score = (keyword_hits * 2) + overlap

        if score >= min_score:
            ranked.append((score, faq))

    ranked.sort(key=lambda x: x[0], reverse=True)

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

        return {
            "status": "FOUND",
            "answer": answer,
            "source": results[0][1]["title"],
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "answer": str(e),
            "source": "없음",
        }