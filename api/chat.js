export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message } = req.body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "메시지가 비어 있습니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API Key가 설정되지 않았습니다."
    });
  }

  const systemInstruction = `
당신은 자격증 시험 간편접수 웹사이트의 친절한 자격증 접수 도우미 챗봇입니다.
시니어 사용자도 쉽게 이해할 수 있도록 친절하고 명확하게 답변해주세요.

[지원 자격증 목록]
- 한식조리기능사
- 지게차운전기능사
- 굴착기운전기능사
- 전기기능사
- 손해평가사
- 공인중개사
- 요양보호사
- 위생사

[답변 범위 및 규칙]
- 자격증 시험 접수 방법, 응시료, 시험 일정, 시험 장소, 응시 자격, 시험 준비물, 접수 변경 및 취소, 수수료 감면, 사이트 이용 방법 등 자격증 시험 접수와 관련된 질문에만 답변합니다.
- 자격증 시험 접수와 관련 없는 질문에는 임의로 답변하지 말고 정확히 다음 문장으로만 안내하세요:
"자격증 시험 접수와 관련된 질문을 해주세요."
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: systemInstruction },
                { text: message.trim() }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        error: "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
      });
    }

    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({
      error: "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
    });
  }
}
