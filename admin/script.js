/* =========================
   기본 요소
========================= */

const tableBody =
  document.getElementById("application-table-body");

const totalCount =
  document.getElementById("total-count");

const completeCount =
  document.getElementById("complete-count");

const paymentWaitCount =
  document.getElementById("payment-wait-count");

const todayCount =
  document.getElementById("today-count");

const searchInput =
  document.getElementById("admin-search");

const certificateFilter =
  document.getElementById("certificate-filter");

const statusFilter =
  document.getElementById("status-filter");

const refreshButton =
  document.getElementById("refresh-button");

const emptyState =
  document.getElementById("empty-state");


let applications = [];


/* =========================
   금액 표시
========================= */

function formatPrice(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  return Number(value)
    .toLocaleString("ko-KR") + "원";

}


/* =========================
   날짜 표시
========================= */

function formatDate(value) {

  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  ).format(date);

}


/* =========================
   상태 배지
========================= */

function getStatusBadge(value) {

  const status = value || "-";

  let className = "status-badge";

  if (
    status === "접수완료" ||
    status === "완료"
  ) {

    className += " status-complete";

  }

  else if (
    status === "대기" ||
    status === "결제대기"
  ) {

    className += " status-wait";

  }

  else if (
    status === "접수취소" ||
    status === "취소"
  ) {

    className += " status-cancel";

  }

  return `
    <span class="${className}">
      ${status}
    </span>
  `;

}


/* =========================
   요약 카드
========================= */

function updateSummary() {

  totalCount.textContent =
    applications.length;


  const complete =
    applications.filter(
      item =>
        item.status === "접수완료"
    ).length;

  completeCount.textContent =
    complete;


  const paymentWait =
    applications.filter(
      item =>
        item.payment_status === "대기"
    ).length;

  paymentWaitCount.textContent =
    paymentWait;


  const now = new Date();

  const todayString = [
    now.getFullYear(),
    String(
      now.getMonth() + 1
    ).padStart(2, "0"),
    String(
      now.getDate()
    ).padStart(2, "0")
  ].join("-");


  const todayApplications =
    applications.filter(
      item => {

        if (!item.created_at) {
          return false;
        }

        return (
          item.created_at.slice(0, 10) ===
          todayString
        );

      }
    ).length;


  todayCount.textContent =
    todayApplications;

}


/* =========================
   테이블 출력
========================= */

function renderTable() {

  const keyword =
    searchInput.value
      .trim()
      .toLowerCase();

  const certificate =
    certificateFilter.value;

  const status =
    statusFilter.value;


  const filtered =
    applications.filter(
      item => {

        const searchTarget = `
          ${item.name || ""}
          ${item.phone || ""}
          ${item.certificate || ""}
        `.toLowerCase();


        const matchesSearch =
          !keyword ||
          searchTarget.includes(keyword);


        const matchesCertificate =
          !certificate ||
          item.certificate === certificate;


        const matchesStatus =
          !status ||
          item.status === status;


        return (
          matchesSearch &&
          matchesCertificate &&
          matchesStatus
        );

      }
    );


  if (filtered.length === 0) {

    tableBody.innerHTML = "";

    emptyState.hidden = false;

    return;

  }


  emptyState.hidden = true;


  tableBody.innerHTML =
    filtered.map(
      item => `
        <tr>

          <td>
            #${item.id ?? "-"}
          </td>

          <td>
            <strong>
              ${item.name || "-"}
            </strong>
            <br>
            <small>
              ${item.phone || "-"}
            </small>
          </td>

          <td>
            ${item.certificate || "-"}
          </td>

          <td>
            ${item.exam_region || "-"}
          </td>

          <td>
            ${formatDate(item.exam_date)}
          </td>

          <td>
            ${formatPrice(item.fee_final)}
          </td>

          <td>
            ${getStatusBadge(
              item.payment_status
            )}
          </td>

          <td>
            ${getStatusBadge(
              item.status
            )}
          </td>

          <td>
            ${formatDate(
              item.created_at
            )}
          </td>

        </tr>
      `
    ).join("");

}


/* =========================
   데이터 조회
========================= */

async function loadApplications() {

  refreshButton.disabled = true;

  refreshButton.textContent =
    "불러오는 중...";


  tableBody.innerHTML = `
    <tr>
      <td
        colspan="9"
        class="loading-cell"
      >
        접수 데이터를 불러오는 중입니다.
      </td>
    </tr>
  `;


  try {

    const response =
      await fetch("/api/applications");


    const result =
      await response.json();


    if (!response.ok) {

      console.error(
        "조회 실패:",
        result
      );

      throw new Error(
        result.error ||
        "접수 목록 조회 실패"
      );

    }


    applications =
      Array.isArray(result.data)
        ? result.data
        : [];


    updateSummary();

    renderTable();


  } catch (error) {

    console.error(
      "관리자 데이터 조회 오류:",
      error
    );


    tableBody.innerHTML = `
      <tr>
        <td
          colspan="9"
          class="loading-cell"
        >
          접수 데이터를 불러오지 못했습니다.
        </td>
      </tr>
    `;

  }

  finally {

    refreshButton.disabled = false;

    refreshButton.textContent =
      "새로고침";

  }

}


/* =========================
   검색 / 필터
========================= */

searchInput.addEventListener(
  "input",
  renderTable
);

certificateFilter.addEventListener(
  "change",
  renderTable
);

statusFilter.addEventListener(
  "change",
  renderTable
);

refreshButton.addEventListener(
  "click",
  loadApplications
);


/* =========================
   시작
========================= */

loadApplications();