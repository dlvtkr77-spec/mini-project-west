import fs from "fs";
import path from "path";


/* -------------------------
   FAQ 불러오기
------------------------- */

function loadFaqs() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "faq_combined.jsonl"
  );

  const text = fs.readFileSync(
    filePath,
    "utf-8"
  );

  return text
    .split("\n")
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}


/* -------------------------
   기본 문자열 정리
------------------------- */

function cleanText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}


/* -------------------------
   자격증 별칭
------------------------- */

const CERT_ALIASES = {
  "한식조리": [
    "한식",
    "한식조리",
    "한식조리기능사"
  ],

  "지게차": [
    "지게차",
    "지게차운전",
    "지게차운전기능사"
  ],

  "굴착기": [
    "굴착기",
    "굴착기운전",
    "굴착기운전기능사"
  ],

  "전기": [
    "전기",
    "전기기능사"
  ],

  "요양보호사": [
    "요양보호사"
  ],

  "공인중개사": [
    "공인중개사"
  ],

  "손해평가사": [
    "손해평가사"
  ]
};


/* -------------------------
   질문 표현 정규화
------------------------- */

function normalizeQuestion(question) {
  let result = cleanText(question);

  const synonyms = {
    "시험비용": "응시료",
    "시험비": "응시료",
    "접수비": "응시료",
    "시험수수료": "응시료",

    "합격점수": "합격기준",

    "시험장소": "시험장",

    "접수하는법": "접수방법",
    "접수하는방법": "접수방법",
    "접수어디서": "접수방법",
    "어디서접수": "접수방법",

    "취소": "환불"
  };

  for (const [from, to] of Object.entries(synonyms)) {
    result = result.replaceAll(from, to);
  }

  return result;
}


/* -------------------------
   자격증 찾기
------------------------- */

function findRequestedCert(question, faqs) {
  const normalized = cleanText(question);

  const matches = [];

  for (
    const [cert, aliases]
    of Object.entries(CERT_ALIASES)
  ) {
    for (const alias of aliases) {
      const normalizedAlias = cleanText(alias);

      if (
        normalized.includes(normalizedAlias)
      ) {
        matches.push({
          cert,
          length: normalizedAlias.length
        });
      }
    }
  }

  if (matches.length > 0) {
    matches.sort(
      (a, b) => b.length - a.length
    );

    return matches[0].cert;
  }

  /*
    별칭 목록에 없더라도
    FAQ의 cert 값을 직접 입력하면 인식
  */

  const certs = [
    ...new Set(
      faqs
        .map(faq =>
          String(faq.cert || "").trim()
        )
        .filter(Boolean)
    )
  ];

  const directMatch = certs
    .sort(
      (a, b) => b.length - a.length
    )
    .find(cert =>
      normalized.includes(
        cleanText(cert)
      )
    );

  return directMatch || null;
}


/* -------------------------
   자격증 이름만 입력했는지 확인
------------------------- */

function isCertOnlyQuestion(
  question,
  requestedCert
) {
  const normalized = cleanText(question);

  const aliases =
    CERT_ALIASES[requestedCert] ||
    [requestedCert];

  return aliases.some(
    alias =>
      cleanText(alias) === normalized
  );
}


/* -------------------------
   질문 유형 찾기
------------------------- */

