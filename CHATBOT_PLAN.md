# 자격증 간편접수 챗봇 구현 계획 (CHATBOT_PLAN.md)

## 1. 개요
본 문서는 `CHATBOT_SPEC.md`의 요구사항에 따라, 기존 자격증 간편접수 웹사이트의 기존 기능(자격증 검색, 선택, 통합 접수 Form, Supabase 저장, 접수 완료 팝업, 관리자 페이지, `/api/applications`)과 충돌하지 않으면서 Gemini API 기반의 AI 챗봇 기능을 안전하게 추가하기 위한 종합 계획입니다.

---

## 2. 새로 만들어야 할 파일

1. **`api/chat.js`**
   - Vercel Serverless Function
   - 프론트엔드로부터 사용자의 질문(`message`)을 받아 Gemini API(`gemini-2.5-flash-lite` 또는 `gemini-1.5-flash` 등 사양에 맞춘 모델)를 호출하고 응답을 반환
   - API Key(`GEMINI_API_KEY` 등)를 서버 환경변수에서 안전하게 관리하여 브라우저 노출 방지
   - 자격증 시험 접수 관련 가이드 프롬프트 적용 (범위 외 질문 차단)

2. **`chatbot.css`** (또는 기존 `style.css`에 통합 / 별도 모듈화)
   - 챗봇 플로팅 버튼, 채팅창 레이아웃, 대화 내용 영역, 입력창, 전송 버튼, 닫기 버튼 등의 스타일링
   - 시니어 사용자층을 고려한 직관적이고 큰 폰트/버튼 디자인 적용

3. **`chatbot.js`**
   - 채팅창 열기/닫기 토글 기능
   - 초기 환영 메시지 출력 ("안녕하세요. 자격증 접수 도우미입니다...")
   - 사용자 입력값 검증 (비어있는 경우 호출 방지)
   - Enter 키 및 전송 버튼 이벤트 처리
   - `/api/chat` 통신 및 로딩 상태 표시, 오류 발생 시 안내 메시지 처리

---

## 3. 수정해야 할 기존 파일

1. **`index.html`**
   - 챗봇 UI 컴포넌트 HTML 구조 추가 (플로팅 버튼, 모달/채팅 박스 컨테이너)
   - `<link rel="stylesheet" href="chatbot.css">` 추가
   - `<script src="chatbot.js" defer></script>` 추가

---

## 4. 각 파일에서 구현할 내용 상세

### A. `api/chat.js` (백엔드 Serverless Function)
- **요청 처리**: `POST /api/chat`, Body: `{ message: "..." }`
- **유효성 검사**: `message`가 없거나 공백인 경우 400 에러 반환.
- **System Instruction / Prompt Engineering**:
  - 역할: 시니어 자격증 간편접수 서비스의 친절한 AI 도우미.
  - 지원 자격증 목록 (한식조리기능사, 지게차운전기능사, 굴착기운전기능사, 전기기능사, 손해평가사, 공인중개사, 요양보호사, 위생사)에 대한 접수방법, 응시료, 일정, 장소, 응시자격, 준비물, 취소/변경, 수수료 감면 등에 답변.
  - 범위를 벗어난 질문에는 *"자격증 시험 접수와 관련된 질문을 해주세요."* 라고만 답변하도록 제어.
- **Gemini API 호출**: `process.env.GEMINI_API_KEY`를 사용하여 공식 Gemini SDK 또는 `fetch`로 API 호출.

### B. `chatbot.css`
- 화면 우측 하단 고정(Floating) 챗봇 버튼 스타일.
- 채팅창 박스 (너비 ~380px, 높이 ~500px, 모바일 대응 반응형).
- 헤더 영역 (제목, 닫기 버튼).
- 메시지 영역 (사용자 메시지: 우측 정렬/말풍선, 챗봇 메시지: 좌측 정렬/말풍선, 스크롤 처리).
- 입력 영역 (텍스트 입력창 + 전송 버튼).

### C. `chatbot.js`
- DOM 로드 시 초기 환영 메시지 렌더링.
- 버튼 클릭 시 채팅창 `open`/`close` 토글.
- `sendMessage()` 함수:
  - 입력창 값 읽기 및 공백 검사.
  - 사용자 메시지를 화면에 추가.
  - `fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message }) })` 호출.
  - 성공 시 챗봇 응답 출력.
  - 오류/실패 시 *"답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."* 출력.
  - 입력창 초기화 및 스크롤 하단 고정.

---

## 5. Gemini API 연결 구조

```
[사용자 브라우저]
  │
  ├─> (채팅 입력 & 엔터/전송)
  │     ▼
  │   [chatbot.js]
  │     │  POST /api/chat { message }
  │     ▼
  │   [api/chat.js (Vercel Serverless Function)]
  │     │  (환경변수 process.env.GEMINI_API_KEY 참조)
  │     ▼
  │   [Gemini API Endpoint]
  │     │  (시스템 프롬프트 + 사용자 메시지 전달)
  │     ▼
  │   [api/chat.js] -> 응답 JSON { answer } 반환
  │     ▼
  │   [chatbot.js] -> 화면에 답변 렌더링
```

---

## 6. 기존 기능과의 충돌 방지 방안

1. **독립된 파일 구성**:
   - 기존 파일(`index.html`, `script.css`, `script.js`, `/api/applications.js` 등)의 코드를 직접 수정하지 않고, 챗봇 전용 파일(`api/chat.js`, `chatbot.css`, `chatbot.js`)을 신규 생성합니다.
   - `index.html`에는 챗봇 마크업, CSS, JS 링크만 최소한으로 삽입하여 기존 폼 구조, 자격증 검색, Supabase 연동 코드에 전혀 영향을 주지 않습니다.
2. **API 경로 분리**:
   - 기존 접수 데이터 관련 API는 `/api/applications`를 그대로 유지하고, 챗봇 API는 완전히 독립된 `/api/chat` 경로로 분리합니다.
3. **스타일 및 DOM 셀렉터 격리**:
   - 챗봇 관련 클래스명은 모두 `.chatbot-...` 네임스페이스를 사용하여 기존 CSS 클래스(`.certificate-card`, `.form-group` 등)와 충돌하지 않도록 설계합니다.
