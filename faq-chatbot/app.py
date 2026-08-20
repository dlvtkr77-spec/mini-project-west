import json
from pathlib import Path

import gradio as gr

from rag import (
    answer_question,
    add_faq_entry,
    delete_faq_entry,
    get_faq_list,
)


ROOT = Path(__file__).parent
SYNONYMS_PATH = ROOT / "synonyms.json"


# -------------------------
# 챗봇
# -------------------------

def chat(message, history):
    result = answer_question(message)

    status = result["status"]
    answer = result["answer"]
    source = result["source"]

    if status == "FOUND":
        return f"[FOUND]\n{answer}\n\n출처: {source}"

    if status == "NOT_FOUND":
        return f"[NOT_FOUND]\n{answer}"

    return f"[ERROR]\n{answer}"


# -------------------------
# FAQ 관리
# -------------------------

def faq_list():
    faqs = get_faq_list()

    lines = []

    for faq in faqs:
        lines.append(
            f"ID: {faq.get('id', '')}\n"
            f"자격증: {faq.get('cert', '')}\n"
            f"분류: {faq.get('category', '')}\n"
            f"제목: {faq.get('title', '')}\n"
            f"질문: {faq.get('body', '')}\n"
            f"답변: {faq.get('reply', '')}"
        )

    return "\n\n".join(lines)


def add_faq(cert, title, answer, keywords):
    if not title.strip() or not answer.strip():
        return "제목과 내용을 입력하세요", faq_list()

    new_faq = add_faq_entry(
        cert,
        title,
        answer,
        keywords,
    )

    return (
        f"추가 완료 (ID: {new_faq['id']})",
        faq_list(),
    )


def delete_faq(faq_id):
    faq_id = faq_id.strip()

    if not faq_id:
        return "삭제할 FAQ ID를 입력하세요", faq_list()

    success = delete_faq_entry(faq_id)

    if not success:
        return "해당 ID의 FAQ가 없습니다", faq_list()

    return "삭제 완료", faq_list()


# -------------------------
# 동의어 관리
# -------------------------

def load_synonyms():
    if not SYNONYMS_PATH.exists():
        return {}

    return json.loads(
        SYNONYMS_PATH.read_text(encoding="utf-8")
    )


def save_synonyms(synonyms):
    SYNONYMS_PATH.write_text(
        json.dumps(
            synonyms,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def synonym_list():
    synonyms = load_synonyms()

    if not synonyms:
        return "등록된 동의어가 없습니다."

    return "\n".join(
        f"{short} -> {full}"
        for short, full in synonyms.items()
    )


def add_synonym(short, full):
    short = short.strip()
    full = full.strip()

    if not short or not full:
        return (
            "줄임말과 정식 명칭 모두 입력하세요",
            synonym_list(),
        )

    synonyms = load_synonyms()

    synonyms[short] = full

    save_synonyms(synonyms)

    return "추가 완료", synonym_list()


def delete_synonym(short):
    short = short.strip()

    synonyms = load_synonyms()

    if short not in synonyms:
        return (
            "등록되지 않은 동의어입니다",
            synonym_list(),
        )

    del synonyms[short]

    save_synonyms(synonyms)

    return "삭제 완료", synonym_list()


# -------------------------
# Gradio UI
# -------------------------

with gr.Blocks(
    title="자격증 접수 안내 챗봇"
) as demo:

    gr.Markdown("# 자격증 접수 안내 챗봇")

    # 챗봇 탭
    with gr.Tab("챗봇"):

        gr.ChatInterface(
            fn=chat,
            examples=[
                "한식조리기능사 시험비가 얼마예요?",
                "굴착기 접수비",
                "요양보호사 합격 기준",
                "지게차 접수는 어디서 해요?",
            ],
        )

    # FAQ 관리 탭
    with gr.Tab("FAQ 관리"):

        faq_cert = gr.Textbox(
            label="자격증"
        )

        faq_title = gr.Textbox(
            label="제목"
        )

        faq_answer = gr.Textbox(
            label="답변"
        )

        faq_keywords = gr.Textbox(
            label="분류 / 키워드",
            placeholder="예: 응시료",
        )

        add_faq_button = gr.Button(
            "FAQ 추가"
        )

        faq_id = gr.Textbox(
            label="삭제할 FAQ ID"
        )

        delete_faq_button = gr.Button(
            "FAQ 삭제"
        )

        refresh_faq_button = gr.Button(
            "목록 새로고침"
        )

        faq_message = gr.Textbox(
            label="처리 결과"
        )

        faq_output = gr.Textbox(
            value=faq_list(),
            label="FAQ 목록",
            lines=20,
        )

        add_faq_button.click(
            fn=add_faq,
            inputs=[
                faq_cert,
                faq_title,
                faq_answer,
                faq_keywords,
            ],
            outputs=[
                faq_message,
                faq_output,
            ],
        )

        delete_faq_button.click(
            fn=delete_faq,
            inputs=faq_id,
            outputs=[
                faq_message,
                faq_output,
            ],
        )

        refresh_faq_button.click(
            fn=faq_list,
            outputs=faq_output,
        )

    # 동의어 관리 탭
    with gr.Tab("동의어 관리"):

        synonym_short = gr.Textbox(
            label="줄임말"
        )

        synonym_full = gr.Textbox(
            label="정식 명칭"
        )

        add_synonym_button = gr.Button(
            "동의어 추가"
        )

        delete_synonym_button = gr.Button(
            "동의어 삭제"
        )

        synonym_message = gr.Textbox(
            label="처리 결과"
        )

        synonym_output = gr.Textbox(
            value=synonym_list(),
            label="동의어 목록",
            lines=15,
        )

        add_synonym_button.click(
            fn=add_synonym,
            inputs=[
                synonym_short,
                synonym_full,
            ],
            outputs=[
                synonym_message,
                synonym_output,
            ],
        )

        delete_synonym_button.click(
            fn=delete_synonym,
            inputs=synonym_short,
            outputs=[
                synonym_message,
                synonym_output,
            ],
        )


if __name__ == "__main__":
    demo.launch(share=True)