function findRequestedCategory(
  question,
  faqs,
  requestedCert
) {
  const normalized =
    normalizeQuestion(question);

  /*
    먼저 사용자가 흔히 쓰는 표현을
    FAQ 분류와 연결
  */

  const categoryAliases = {
    "응시료": [
      "응시료",
      "시험비",
      "접수비",
      "수수료"
    ],

    "접수방법": [
      "접수방법",
      "접수",
      "원서접수",
      "어디서접수"
    ],

    "합격기준": [
      "합격기준",
      "합격점수",
      "몇점"
    ],

    "시험장": [
      "시험장",
      "시험장소",
      "시험위치"
    ],

    "수험표": [
      "수험표"
    ],

    "환불": [
      "환불",
      "취소"
    ],

    "시험방식": [
      "시험방식",
      "시험방법",
      "cbt",
      "컴퓨터시험"
    ],

    "시험과목": [
      "시험과목",
      "과목"
    ],

    "면제조건": [
      "면제조건",
      "면제"
    ],

    "신분증": [
      "신분증"
    ]
  };

  for (
    const [category, aliases]
    of Object.entries(categoryAliases)
  ) {
    const found = aliases.some(
      alias =>
        normalized.includes(
          cleanText(alias)
        )
    );

    if (found) {
      return category;
    }
  }

  /*
    위 목록에 없는 분류는
    실제 FAQ 데이터에서 확인
  */

  const categories = [
    ...new Set(
      faqs
        .filter(
          faq =>
            !requestedCert ||
            String(faq.cert || "").trim() ===
              requestedCert
        )
        .map(
          faq =>
            String(
              faq.category || ""
            ).trim()
        )
        .filter(Boolean)
    )
  ];

  return categories
    .sort(
      (a, b) => b.length - a.length
    )
    .find(
      category =>
        normalized.includes(
          cleanText(category)
        )
    ) || null;
}


/* -------------------------
   자격증 질문인지 확인
------------------------- */

function isCertificationQuestion(
  question,
  faqs
) {
  const normalized =
    normalizeQuestion(question);

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
    "준비물",
    "필기",
    "실기",
    "큐넷",
    "국시원"
  ];

  const hasCertificationWord =
    certificationWords.some(
      word =>
        normalized.includes(
          cleanText(word)
        )
    );

  const requestedCert =
    findRequestedCert(
      question,
      faqs
    );

  return (
    hasCertificationWord ||
    Boolean(requestedCert)
  );
}


/* -------------------------
   FAQ 검색
------------------------- */

