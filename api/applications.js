export default async function handler(req, res) {

  /* POST 요청만 허용 */
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }


  try {

    const SUPABASE_URL =
      process.env.SUPABASE_URL;

    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY;


    /* 환경변수 확인 */
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {

      return res.status(500).json({
        error: "Supabase 환경변수가 설정되지 않았습니다."
      });

    }


    const {
      name,
      phone,
      certificate,

      application_type,
      exam_type,
      exam_round,
      exam_stage,

      exam_region,
      exam_district,
      exam_center_code,
      exam_center_name,
      exam_date,
      exam_session,
      exam_start_time,

      eligibility_type,

      education_level,
      education_school,
      education_major,

      career_company,
      career_period_months,

      is_first_pass_holder,
      first_pass_year,
      first_pass_number,

      training_institution,
      training_completion_number,
      training_hours,
      test_center_name,
      test_time_slot,

      photo_url,

      fee_amount,
      fee_discount_type,
      fee_discount_amount,
      fee_final,

      payment_method

    } = req.body;


    /* 공통 필수값 확인 */
    if (!name || !phone || !certificate) {

      return res.status(400).json({
        error: "이름, 연락처, 자격증은 필수입니다."
      });

    }


    /* Supabase에 저장할 데이터 */
    const payload = {

      name,
      phone,
      certificate,

      application_channel: "온라인",

      application_type:
        application_type || null,

      exam_type:
        exam_type || null,

      exam_round:
        exam_round || null,

      exam_stage:
        exam_stage || null,

      exam_region:
        exam_region || null,

      exam_district:
        exam_district || null,

      exam_center_code:
        exam_center_code || null,

      exam_center_name:
        exam_center_name || null,

      exam_date:
        exam_date || null,

      exam_session:
        exam_session || null,

      exam_start_time:
        exam_start_time || null,

      eligibility_type:
        eligibility_type || null,

      education_level:
        education_level || null,

      education_school:
        education_school || null,

      education_major:
        education_major || null,

      career_company:
        career_company || null,

      career_period_months:
        career_period_months || null,

      is_first_pass_holder:
        is_first_pass_holder ?? null,

      first_pass_year:
        first_pass_year || null,

      first_pass_number:
        first_pass_number || null,

      training_institution:
        training_institution || null,

      training_completion_number:
        training_completion_number || null,

      training_hours:
        training_hours || null,

      test_center_name:
        test_center_name || null,

      test_time_slot:
        test_time_slot || null,

      photo_url:
        photo_url || null,

      fee_amount:
        fee_amount ?? null,

      fee_discount_type:
        fee_discount_type || "없음",

      fee_discount_amount:
        fee_discount_amount ?? 0,

      fee_final:
        fee_final ?? null,

      payment_method:
        payment_method || null,

      payment_status: "대기",

      status: "접수완료",

      updated_at:
        new Date().toISOString()

    };


    /* Supabase REST API 호출 */
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/applications`,
      {
        method: "POST",

        headers: {
          "apikey": SUPABASE_ANON_KEY,

          "Authorization":
            `Bearer ${SUPABASE_ANON_KEY}`,

          "Content-Type":
            "application/json",

          "Prefer":
            "return=minimal"
        },

        body: JSON.stringify(payload)
      }
    );


    const result =
      response.ok
    ? null
    : await response.json();

    /* Supabase 오류 */
    if (!response.ok) {

      console.error(
        "Supabase error:",
        result
      );

      return res.status(response.status).json({
        error: "Supabase 저장에 실패했습니다.",
        detail: result
      });

    }


    /* 성공 */
    return res.status(201).json({
  success: true,
  message: "접수가 완료되었습니다."
});


  } catch (error) {

    console.error(
      "Application API error:",
      error
    );


    return res.status(500).json({
      error: "접수 처리 중 오류가 발생했습니다."
    });

  }

}