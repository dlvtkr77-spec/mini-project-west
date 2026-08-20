import gradio as gr

from rag import answer_question


EXAMPLES = [
    "한식조리기능사 시험비가 얼마예요?",
    "지게차 접수는 어디서 해요?",
    "굴착기운전기능사 시험은 어떻게 봐요?",
    "요양보호사 합격 기준이 뭐예요?",
    "공인중개사 시험비가 얼마예요?",
]


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


demo = gr.ChatInterface(
    fn=chat,
    title="자격증 접수 안내 챗봇",
    description="자격증 시험 접수와 관련된 내용을 질문해보세요.",
    examples=EXAMPLES,
)


if __name__ == "__main__":
    demo.launch(share=True)