function retrieve(
  question,
  faqs,
  topK = 3
) {
  const normalized =
    normalizeQuestion(question);

  const requestedCert =
    findRequestedCert(
      question,
      faqs
    );

  if (!requestedCert) {
    return [];
  }

  /*
    중요:
    인식한 자격증의 FAQ만 검색한다.
  */

  let candidates = faqs.filter(
    faq =>
      String(
        faq.cert || ""
      ).trim() === requestedCert
  );

  if (candidates.length === 0) {
    return [];
  }

  const requestedCategory =
    findRequestedCategory(
      question,
      faqs,
      requestedCert
    );

  /*
    해당 분류가 실제로 존재할 때만
    분류 필터 적용
  */

  if (requestedCategory) {
    const categoryMatches =
      candidates.filter(
        faq =>
          String(
            faq.category || ""
          ).trim() ===
          requestedCategory
      );

    if (
      categoryMatches.length > 0
    ) {
      candidates =
        categoryMatches;
    } else {
      /*
        사용자는 특정 내용을 물었지만
        해당 자격증에 그 FAQ가 없다.
      */

      return [];
    }
  }

  const keywords = normalized
    .replace(
      /[?!.,"']/g,
      " "
    )
    .split(/\s+/)
    .filter(
      word =>
        word.length >= 2
    );

  const ranked =
    candidates.map(faq => {
      const category =
        cleanText(
          faq.category
        );

      const title =
        normalizeQuestion(
          faq.title
        );

      const body =
        normalizeQuestion(
          faq.body
        );

      const reply =
        normalizeQuestion(
          faq.reply
        );

      let score = 10;

      if (
        requestedCategory &&
        category ===
          cleanText(
            requestedCategory
          )
      ) {
        score += 20;
      }

      for (
        const keyword of keywords
      ) {
        if (
          title.includes(keyword)
        ) {
          score += 3;
        }

        if (
          body.includes(keyword)
        ) {
          score += 2;
        }

        if (
          reply.includes(keyword)
        ) {
          score += 1;
        }
      }

      return {
        score,
        faq
      };
    });

  return ranked
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(
      0,
      topK
    );
}


/* -------------------------
   API
------------------------- */

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({
        error:
          "Method not allowed"
      });
  }

  const { message } =
    req.body;

  if (
    !message ||
    typeof message !==
      "string" ||
    message.trim() === ""
  ) {
    return res
      .status(400)
      .json({
        error:
          "메시지가 비어 있습니다."
      });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res
      .status(500)
      .json({
        error:
          "Gemini API Key가 설정되지 않았습니다."
      });
  }

  try {
    const faqs =
      loadFaqs();

    const question =
      message.trim();

    /*
      자격증 시험과 관계없는 질문
    */

    if (
      !isCertificationQuestion(
        question,
        faqs
      )
    ) {
      return res
        .status(200)
        .json({
          status:
            "OUT_OF_SCOPE",

          answer:
            "자격증 시험 접수와 관련된 질문을 해주세요.",

          source:
            "없음"
        });
    }

    /*
      자격증 인식
    */

    const requestedCert =
      findRequestedCert(
        question,
        faqs
      );

    if (!requestedCert) {
      return res
        .status(200)
        .json({
          status:
            "NOT_FOUND",

          answer:
            "해당 자격증에 대한 안내 정보를 찾지 못했습니다. 지원하는 자격증의 시험 접수 관련 내용을 질문해주세요.",

          source:
            "없음"
        });
    }

    /*
      자격증 이름만 입력한 경우
    */

    if (
      isCertOnlyQuestion(
        question,
        requestedCert
      )
    ) {
      return res
        .status(200)
        .json({
          status:
            "NEED_DETAIL",

          answer:
            `${requestedCert}에 대해 어떤 정보가 궁금하신가요? 시험비, 접수 방법, 시험장, 합격 기준 등 궁금한 내용을 질문해주세요.`,

          source:
            "없음"
        });
    }

    /*
      FAQ 검색
    */

    const results =
      retrieve(
        question,
        faqs
      );

    if (
      results.length === 0
    ) {
      return res
        .status(200)
        .json({
          status:
            "NOT_FOUND",

          answer:
            `${requestedCert}에 대한 질문은 인식했지만, 해당 내용은 FAQ에서 확인할 수 없습니다.`,

          source:
            "없음"
        });
    }

    /*
      Gemini에 전달할 FAQ
    */

    const context =
      results
        .map(
          (
            { faq },
            index
          ) => {
            return `
[FAQ ${index + 1}]
자격증: ${faq.cert || ""}
분류: ${faq.category || ""}
제목: ${faq.title || ""}
질문: ${faq.body || ""}
답변: ${faq.reply || ""}
            `.trim();
          }
        )
        .join(
          "\n\n"
        );

    const prompt = `
당신은 자격증 시험 접수 안내 챗봇입니다.

반드시 아래 FAQ 내용만 근거로 답변하세요.

규칙:
1. FAQ에 있는 내용만 답변하세요.
2. 다른 자격증의 정보를 절대 섞지 마세요.
3. FAQ에 없는 정보는 추측하지 마세요.
4. FAQ의 답변 내용을 우선 사용하세요.
5. 시니어 사용자도 이해하기 쉽게 짧고 명확하게 답변하세요.
6. FAQ에 없는 약속이나 추가 정보를 만들지 마세요.

[FAQ]
${context}

[사용자 질문]
${question}
    `.trim();

    /*
      Gemini 호출
    */

    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              contents: [
                {
                  role:
                    "user",

                  parts: [
                    {
                      text:
                        prompt
                    }
                  ]
                }
              ]
            })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        data
      );

      return res
        .status(
          response.status
        )
        .json({
          error:
            "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
        });
    }

    const answer =
      data
        .candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.text ||
      "답변을 불러오지 못했습니다.";

    const source =
      results
        .map(
          item =>
            item.faq.title
        )
        .filter(Boolean)
        .join(", ");

    return res
      .status(200)
      .json({
        status:
          "FOUND",

        answer,

        source:
          source || "없음"
      });

  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
      });
  }
}