import fs from "fs";
import path from "path";

function loadFaqs() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "faq_combined.jsonl"
  );

  const text = fs.readFileSync(filePath, "utf-8");

  return text
    .split("\n")
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function normalizeQuestion(question) {
  const synonyms = {
    "한식조리기능사": "한식조리",
    "지게차운전기능사": "지게차",
    "굴착기운전기능사": "굴착기",
    "전기기능사": "전기",

    "시험비": "응시료",
    "시험 비용": "응시료",
    "시험비용": "응시료",
    "접수비": "응시료",
    "수수료": "응시료",

    "합격점수": "합격기준",
    "합격 점수": "합격기준",

    "시험장소": "시험장",
    "시험 장소": "시험장"
  };

  let result = question;

  for (const [from, to] of Object.entries(synonyms)) {
    result = result.replaceAll(from, to);
  }

  return result;
}
function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .match(/[가-힣a-z0-9]+/g) || [];
}

function retrieve(question, faqs, topK = 3) {
  const normalized = normalizeQuestion(question);
  const questionTokens = new Set(tokenize(normalized));

  const ranked = faqs.map(faq => {
    const cert = String(faq.cert || "");
    const category = String(faq.category || "");

    const document = [
      cert,
      category,
      faq.title,
      faq.body,
      faq.reply
    ].join(" ");

    const documentTokens = new Set(tokenize(document));

    let overlap = 0;

    for (const token of questionTokens) {
      if (documentTokens.has(token)) {
        overlap += 1;
      }
    }

    let score = overlap;

    if (
      cert &&
      normalized.toLowerCase().includes(cert.toLowerCase())
    ) {
      score += 5;
    }

    if (
      category &&
      normalized.toLowerCase().includes(category.toLowerCase())
    ) {
      score += 2;
    }

    return {
      score,
      faq
    };
  });

  return ranked
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { message } = req.body;

  if (
    !message ||
    typeof message !== "string" ||
    message.trim() === ""
  ) {
    return res.status(400).json({
      error: "메시지가 비어 있습니다."
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API Key가 설정되지 않았습니다."
    });
  }

  try {
    const faqs = loadFaqs();

    const results = retrieve(
      message.trim(),
      faqs
    );

    if (results.length === 0) {
      return res.status(200).json({
        answer:
          "FAQ에서 확인할 수 없는 내용입니다.",
        source: "없음",
        status: "NOT_FOUND"
      });
    }

    const context = results
      .map(({ faq }, index) => {
        return `
[FAQ ${index + 1}]
자격증: ${faq.cert || ""}
분류: ${faq.category || ""}
제목: ${faq.title || ""}
질문: ${faq.body || ""}
답변: ${faq.reply || ""}
        `.trim();
      })
      .join("\n\n");

    const prompt = `
당신은 자격증 시험 접수 안내 챗봇입니다.

반드시 아래 FAQ 내용만 근거로 답변하세요.
FAQ에 없는 내용은 추측하지 마세요.
사용자의 질문과 직접 관련된 내용만 답변하세요.
시니어 사용자도 이해하기 쉽게 간결하게 답변하세요.

FAQ에서 질문에 대한 정보를 확인할 수 없다면
"FAQ에서 확인할 수 없는 내용입니다."
라고 답변하세요.

[FAQ]
${context}

[사용자 질문]
${message.trim()}
    `.trim();

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
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      return res.status(response.status).json({
        error:
          "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
      });
    }

    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "답변을 불러오지 못했습니다.";

    const source = results
      .map(item => item.faq.title)
      .filter(Boolean)
      .join(", ");

    return res.status(200).json({
      status: "FOUND",
      answer,
      source
    });

  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return res.status(500).json({
      error:
        "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
    });
  }
}