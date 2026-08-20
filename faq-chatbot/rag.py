import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from gemini import ask_gemini


ROOT = Path(__file__).parent
DATA_PATH = ROOT / "faq_combined.jsonl"
SYNONYMS_PATH = ROOT / "synonyms.json"


def load_faqs():
    faqs = []

    with DATA_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if line:
                faqs.append(json.loads(line))

    return faqs


def save_faqs(faqs):
    with DATA_PATH.open("w", encoding="utf-8") as file:
        for faq in faqs:
            file.write(
                json.dumps(
                    faq,
                    ensure_ascii=False
                )
                + "\n"
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


def make_document(faq):
    return " ".join(
        [
            faq.get("cert", ""),
            faq.get("category", ""),
            faq.get("title", ""),
            faq.get("body", ""),
            faq.get("reply", ""),
        ]
    )


FAQ = []
VECTORIZER = None
FAQ_MATRIX = None


def rebuild_index():
    global FAQ
    global VECTORIZER
    global FAQ_MATRIX

    FAQ = load_faqs()

    documents = [
        make_document(faq)
        for faq in FAQ
    ]

    VECTORIZER = TfidfVectorizer()

    FAQ_MATRIX = VECTORIZER.fit_transform(
        documents
    )


rebuild_index()


def retrieve(question, top_k=1, min_score=0.2):
    expanded_question = expand_question(question)

    question_vector = VECTORIZER.transform(
        [expanded_question]
    )

    similarities = cosine_similarity(
        question_vector,
        FAQ_MATRIX
    )[0]

    ranked_indices = similarities.argsort()[::-1]

    results = []

    for index in ranked_indices:
        score = similarities[index]


        if score < min_score:
            break

        results.append(
            (score, FAQ[index])
        )

        if len(results) >= top_k:
            break

    return results


def add_faq_entry(cert, title, body, keywords):
    faqs = load_faqs()

    next_id = max(
        [
            faq.get("id", 0)
            for faq in faqs
            if isinstance(faq.get("id", 0), int)
        ],
        default=0,
    ) + 1

    keyword_list = [
        keyword.strip()
        for keyword in keywords.split(",")
        if keyword.strip()
    ]

    category = (
        keyword_list[0]
        if keyword_list
        else "기타"
    )

    new_faq = {
        "id": next_id,
        "channel": "admin",
        "caller_type": "general",
        "cert": cert.strip(),
        "category": category,
        "variation_level": "L0",
        "title": title.strip(),
        "body": title.strip(),
        "reply": body.strip(),
        "resolution": "관리자추가",
    }

    faqs.append(new_faq)

    save_faqs(faqs)
    rebuild_index()

    return new_faq


def delete_faq_entry(faq_id):
    faqs = load_faqs()

    try:
        faq_id = int(faq_id)
    except ValueError:
        return False

    new_faqs = [
        faq
        for faq in faqs
        if faq.get("id") != faq_id
    ]

    if len(new_faqs) == len(faqs):
        return False

    save_faqs(new_faqs)
    rebuild_index()

    return True


def get_faq_list():
    return load_faqs()


def build_prompt(question, results):
    context = "\n\n".join(
        f"[FAQ {i + 1}]\n"
        f"자격증: {faq.get('cert', '')}\n"
        f"분류: {faq.get('category', '')}\n"
        f"제목: {faq.get('title', '')}\n"
        f"질문: {faq.get('body', '')}\n"
        f"답변: {faq.get('reply', '')}"
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

    prompt = build_prompt(
        question,
        results
    )

    try:
        answer = ask_gemini(prompt)

        sources = ", ".join(
            faq.get("title", "")
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