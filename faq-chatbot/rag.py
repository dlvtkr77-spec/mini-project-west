import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from gemini import ask_gemini


ROOT = Path(__file__).parent
DATA_PATH = ROOT / "faq_combined.jsonl"
SYNONYMS_PATH = ROOT / "synonyms.json"


# -------------------------
# FAQ 불러오기 / 저장
# -------------------------

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
                ) + "\n"
            )


# -------------------------
# 동의어
# -------------------------

def load_synonyms():
    if not SYNONYMS_PATH.exists():
        return {}

    return json.loads(
        SYNONYMS_PATH.read_text(encoding="utf-8")
    )


def expand_question(question):
    synonyms = load_synonyms()
    expanded = question.strip()

    for short, full in synonyms.items():
        if short in expanded:
            expanded = expanded.replace(short, full)

    return expanded


# -------------------------
# 자격증 별칭
# -------------------------

CERT_ALIASES = {
    "굴착기": [
        "굴착기",
        "굴착기운전",
        "굴착기운전기능사",
    ],

    "지게차": [
        "지게차",
        "지게차운전",
        "지게차운전기능사",
    ],

    "전기": [
        "전기",
        "전기기능사",
    ],

    "한식조리": [
        "한식",
        "한식조리",
        "한식조리기능사",
    ],

    "요양보호사": [
        "요양보호사",
    ],

    "공인중개사": [
        "공인중개사",
    ],

    "손해평가사": [
        "손해평가사",
    ],
}


# -------------------------
# 자격증 인식
# -------------------------

def find_cert(question):
    expanded = expand_question(question)

    matches = []

    for cert, aliases in CERT_ALIASES.items():

        for alias in aliases:

            if alias in expanded:
                matches.append(
                    (
                        len(alias),
                        cert,
                    )
                )

    if not matches:
        return None

    # 가장 긴 이름이 일치한 것을 우선
    matches.sort(
        key=lambda item: item[0],
        reverse=True
    )

    return matches[0][1]


def is_cert_only_question(question, cert):
    expanded = expand_question(question).strip()

    aliases = CERT_ALIASES.get(
        cert,
        [cert]
    )

    return expanded in aliases


# -------------------------
# 검색용 문서
# -------------------------

def make_document(faq):
    return " ".join(
        [
            faq.get("category", ""),
            faq.get("title", ""),
            faq.get("body", ""),
            faq.get("reply", ""),
            faq.get("resolution", ""),
        ]
    )


FAQ = []


def rebuild_index():
    global FAQ

    FAQ = load_faqs()


rebuild_index()


# -------------------------
# FAQ 검색
# -------------------------

def retrieve(question, top_k=1, min_score=0.15):
    expanded_question = expand_question(question)

    detected_cert = find_cert(expanded_question)

    # 자격증을 인식했다면
    # 해당 자격증 FAQ만 검색
    if detected_cert:

        candidates = [
            faq
            for faq in FAQ
            if faq.get("cert", "").strip() == detected_cert
        ]

    else:

        candidates = FAQ

    if not candidates:
        return []

    documents = [
        make_document(faq)
        for faq in candidates
    ]

    vectorizer = TfidfVectorizer()

    try:
        document_matrix = vectorizer.fit_transform(
            documents
        )

        question_vector = vectorizer.transform(
            [expanded_question]
        )

    except ValueError:
        return []

    similarities = cosine_similarity(
        question_vector,
        document_matrix
    )[0]

    ranked_indices = similarities.argsort()[::-1]

    results = []

    for index in ranked_indices:

        score = similarities[index]

        if score < min_score:
            continue

        results.append(
            (
                score,
                candidates[index]
            )
        )

        if len(results) >= top_k:
            break

    return results


# -------------------------
# FAQ 추가
# -------------------------

def add_faq_entry(cert, title, body, keywords):
    faqs = load_faqs()

    next_id = max(
        [
            faq.get("id", 0)
            for faq in faqs
            if isinstance(
                faq.get("id", 0),
                int
            )
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


# -------------------------
# FAQ 삭제
# -------------------------

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


# -------------------------
# Gemini 프롬프트
# -------------------------

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

반드시 아래 FAQ 내용만 근거로 답변해라.

규칙:
1. FAQ에 있는 내용만 답변한다.
2. 다른 자격증의 정보를 섞지 않는다.
3. FAQ에 없는 정보는 추측하지 않는다.
4. FAQ의 답변 내용을 우선 사용한다.
5. 답변은 짧고 이해하기 쉽게 작성한다.
6. "업데이트되는 대로 안내하겠다" 같은 FAQ에 없는 약속은 하지 않는다.

[FAQ]
{context}

[사용자 질문]
{question}
""".strip()


# -------------------------
# 최종 답변
# -------------------------

def answer_question(question):
    question = question.strip()

    if not question:

        return {
            "status": "NOT_FOUND",
            "answer": "질문을 입력해주세요.",
            "source": "없음",
        }

    detected_cert = find_cert(question)

    # -------------------------
    # 자격증 자체를 찾지 못함
    # -------------------------

    if not detected_cert:

        return {
            "status": "NOT_FOUND",
            "answer": (
                "해당 자격증에 대한 안내 정보를 찾지 못했습니다. "
                "지원하는 자격증의 시험 접수 관련 내용을 질문해주세요."
            ),
            "source": "없음",
        }

    # -------------------------
    # 자격증 이름만 입력
    # -------------------------

    if is_cert_only_question(
        question,
        detected_cert
    ):

        return {
            "status": "NOT_FOUND",
            "answer": (
                f"{detected_cert}에 대해 어떤 정보가 궁금하신가요? "
                "시험비, 접수 방법, 시험 일정 등 궁금한 내용을 질문해주세요."
            ),
            "source": "없음",
        }

    # -------------------------
    # 해당 자격증 FAQ 검색
    # -------------------------

    results = retrieve(question)

    if not results:

        return {
            "status": "NOT_FOUND",
            "answer": (
                f"{detected_cert}에 대한 질문은 인식했지만, "
                "해당 내용은 FAQ에서 확인할 수 없습니다."
            ),
            "source": "없음",
        }

    # -------------------------
    # Gemini 답변
    # -------------------------

    prompt = build_prompt(
        question,
        results
    )

    try:

        answer = ask_gemini(prompt)

        sources = ", ".join(
            faq.get("title", "")
            for _, faq in results
            if faq.get("title", "")
        )

        return {
            "status": "FOUND",
            "answer": answer,
            "source": sources or "없음",
        }

    except Exception as e:

        return {
            "status": "ERROR",
            "answer": str(e),
            "source": "없음",
        }