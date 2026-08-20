/* =========================
   기본 요소
========================= */

const applyButtons =
  document.querySelectorAll(".apply-button");

const selectedCertificateInput =
  document.getElementById("selected-certificate");

const selectedCertificateName =
  document.getElementById("selected-certificate-name");

const selectedExamType =
  document.getElementById("selected-exam-type");

const applicationForm =
  document.getElementById("application-form");

const nationalForm =
  document.getElementById("national-form");

const professionalForm =
  document.getElementById("professional-form");

const healthForm =
  document.getElementById("health-form");

const commonFields =
  document.getElementById("common-fields");

const originalFee =
  document.getElementById("original-fee");

const finalFee =
  document.getElementById("final-fee");

const discountType =
  document.getElementById("discount-type");

const professionalStage =
  document.getElementById("professional-stage");

const professionalSession =
  document.getElementById("professional-session");

const completeModal =
  document.getElementById("complete-modal");

const completeCertificate =
  document.getElementById("complete-certificate");

const closeModal =
  document.getElementById("close-modal");


/* =========================
   자격증 정보
========================= */

const certificateData = {

  "한식조리기능사": {
    type: "national",
    typeName: "국가기술자격",
    examType: "상시 CBT",
    fee: 14500
  },

  "지게차운전기능사": {
    type: "national",
    typeName: "국가기술자격",
    examType: "상시 CBT",
    fee: 14500
  },

  "굴착기운전기능사": {
    type: "national",
    typeName: "국가기술자격",
    examType: "상시 CBT",
    fee: 14500
  },

  "전기기능사": {
    type: "national",
    typeName: "국가기술자격",
    examType: "정기",
    fee: 14500
  },

  "손해평가사": {
    type: "professional",
    typeName: "전문자격",
    fee1: 30000,
    fee2: 30000
  },

  "공인중개사": {
    type: "professional",
    typeName: "전문자격",
    fee1: 13400,
    fee2: 15200
  },

  "요양보호사": {
    type: "health",
    typeName: "보건자격",
    fee: 32000
  },

  "위생사": {
    type: "health",
    typeName: "보건자격",
    fee: 30000
  }

};


/* =========================
   Form 숨기기
========================= */

function hideAllForms() {

  nationalForm.hidden = true;
  professionalForm.hidden = true;
  healthForm.hidden = true;

}


/* =========================
   가격 표시
========================= */

function formatPrice(price) {

  return price.toLocaleString("ko-KR") + "원";

}


/* =========================
   감면 선택값
========================= */

function updateDiscountOptions(type) {

  if (type === "health") {

    discountType.innerHTML = `
      <option value="없음">없음</option>
      <option value="장애인">장애인</option>
      <option value="기초수급">기초수급</option>
      <option value="국가유공자">국가유공자</option>
      <option value="차상위계층">차상위계층</option>
    `;

  } else {

    discountType.innerHTML = `
      <option value="없음">없음</option>
      <option value="장애인">장애인</option>
      <option value="기초생활수급자">기초생활수급자</option>
      <option value="국가유공자">국가유공자</option>
      <option value="차상위계층">차상위계층</option>
    `;

  }

}


/* =========================
   기본 수수료 구하기
========================= */

function getBaseFee() {

  const certificate =
    selectedCertificateInput.value;

  const info =
    certificateData[certificate];

  if (!info) {
    return 0;
  }


  if (info.type === "professional") {

    if (professionalStage.value === "2차") {
      return info.fee2;
    }

    return info.fee1;

  }


  return info.fee;

}


/* =========================
   최종 수수료 계산
========================= */

function getFinalFee() {

  const certificate =
    selectedCertificateInput.value;

  const info =
    certificateData[certificate];

  const fee =
    getBaseFee();

  if (!info) {

    return {
      fee: 0,
      discountAmount: 0,
      finalPrice: 0
    };

  }


  const discount =
    discountType.value;

  let finalPrice = fee;


  /* 보건자격 기초수급 전액 면제 */

  if (
    info.type === "health" &&
    discount === "기초수급"
  ) {

    finalPrice = 0;

  }

  /* 그 외 감면 대상 50% */

  else if (discount !== "없음") {

    finalPrice =
      Math.round(fee * 0.5);

  }


  return {

    fee,

    discountAmount:
      fee - finalPrice,

    finalPrice

  };

}


/* =========================
   화면 수수료 업데이트
========================= */

