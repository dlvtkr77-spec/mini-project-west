export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, certificate } = req.body;

  if (!name || !phone || !certificate) {
    return res.status(400).json({
      error: "필수 입력값이 누락되었습니다."
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      error: "Supabase 환경변수가 설정되지 않았습니다."
    });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/applications`,
      {
        method: "POST",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          name,
          phone,
          certificate,
          application_channel: "온라인"
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Supabase error:", errorText);

      return res.status(response.status).json({
        error: "접수 정보를 저장하지 못했습니다."
      });
    }

    return res.status(200).json({
      success: true,
      message: "접수가 완료되었습니다."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "서버 오류가 발생했습니다."
    });
  }
}