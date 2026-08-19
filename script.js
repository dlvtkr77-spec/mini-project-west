const applyButtons = document.querySelectorAll(".apply-button");
const selectedCertificateInput =
  document.getElementById("selected-certificate");

const selectedCertificateName =
  document.getElementById("selected-certificate-name");

const applicationForm =
  document.getElementById("application-form");

const searchInput =
  document.getElementById("certificate-search");

const searchButton =
  document.getElementById("search-button");

const certificateCards =
  document.querySelectorAll(".certificate-card");

const noResult =
  document.getElementById("no-result");

const completeModal =
  document.getElementById("complete-modal");

const completeCertificate =
  document.getElementById("complete-certificate");

const closeModal =
  document.getElementById("close-modal");


/* 자격증 선택 */

applyButtons.forEach((button) => {

  button.addEventListener("click", () => {

    const certificate =
      button.dataset.certificate;

    selectedCertificateInput.value =
      certificate;

    selectedCertificateName.textContent =
      certificate;

    document
      .getElementById("application")
      .scrollIntoView({
        behavior: "smooth"
      });

  });

});


/* 검색 */

function searchCertificate() {

  const keyword =
    searchInput.value.trim().toLowerCase();

  let visibleCount = 0;

  certificateCards.forEach((card) => {

    const name =
      card.dataset.name.toLowerCase();

    if (name.includes(keyword)) {

      card.style.display = "flex";
      visibleCount++;

    } else {

      card.style.display = "none";

    }

  });

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
      searchCertificate();
    }

  }
);


/* 접수 */

applicationForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

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

    const certificate =
      selectedCertificateInput.value;


    if (!certificate) {

      alert(
        "신청할 자격증을 먼저 선택해주세요."
      );

      document
        .getElementById("certificates")
        .scrollIntoView({
          behavior: "smooth"
        });

      return;
    }


    if (!name || !phone) {

      alert(
        "이름과 연락처를 입력해주세요."
      );

      return;
    }


    const submitButton =
      document.querySelector(
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

            body: JSON.stringify({
              name,
              phone,
              certificate
            })
          }
        );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
          "접수에 실패했습니다."
        );
      }


      completeCertificate.textContent =
        certificate;

      completeModal.classList.add(
        "show"
      );


      applicationForm.reset();

      selectedCertificateInput.value =
        "";

      selectedCertificateName.textContent =
        "자격증을 먼저 선택해주세요";


    } catch (error) {

      console.error(error);

      alert(
        "접수 중 오류가 발생했습니다."
      );

    } finally {

      submitButton.disabled = false;

      submitButton.textContent =
        "접수 신청하기";

    }

  }
);


/* 완료 팝업 */

closeModal.addEventListener(
  "click",
  () => {

    completeModal.classList.remove(
      "show"
    );

  }
);


/* 접수 안내 → 자격증 검색 */

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
          .getElementById("certificates")
          .scrollIntoView({
            behavior: "smooth"
          });

      }
    );

  });