function updateFee() {

  const {
    fee,
    finalPrice
  } = getFinalFee();


  originalFee.textContent =
    formatPrice(fee);

  finalFee.textContent =
    formatPrice(finalPrice);

}


/* =========================
   국가기술 Form
========================= */

function showNationalForm(
  certificate,
  info
) {

  nationalForm.hidden = false;


  const nationalExamType =
    document.getElementById(
      "national-exam-type"
    );

  const examRoundGroup =
    document.getElementById(
      "exam-round-group"
    );

  const nationalSession =
    document.getElementById(
      "national-session"
    );


  nationalExamType.textContent =
    info.examType;


  /* 전기기능사만 회차 선택 */

  examRoundGroup.hidden =
    certificate !== "전기기능사";


  /* 상시 CBT */

  if (info.examType === "상시 CBT") {

    nationalSession.innerHTML = `
      <option value="">
        시험시간을 선택해주세요
      </option>

      <option value="오전1">
        오전1 · 09:00
      </option>

      <option value="오전2">
        오전2 · 10:30
      </option>

      <option value="오후1">
        오후1 · 13:00
      </option>

      <option value="오후2">
        오후2 · 14:30
      </option>

      <option value="오후3">
        오후3 · 16:00
      </option>
    `;

  }

  /* 정기 */

  else {

    nationalSession.innerHTML = `
      <option value="">
        교시를 선택해주세요
      </option>

      <option value="1교시">
        1교시 · 09:30
      </option>

      <option value="2교시">
        2교시 · 11:00
      </option>

      <option value="3교시">
        3교시 · 13:30
      </option>

      <option value="4교시">
        4교시 · 15:00
      </option>

      <option value="5교시">
        5교시 · 16:30
      </option>
    `;

  }

}


/* =========================
   전문자격 Form
========================= */

function showProfessionalForm() {

  professionalForm.hidden = false;

  professionalStage.value = "";


  document.getElementById(
    "first-pass-fields"
  ).hidden = true;


  document.getElementById(
    "professional-subjects"
  ).textContent =
    "시험 차수를 선택하면 시험과목이 표시됩니다.";


  professionalSession.disabled = true;

  professionalSession.innerHTML = `
    <option value="">
      시험 차수를 먼저 선택해주세요
    </option>
  `;

}


/* =========================
   보건자격 Form
========================= */

function showHealthForm() {

  healthForm.hidden = false;

}


/* =========================
   자격증 선택
========================= */

applyButtons.forEach((button) => {

  button.addEventListener(
    "click",
    () => {

      const certificate =
        button.dataset.certificate;

      const info =
        certificateData[certificate];


      if (!info) {

        alert(
          "자격증 정보를 확인할 수 없습니다."
        );

        return;

      }


      selectedCertificateInput.value =
        certificate;

      selectedCertificateName.textContent =
        certificate;

      selectedExamType.textContent =
        info.typeName;


      hideAllForms();

      updateDiscountOptions(
        info.type
      );


      if (info.type === "national") {

        showNationalForm(
          certificate,
          info
        );

      }


      if (info.type === "professional") {

        showProfessionalForm();

      }


      if (info.type === "health") {

        showHealthForm();

      }


      commonFields.hidden = false;

      updateFee();


      document
        .getElementById("application")
        .scrollIntoView({
          behavior: "smooth"
        });

    }
  );

});


/* =========================
   전문자격 차수
========================= */

