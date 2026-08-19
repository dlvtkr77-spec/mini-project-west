const certificateCards = document.querySelectorAll(".certificate-card");
const selectedCertificateInput = document.getElementById("selected-certificate");
const applicationForm = document.getElementById("application-form");

certificateCards.forEach((card) => {
  card.addEventListener("click", () => {

    certificateCards.forEach((item) => {
      item.classList.remove("selected");
    });

    card.classList.add("selected");
    selectedCertificateInput.value = card.dataset.certificate;
  });
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const certificate = selectedCertificateInput.value;

  if (!certificate) {
    alert("신청할 자격증을 선택해주세요.");
    return;
  }

  if (!name || !phone) {
    alert("이름과 연락처를 입력해주세요.");
    return;
  }

  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        phone,
        certificate
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    alert("접수가 완료되었습니다.");

    applicationForm.reset();
    selectedCertificateInput.value = "";

    certificateCards.forEach((card) => {
      card.classList.remove("selected");
    });

  } catch (error) {
    console.error(error);
    alert("접수 중 오류가 발생했습니다.");
  }
});