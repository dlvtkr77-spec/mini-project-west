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

  let result = String(question || "").toLowerCase();

  for (const [from, to] of Object.entries(synonyms)) {
    result = result.replaceAll(from, to);
  }

  return result;
}


function isCertificationQuestion(question, faqs) {
  const normalized = normalizeQuestion(question);

  const certificationWords = [
    "자격증",
    "시험",
    "접수",
    "응시",
    "응시료",
    "합격",
    "시험장",
    "수험표",
    "환불",
    "취소",
    "준비물",
    "필기",
    "실기",
    "큐넷",
    "국시원"
  ];

  const hasCertificationWord = certificationWords.some(
    word => normalized.includes(word)
  );

  const hasCertificationName = faqs.some(faq => {
    const cert = String(faq.cert || "").toLowerCase();

    return cert && normalized.includes(cert);
  });

  return hasCertificationWord || hasCertificationName;
}


function retrieve(question, faqs, topK = 3) {
  const normalized = normalizeQuestion(question);

  const ranked = faqs.map(faq => {
    const cert = String(faq.cert || "").toLowerCase();
    const category = String(faq.category || "").toLowerCase();
    const title = String(faq.title || "").toLowerCase();
    const body = String(faq.body || "").toLowerCase();
    const reply = String(faq.reply || "").toLowerCase();

    let score = 0;

    if (cert && normalized.includes(cert)) {
      score += 10;
    }

    if (category && normalized.includes(category)) {
      score += 5;
    }

    const keywords = normalized
      .replace(/[?!.,"']/g, " ")
      .split(/\s+/)
      .filter(word => word.length >= 2);

    for (const keyword of keywords) {
      if (title.includes(keyword)) {
        score += 2;
      }

      if (body.includes(keyword)) {
        score += 1;
      }

      if (reply.includes(keyword)) {
        score += 1;
      }
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

    // 자격증 시험 접수와 관계없는 질문 차단
    if (!isCertificationQuestion(message.trim(), faqs)) {
      return res.status(200).json({
        status: "OUT_OF_SCOPE",
        answer: "자격증 시험 접수와 관련된 질문을 해주세요.",
        source: "없음"
      });
    }

    const results = retrieve(
      message.trim(),
      faqs
    );

    // 접수 관련 질문이지만 FAQ에서 근거를 찾지 못한 경우
    if (results.length === 0) {
      return res.status(200).json({
        status: "NOT_FOUND",
        answer:
          "해당 자격증에 대한 안내 정보를 찾지 못했습니다. 지원하는 자격증의 시험 접수 관련 내용을 질문해주세요.",
        source: "없음"
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

반드시 아래 FAQ 내용만 근거로 사용해서 답변하세요.
FAQ에 없는 내용은 추측하지 마세요.
사용자의 질문과 직접 관련된 내용만 답변하세요.
시니어 사용자도 이해하기 쉽게 간결하게 답변하세요.

사용자가 물어본 자격증과 다른 자격증의 정보는 답변하지 마세요.

FAQ에서 사용자의 질문에 대한 정보를 확인할 수 없다면
"해당 자격증에 대한 안내 정보를 찾지 못했습니다. 지원하는 자격증의 시험 접수 관련 내용을 질문해주세요."
라고만 답변하세요.

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
      console.error("Gemini API error:", data);

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
    console.error("Chat API error:", error);

    return res.status(500).json({
      error:
        "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
    });
  }
}