professionalStage.addEventListener(
  "change",
  () => {

    const certificate =
      selectedCertificateInput.value;

    const stage =
      professionalStage.value;

    const firstPassFields =
      document.getElementById(
        "first-pass-fields"
      );

    const subjects =
      document.getElementById(
        "professional-subjects"
      );


    firstPassFields.hidden =
      stage !== "2차";


    if (!stage) {

      subjects.textContent =
        "시험 차수를 선택하면 시험과목이 표시됩니다.";

      professionalSession.disabled =
        true;

      professionalSession.innerHTML = `
        <option value="">
          시험 차수를 먼저 선택해주세요
        </option>
      `;

      updateFee();

      return;

    }


    /* 공인중개사 */

    if (certificate === "공인중개사") {

      if (stage === "1차") {

        subjects.innerHTML = `
          · 부동산학개론<br>
          · 민법 및 민사특별법
        `;

      } else {

        subjects.innerHTML = `
          · 공인중개사법령 및 중개실무<br>
          · 부동산공법<br>
          · 부동산공시법 및 부동산세법
        `;

      }

    }


    /* 손해평가사 */

    if (certificate === "손해평가사") {

      if (stage === "1차") {

        subjects.innerHTML = `
          · 상법 보험편<br>
          · 농어업재해보험법령
        `;

      } else {

        subjects.innerHTML = `
          · 농작물재해보험 및 가축재해보험의 이론과 실무<br>
          · 농작물재해보험 및 가축재해보험 손해평가의 이론과 실무
        `;

      }

    }


    /* 시험시간 */

    professionalSession.disabled =
      false;


    if (stage === "1차") {

      professionalSession.innerHTML = `
        <option value="">
          시험시간을 선택해주세요
        </option>

        <option value="1교시">
          1교시 · 09:30
        </option>

        <option value="2교시">
          2교시 · 11:30
        </option>
      `;

    }


    if (stage === "2차") {

      professionalSession.innerHTML = `
        <option value="">
          시험시간을 선택해주세요
        </option>

        <option value="1교시">
          1교시 · 13:30
        </option>

        <option value="2교시">
          2교시 · 15:30
        </option>
      `;

    }


    updateFee();

  }
);

/* =========================
   시험장 / 시험일 연결
========================= */


/* 국가기술자격 */

const nationalRegion =
  document.getElementById(
    "national-region"
  );

const nationalCenter =
  document.getElementById(
    "national-center"
  );

const nationalDate =
  document.getElementById(
    "national-date"
  );


nationalRegion.addEventListener(
  "change",
  () => {

    const region =
      nationalRegion.value;


    /* 지역을 다시 비운 경우 */

    if (!region) {

      nationalCenter.disabled = true;

      nationalCenter.innerHTML = `
        <option value="">
          시험지역을 먼저 선택해주세요
        </option>
      `;


      nationalDate.disabled = true;

      nationalDate.innerHTML = `
        <option value="">
          시험장을 먼저 선택해주세요
        </option>
      `;

      return;

    }


    /* 시험장 활성화 */

    nationalCenter.disabled = false;

    nationalCenter.innerHTML = `
      <option value="">
        시험장을 선택해주세요
      </option>

      <option value="${region} 시험장">
        ${region} 시험장
      </option>
    `;


    /* 시험일은 다시 초기화 */

    nationalDate.disabled = true;

    nationalDate.innerHTML = `
      <option value="">
        시험장을 먼저 선택해주세요
      </option>
    `;

  }
);


nationalCenter.addEventListener(
  "change",
  () => {

    if (!nationalCenter.value) {

      nationalDate.disabled = true;

      nationalDate.innerHTML = `
        <option value="">
          시험장을 먼저 선택해주세요
        </option>
      `;

      return;

    }


    nationalDate.disabled = false;

    nationalDate.innerHTML = `
      <option value="">
        시험일을 선택해주세요
      </option>

      <option value="2026-08-24">
        2026년 8월 24일
      </option>

      <option value="2026-08-25">
        2026년 8월 25일
      </option>

      <option value="2026-08-26">
        2026년 8월 26일
      </option>
    `;

  }
);



/* =========================
   전문자격 시험장 / 시험일
========================= */

const professionalRegion =
  document.getElementById(
    "professional-region"
  );

const professionalCenter =
  document.getElementById(
    "professional-center"
  );

const professionalDate =
  document.getElementById(
    "professional-date"
  );


professionalRegion.addEventListener(
  "change",
  () => {

    const region =
      professionalRegion.value;


    if (!region) {

      professionalCenter.disabled =
        true;

      professionalCenter.innerHTML = `
        <option value="">
          시험지역을 먼저 선택해주세요
        </option>
      `;


      professionalDate.disabled =
        true;

      professionalDate.innerHTML = `
        <option value="">
          시험장을 먼저 선택해주세요
        </option>
      `;

      return;

    }


    professionalCenter.disabled =
      false;

    professionalCenter.innerHTML = `
      <option value="">
        시험장을 선택해주세요
      </option>

      <option value="${region} 시험장">
        ${region} 시험장
      </option>
    `;


    professionalDate.disabled =
      true;

    professionalDate.innerHTML = `
      <option value="">
        시험장을 먼저 선택해주세요
      </option>
    `;

  }
);


