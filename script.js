const certificateCards = document.querySelectorAll(".certificate-card");
const selectedCertificateInput = document.getElementById("selected-certificate");
const applicationForm = document.getElementById("application-form");

certificateCards.forEach((card) => {
  card.addEventListener("click", () => {

    // 기존 선택 표시 제거
    certificateCards.forEach((item) => {
      item.classList.remove("selected");
    });

    // 클릭한 자격증 선택 표시
    card.classList.add("selected");

    // 선택한 자격증 저장
    selectedCertificateInput.value = card.dataset.certificate;
  });
});

applicationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedCertificateInput.value) {
    alert("신청할 자격증을 선택해주세요.");
    return;
  }

  alert("입력 정보를 확인했습니다.");
});