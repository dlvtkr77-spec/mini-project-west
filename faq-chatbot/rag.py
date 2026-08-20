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
                )
                + "\n"
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
    expanded = question

    for short, full in synonyms.items():
        if short in expanded:
            expanded = expanded.replace(short, full)

    return expanded


# -------------------------
# 검색 문서 생성
# -------------------------

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


# -------------------------
# 자격증명 인식
# -------------------------

def make_cert_variations(cert):
    """
    정식 자격증명에서 사용자가 입력할 법한
    짧은 이름들을 자동으로 만든다.

    예:
    굴착기운전기능사 -> 굴착기운전기능사, 굴착기운전, 굴착기
    한식조리기능사 -> 한식조리기능사, 한식조리, 한식
    지게차운전기능사 -> 지게차운전기능사, 지게차운전, 지게차
    """

    cert = cert.strip()

    variations = {cert}

    suffixes = [
        "산업기사",
        "운전기능사",
        "기능사",
        "기사",
        "기능장",
        "기술사",
    ]

    for suffix in suffixes:
        if cert.endswith(suffix):
            short = cert[:-len(suffix)].strip()

            if len(short) >= 2:
                variations.add(short)

    # '운전' 제거
    for variation in list(variations):
        if variation.endswith("운전"):
            short = variation[:-2].strip()

            if len(short) >= 2:
                variations.add(short)

    # '조리' 제거
    for variation in list(variations):
        if variation.endswith("조리"):
            short = variation[:-2].strip()

            if len(short) >= 2:
                variations.add(short)

    return sorted(
        variations,
        key=len,
        reverse=True
    )


def find_cert(question):
    """
    사용자의 질문에 어떤 자격증이 포함되어 있는지 찾는다.
    FAQ에 실제 등록된 자격증을 기준으로 자동 동작한다.
    """

    expanded_question = expand_question(question).strip()

    certs = {
        faq.get("cert", "").strip()
        for faq in FAQ
        if faq.get("cert", "").strip()
    }

    matches = []

    for cert in certs:
        variations = make_cert_variations(cert)

        for variation in variations:
            if variation in expanded_question:
                matches.append(
                    (
                        len(variation),
                        cert,
                        variation,
                    )
                )

    if not matches:
        return None

    # 가장 구체적으로 일치한 자격증 우선
    matches.sort(
        key=lambda x: x[0],
        reverse=True
    )

    return matches[0][1]


def is_cert_only_question(question, cert):
    """
    사용자가 자격증 이름만 입력했는지 확인한다.

    예:
    굴착기
    지게차
    한식
    한식조리
    """

    expanded_question = expand_question(question).strip()

    variations = make_cert_variations(cert)

    return expanded_question in variations


# -------------------------
# FAQ 검색
# -------------------------

def retrieve(question, top_k=1, min_score=0.2):
    expanded_question = expand_question(question)

    # 먼저 자격증을 인식
    detected_cert = find_cert(expanded_question)

    # 자격증이 인식되면
    # 해당 자격증 FAQ 안에서만 검색
    if detected_cert:
        candidate_indices = [
            index
            for index, faq in enumerate(FAQ)
            if faq.get("cert", "").strip() == detected_cert
        ]

    else:
        candidate_indices = list(
            range(len(FAQ))
        )

    question_vector = VECTORIZER.transform(
        [expanded_question]
    )

    similarities = cosine_similarity(
        question_vector,
        FAQ_MATRIX
    )[0]

    ranked_indices = sorted(
        candidate_indices,
        key=lambda index: similarities[index],
        reverse=True,
    )

    results = []

    for index in ranked_indices:
        score = similarities[index]

        if score < min_score:
            continue

        results.append(
            (score, FAQ[index])
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

아래 FAQ 내용만 근거로 사용해서 사용자의 질문에 답해라.
FAQ에서 확인할 수 없는 내용은 추측하지 마라.
질문과 직접 관련된 FAQ를 우선해서 답변해라.
다른 자격증의 정보를 섞어서 답변하지 마라.
답변은 이해하기 쉽게 간결하게 작성해라.

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

    # 자격증 인식
    detected_cert = find_cert(question)

    # 자격증 이름만 입력한 경우
    if detected_cert and is_cert_only_question(
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

    # FAQ 검색
    results = retrieve(question)

    if not results:
        if detected_cert:
            return {
                "status": "NOT_FOUND",
                "answer": (
                    f"{detected_cert}에 대한 질문은 인식했지만, "
                    "해당 내용은 FAQ에서 확인할 수 없습니다."
                ),
                "source": "없음",
            }

        return {
            "status": "NOT_FOUND",
            "answer": (
                "해당 자격증에 대한 안내 정보를 찾지 못했습니다. "
                "지원하는 자격증의 시험 접수 관련 내용을 질문해주세요."
            ),
            "source": "없음",
        }

    # Gemini 답변 생성
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