professionalCenter.addEventListener(
  "change",
  () => {

    if (!professionalCenter.value) {

      professionalDate.disabled =
        true;

      professionalDate.innerHTML = `
        <option value="">
          시험장을 먼저 선택해주세요
        </option>
      `;

      return;

    }


    professionalDate.disabled =
      false;

    professionalDate.innerHTML = `
      <option value="">
        시험일을 선택해주세요
      </option>

      <option value="2026-08-24">
        2026년 8월 24일
      </option>

      <option value="2026-08-25">
        2026년 8월 25일
      </option>

      <option value="2026-08-26">
        2026년 8월 26일
      </option>
    `;

  }
);

/* =========================
   감면 변경
========================= */

discountType.addEventListener(
  "change",
  updateFee
);


/* =========================
   검색
========================= */

const searchInput =
  document.getElementById(
    "certificate-search"
  );

const searchButton =
  document.getElementById(
    "search-button"
  );

const certificateCards =
  document.querySelectorAll(
    ".certificate-card"
  );

const noResult =
  document.getElementById(
    "no-result"
  );


function searchCertificate() {

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();

  let visibleCount = 0;


  certificateCards.forEach(
    (card) => {

      const name =
        card.dataset.name
          .toLowerCase();


      if (name.includes(keyword)) {

        card.style.display =
          "flex";

        visibleCount++;

      } else {

        card.style.display =
          "none";

      }

    }
  );


  noResult.style.display =
    visibleCount === 0
      ? "block"
      : "none";

}


searchButton.addEventListener(
  "click",
  searchCertificate
);


searchInput.addEventListener(
  "keydown",
  (event) => {

    if (event.key === "Enter") {

      event.preventDefault();

      searchCertificate();

    }

  }
);


/* =========================
   접수 안내 버튼
========================= */

document
  .querySelectorAll(".info-button")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        searchInput.value =
          button.dataset.search;

        searchCertificate();


        document
          .getElementById(
            "certificates"
          )
          .scrollIntoView({
            behavior: "smooth"
          });

      }
    );

  });


/* =========================
   실제 접수 제출
========================= */

applicationForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const certificate =
      selectedCertificateInput.value;

    const info =
      certificateData[certificate];


    if (!certificate || !info) {

      alert(
        "신청할 자격증을 먼저 선택해주세요."
      );

      return;

    }


    /* =========================
       신청자 정보
    ========================= */

    const name =
      document
        .getElementById("name")
        .value
        .trim();

    const phone =
      document
        .getElementById("phone")
        .value
        .trim();

    const paymentMethod =
      document
        .getElementById(
          "payment-method"
        )
        .value;


    if (!name) {

      alert(
        "이름을 입력해주세요."
      );

      return;

    }


    if (!phone) {

      alert(
        "휴대전화 번호를 입력해주세요."
      );

      return;

    }


    if (!paymentMethod) {

      alert(
        "결제수단을 선택해주세요."
      );

      return;

    }


    /* =========================
       공통 payload
    ========================= */

    const {
      fee,
      discountAmount,
      finalPrice
    } = getFinalFee();


    const payload = {

      name,
      phone,
      certificate,

      application_type:
        info.type,

      exam_type:
        info.examType || null,

      fee_amount:
        fee,

      fee_discount_type:
        discountType.value,

      fee_discount_amount:
        discountAmount,

      fee_final:
        finalPrice,

      payment_method:
        paymentMethod

    };


    /* =========================
       국가기술자격
    ========================= */

    if (info.type === "national") {

      const examRound =
        document.getElementById(
          "exam-round"
        ).value;

      const region =
        document.getElementById(
          "national-region"
        ).value;

      const center =
        document.getElementById(
          "national-center"
        ).value;

      const examDate =
        document.getElementById(
          "national-date"
        ).value;

      const session =
        document.getElementById(
          "national-session"
        ).value;

      const eligibility =
        document.getElementById(
          "national-eligibility"
        ).value;


      if (
        certificate ===
          "전기기능사" &&
        !examRound
      ) {

        alert(
          "시험 회차를 선택해주세요."
        );

        return;

      }


      if (!region) {

        alert(
          "시험지역을 선택해주세요."
        );

        return;

      }


      if (!session) {

        alert(
          "시험시간을 선택해주세요."
        );

        return;

      }


      if (!eligibility) {

        alert(
          "응시자격유형을 선택해주세요."
        );

        return;

      }


      payload.exam_round =
        examRound
          ? Number(examRound)
          : null;

      payload.exam_region =
        region;

      payload.exam_center_name =
        center || null;

      payload.exam_date =
        examDate || null;

      payload.exam_session =
        session;

      payload.eligibility_type =
        eligibility;

    }


    /* =========================
       전문자격
    ========================= */

    if (info.type === "professional") {

      const stage =
        professionalStage.value;

      const region =
        document.getElementById(
          "professional-region"
        ).value;

      const center =
        document.getElementById(
          "professional-center"
        ).value;

      const examDate =
        document.getElementById(
          "professional-date"
        ).value;

      const session =
        professionalSession.value;


      if (!stage) {

        alert(
          "시험 차수를 선택해주세요."
        );

        return;

      }


      if (!region) {

        alert(
          "시험지역을 선택해주세요."
        );

        return;

      }


      if (!session) {

        alert(
          "시험시간을 선택해주세요."
        );

        return;

      }


      payload.exam_stage =
        stage;

      payload.exam_region =
        region;

      payload.exam_center_name =
        center || null;

      payload.exam_date =
        examDate || null;

      payload.exam_session =
        session;


      /* 2차 합격정보 */

      if (stage === "2차") {

        const firstPassHolder =
          document.getElementById(
            "first-pass-holder"
          ).checked;

        const firstPassYear =
          document.getElementById(
            "first-pass-year"
          ).value;

        const firstPassNumber =
          document.getElementById(
            "first-pass-number"
          ).value.trim();


        if (!firstPassHolder) {

          alert(
            "1차 시험 합격 여부를 확인해주세요."
          );

          return;

        }


        payload.is_first_pass_holder =
          firstPassHolder;

        payload.first_pass_year =
          firstPassYear
            ? Number(firstPassYear)
            : null;

        payload.first_pass_number =
          firstPassNumber || null;

      }

    }


    /* =========================
       보건자격
    ========================= */

    if (info.type === "health") {

      const realNameMethod =
        document.getElementById(
          "real-name-method"
        ).value;

      const trainingInstitution =
        document.getElementById(
          "training-institution"
        ).value.trim();

      const trainingNumber =
        document.getElementById(
          "training-completion-number"
        ).value.trim();

      const trainingHours =
        document.getElementById(
          "training-hours"
        ).value;

      const center =
        document.getElementById(
          "health-center"
        ).value;

      const timeSlot =
        document.getElementById(
          "health-time-slot"
        ).value;


      if (!realNameMethod) {

        alert(
          "실명인증 방식을 선택해주세요."
        );

        return;

      }


      if (!trainingInstitution) {

        alert(
          "교육기관을 입력해주세요."
        );

        return;

      }


      if (!trainingNumber) {

        alert(
          "교육수료번호를 입력해주세요."
        );

        return;

      }


      if (!center) {

        alert(
          "시험센터를 선택해주세요."
        );

        return;

      }


      if (!timeSlot) {

        alert(
          "시험시간을 선택해주세요."
        );

        return;

      }


      payload.training_institution =
        trainingInstitution;

      payload.training_completion_number =
        trainingNumber;

      payload.training_hours =
        trainingHours
          ? Number(trainingHours)
          : null;

      payload.test_center_name =
        center;

      payload.test_time_slot =
        timeSlot;

    }


    /* =========================
       API 전송
    ========================= */

    const submitButton =
      applicationForm.querySelector(
        ".submit-button"
      );


    submitButton.disabled = true;

    submitButton.textContent =
      "접수 중입니다...";


    try {

      const response =
        await fetch(
          "/api/applications",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(payload)
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        console.error(
          "접수 실패:",
          data
        );

        throw new Error(
          data.error ||
          "접수에 실패했습니다."
        );

      }


/* =========================
   성공 팝업
========================= */

completeCertificate.textContent =
  certificate;

completeModal.classList.add(
  "show"
);


/* =========================
   접수 정보 초기화
========================= */

applicationForm.reset();

document
  .querySelectorAll(
    ".certificate-card"
  )
  .forEach(card => {
    card.classList.remove(
      "selected"
    );
  });


console.log(
  "저장된 접수 데이터:",
  data
);

    } catch (error) {

      console.error(
        "접수 오류:",
        error
      );


      alert(
        "접수 중 오류가 발생했습니다."
      );


    } finally {

      submitButton.disabled =
        false;

      submitButton.textContent =
        "접수 신청하기";

    }

  }
);


/* =========================
   완료 팝업 닫기
========================= */

closeModal.addEventListener(
  "click",
  () => {

    completeModal.classList.remove(
      "show"
    );

  }
);