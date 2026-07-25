# 🌸 중보의 정원 (Garden of Prayer) - 프로젝트 기획 및 개발 계획서 (TypeScript)

본 프로젝트는 전시회 참여형 미디어 아트 이벤트로, 아이패드에서 사용자가 그린 꽃과 기도의 이름을 프로젝터 화면의 아름다운 정원에 실시간으로 피워내는 웹 애플리케이션입니다.

**★ 모든 소스코드는 TypeScript (.ts)로 작성됩니다.**

---

## 🎨 1. 시스템 핵심 구조 및 상세 사양

### ① 아이패드 입력용 웹페이지 (`/ipad`)

아이패드 화면은 **Canvas → Form → Layout → Confirm** 총 4단계 플로우로 전환됩니다.

#### [Step 1. Canvas (꽃 그리기)]
- **캔버스 영역**: 아이패드 터치 및 애플 펜슬 지원 드로잉 (투명 배경)
- **우측 툴바 패널**:
  - **굵기**: 슬라이더로 브러시 두께 조절
  - **색상 팔레트 & 컬러 피커 (Color Picker)**:
    - 기본 대표 색상 버튼 제공 (검은색 제외: 빨간색, 노란색, 파란색, 초록색 등)
    - **컬러 팔레트 아이콘**: 아이콘 클릭 시 팔레트/컬러 피커가 오픈되어 사용자가 원하는 임의의 색상을 자유롭게 선택 가능
  - **모드 전환**: `[펜]` / `[지우개]` 토글 버튼
  - **하단 버튼**: `[초기화]` (전체 지우기), `[다음]` (Form 단계 이동)

#### [Step 2. Form (이름 입력)]
- **입력 폼**: 중보하고 싶은 대상의 **이름** 기입 (예: "우리 엄마", "James")
- **하단 버튼**: `[이전]` (Canvas 단계 이동), `[다음]` (Layout 단계 이동)

#### [Step 3. Layout (꽃 위치 및 이름 앵커 설정)]
- **미니 정원 뷰포트 영역**:
  - **배경 미디어**: Admin이 설정한 **Main Scene의 `backgroundImage`**를 배경으로 사용. (만약 설정된 메인 씬이나 배경이 없다면 **어두운 초록색 그래디언트**로 예외 처리)
  - **전체 꽃 렌더링 (★ 필수)**: 새로 그린 본인의 꽃뿐만 아니라, **해당 씬에 이미 배치된 다른 모든 참여자들의 꽃들**이 미니 정원 위에 함께 렌더링되어 보임. (기존 꽃들의 위치를 확인하며 본인의 꽃을 원하는 자리에 배치 가능)
  - **꽃 이동**: 본인이 방금 그린 꽃을 손가락(터치/드래그)으로 정원 위 원하는 위치로 이동하며 상대 좌표 (`posX`, `posY`: `0.0 ~ 1.0` 정규화 비율) 계산
- **우측 이름 앵커 선택 패널**:
  - 3x3 그리드로 빨간 점 선택 가능
  - 이름표와 꽃의 상대 위치 지정 앵커 9종: `top`, `top-right`, `right`, `bottom-right`, `bottom`, `bottom-left`, `left`, `top-left`, `center`
  - 앵커 선택에 따라 프리뷰 및 프로젝터에서 이름표의 위치가 다르게 렌더링됨
- **하단 버튼**: `[이전]` (Form 단계 이동), `[전송]` (Confirm 모달 띄우기)

#### [Step 4. Confirm (최종 확인 및 서버 전송)]
- **전송 확인 모달**: "전송하시겠습니까?" 안내 문구 표시
- **버튼**:
  - `[취소]`: Layout 단계로 돌아감
  - `[확인]`: `Flower` 데이터를 서버로 실시간 전송(Socket.io) 후, 성공 메시지와 함께 다시 Step 1(Canvas)로 자동 리셋

---

### ② 프로젝터 전시용 웹페이지 (`/projector`)

* **기본 경로**: `/projector`
* **배경 미디어 분기 처리 (Background Media Support)**:
  - **정적 이미지**: PNG, JPEG, WEBP 등
  - **GIF 이미지**: 무한 반복 애니메이션 정원
  - **동영상 (Video)**: MP4, MOV, WEBM 등 (`autoplay`, `loop`, `muted`, `playsinline` 속성 적용으로 무한 자동 재생)
  - 배경이 없을 경우 어두운 초록색 그래디언트 적용
* **실시간 소켓 연동 & 애니메이션**:
  - Socket.io로 `Flower` 데이터 수신 시 지정된 `posX`, `posY` (0.0~1.0 비율) 위치에 새싹이 트듯 꽃 피어남 (Scale & Fade-in CSS/Canvas 애니메이션)
* **이름 앵커 (`nameAnchor`) 정밀 렌더링**:
  - 9가지 앵커(`top`, `top-right`, `right`, `bottom-right`, `bottom`, `bottom-left`, `left`, `top-left`, `center`)에 따른 이름표 위치 정밀 렌더링

---

### ③ 관리자 웹페이지 (`/admin`)

전시 환경 및 씬(Scene), 꽃 레이아웃을 총괄 관리하는 관리자 화면입니다.

#### 1. 메인 화면 (`/admin` Main)
- **3열 그리드 정사각형 뷰**: 생성된 날짜 기준 오름차순 정렬된 씬 카드 목록 노출
- **Main Scene (메인 씬)**: 생성된 씬 중 단 하나만 메인 씬으로 지정할 수 있으며, 카드 상단에 노란색 별표(★) 표시
- **우측 상단 `+` 버튼**: 클릭 시 씬 생성 모달 호출

#### 2. 씬 생성 (Create Scene)
- **모달/프롬프트**: 씬 이름을 작성할 수 있는 폼 표시
- **유효성 검사**: 이름 미입력 시 생성 불가
- **서버 & DB 저장**: 생성을 완료하면 그리드에 추가됨과 동시에 서버로 전송되어 DB(또는 인-메모리 스토어)에 즉시 저장 및 유지됨

#### 3. 우클릭 커스텀 드롭다운 메뉴 (Dropdown Menu)
씬 카드 위에서 우클릭 시 드롭다운 메뉴 노출:
- **이름 변경**: 프롬프트 호출 후 씬 이름 수정
- **(메인) 씬 설정**: 노란색 별표(★)를 해당 씬으로 변경하며, 프로젝터 및 아이패드의 현재 정원 배경/씬으로 지정
- **삭제**: 서버/DB 데이터 삭제 및 메인 그리드 뷰에서 즉시 제거

#### 4. 씬 설정 화면 (`/admin/setting`)
메인 화면에서 특정 씬 카드 클릭 시 진입하는 씬 상세 편집 화면:
- **배경 미디어 교체**:
  - `[업로드]` 버튼으로 파일 탐색기를 열거나 프리뷰 영역 위로 이미지/GIF/동영상 파일을 드래그 앤 드롭하여 배경 교체
- **모든 꽃 렌더링 및 편집**:
  - 좌측 프리뷰 영역에서 **해당 씬에 속한 모든 사용자들의 꽃들**이 렌더링되어 표시됨
  - 특정 꽃 클릭 시 선택 상태 (선택 아웃라인/하이라이트 모션) 및 재클릭 시 선택 해제
  - 선택된 꽃은 우측 패널에서 소유자 이름(`owner`)과 이름 앵커(`nameAnchor` 9종) 실시간 변경 가능
  - 원하는 꽃을 터치/마우스 드래그하여 위치 좌표(`posX`, `posY`) 자유 변경
- **선택한 꽃 삭제 기능**:
  - 프리뷰에서 특정 꽃을 선택하면 우측 패널에 `[꽃 삭제]` 버튼이 활성화됨
  - `[꽃 삭제]` 클릭 시 **"정말 이 꽃을 삭제하시겠습니까?"** 최종 확인 모달 노출 ➡️ 확인 시 데이터 삭제
- **게시 (Publish) 버튼**:
  - 배경 이미지 교체, 꽃 위치/이름/앵커/삭제 변경 사항을 서버로 적용하기 위한 버튼
  - 클릭 시 "게시하시겠습니까?" 최종 승인 모달 노출 ➡️ 확인 클릭 시 DB 업데이트 및 `/projector` 화면으로 Socket.io 실시간 브로드캐스팅 적용

---

## 🛠️ 2. 환경 설정 및 실행 스크립트 (TypeScript)

### 1. 환경별 특징

| 구분 | **Debug 환경** | **Release 환경** |
| :--- | :--- | :--- |
| **목적** | 로컬 개발 및 속도 빠른 테스트 | 실제 전시회 배포 및 데이터 영구 보관 |
| **서버 주소** | `http://localhost:3000` | Render.com 호스팅 주소 |
| **데이터 저장 방식** | **인-메모리 (In-Memory)** <br>(서버 메모리 내 배열/객체 관리) | **Supabase DB & Storage** <br>(PostgreSQL 데이터베이스 + 파일 스토리지) |
| **실행 엔진** | `tsx watch src/server.ts` | `node dist/server.js` |

---

### 2. npm 실행 스크립트 (`package.json`)

```bash
# 1. Debug (로컬 TypeScript 인-메모리) 개발 서버 실행 (코드 변경 시 자동 재시작)
npm run dev:debug

# 2. Debug (로컬 TypeScript 인-메모리) 일반 실행
npm run start:debug

# 3. Release (Render + Supabase 연동) 운영 서버 실행
npm run start:release

# 4. TypeScript 소스 빌드 (dist/ 생성)
npm run build
```

---

## 📦 3. TypeScript 데이터 모델 (Data Models)

### `Flower` 인터페이스 (`src/types/flower.ts`)
```typescript
export type NameAnchor =
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'
  | 'top-left'
  | 'center';

export interface Flower {
  id: string;          // UUID
  image: string;       // 투명 배경 PNG Data URL (data:image/png;base64,...)
  posX: number;        // 정원 화면 기준 상대 X 위치 (0.0 ~ 1.0)
  posY: number;        // 정원 화면 기준 상대 Y 위치 (0.0 ~ 1.0)
  owner: string;       // 입력받은 사용자 이름
  nameAnchor: NameAnchor; // 이름표 배치 앵커 (9가지)
  createdAt: string;   // 생성 시간 (ISO 문자열)
}
```

### `Scene` 인터페이스 (`src/types/scene.ts`)
```typescript
export interface Scene {
  id: string;              // UUID
  name: string;            // 씬 이름
  createdAt: string;       // 생성 날짜 (ISO 문자열)
  backgroundImage: string; // 이미지/GIF/동영상 파일 경로 또는 Data URL
  isMain: boolean;         // 메인 씬 여부 (노란색 별표 ★)
  flowers?: Flower[];      // 해당 씬에 배치된 꽃 목록
}
```

---

## ☁️ 5. Render 및 Supabase 세팅 상세 가이드

### 🟢 [Part A] Supabase 세팅 (DB & 스토리지)
1. **프로젝트 생성:** [https://supabase.com](https://supabase.com) 가입 후 `garden-of-prayer` 프로젝트 생성
2. **테이블 생성:** SQL Editor에서 `scenes` 및 `flowers` 테이블 SQL 실행
3. **Storage 생성:** Storage ➡️ `garden-media` (Public Bucket) 생성
4. **Key 복사:** Project Settings ➡️ API에서 `Project URL`과 `anon key` 복사

### 🚀 [Part B] Render.com 세팅 (서버 & 웹소켓)
1. **GitHub Push:** 저장소에 소스코드 커밋 & Push
2. **Web Service 생성:** [https://render.com](https://render.com) 대시보드 ➡️ `New Web Service` 생성
3. **명령어:** Build Command (`npm run build`), Start Command (`npm run start:release`)
4. **환경 변수:** `NODE_ENV=release`, `PORT=10000`, `SUPABASE_URL`, `SUPABASE_KEY` 설정 후 배포

---

## 📅 6. 단계별 개발 로드맵 (Roadmap)

1. **Step 1: TypeScript 백엔드 서버 및 In-Memory 스토어 세팅 (`src/server.ts`)**
   - Node.js + Express + Socket.io + TypeScript 기반 기초 서버 및 타입 정의
2. **Step 2: 아이패드 4단계 입력 웹페이지 개발 (`/ipad`)**
   - Canvas(드로잉 & Color Picker) → Form(이름 입력) → Layout(Main Scene 배경/어두운 초록 그래디언트 + 기존 모든 꽃 렌더링 + 드래그 위치 & 9앵커) → Confirm(전송 모달)
3. **Step 3: 프로젝터 대형 정원 웹페이지 개발 (`/projector`)**
   - 정원 배경 미디어 분기(이미지/GIF/동영상 loop), Socket.io 수신, `Flower` 렌더링 & 9앵커별 이름표 + 애니메이션
4. **Step 4: 관리자 웹페이지 개발 (`/admin`)**
   - 3열 씬 그리드, 씬 DB 저장 생성/우클릭 메뉴, 상세 설정(배경 교체/드롭다운, 모든 꽃 렌더링, 꽃 선택 및 삭제 모달, 위치 드래그 & 9앵커 수정), 게시(Publish) 승인 모달 및 실시간 방송
5. **Step 5: Release (Supabase) 스토리지 연동 및 배포 테스트**

---

## 🛠️ 7. 추천 개발 스크립트 및 기술 스택 (TypeScript Stack)

| 영역 | 기술 스택 / 라이브러리 | 선정 이유 및 역할 |
| :--- | :--- | :--- |
| **Language** | **TypeScript 5.x** | 전 영역 완벽한 타입 안전성, 버그 방지 및 IDE 자동완성 극대화 |
| **Backend Runtime** | **Node.js (Express + tsx)** | ES Modules + TypeScript 실행 환경 구축 |
| **Real-time Engine** | **Socket.io v4** | 아이패드 ↔ 서버 ↔ 프로젝터 ↔ 관리자 간 초저지연 실시간 양방향 브로드캐스팅 |
| **Frontend Web** | **Vanilla HTML5 Canvas + TypeScript (Vite/ESM)** | 오버헤드 없이 터치 드로잉 캔버스 60fps 반응속도 및 미디어 아트 애니메이션 최적화 |
| **Styling & Design** | **Vanilla CSS (Variables & Layout)** | 감성적이고 몰입감 있는 어두운 정원 톤, 미니멀 UI 및 9가지 앵커 포지셔닝 |
| **Database & Storage** | **Supabase (PostgreSQL + Public Storage)** | Release 모드에서 씬/꽃 영구 DB 보관 및 파일 무료 저장 |
| **Local Store** | **In-Memory Store** | Debug 모드에서 DB 연결 없이 서버 메모리상에서 즉시 테스트 |

---

## 📁 8. 프로젝트 디렉터리 및 파일 구조 (Folder & File Architecture)

프로젝트 전체 파일 및 폴더 구조와 각 파일의 역할입니다.

```text
garden_of_prayer/
├── package.json               # project dependencies, npm scripts (dev:debug, start:release, build)
├── tsconfig.json              # TypeScript compiler configuration (src/ -> dist/)
├── plan.md                    # master project plan & specification document
│
├── src/                       # Backend TypeScript Server Source
│   ├── server.ts              # Express server + Socket.io real-time handler + Static route routing
│   ├── types/                 # TypeScript Data Type Definitions
│   │   ├── flower.ts          # Flower interface, NameAnchor union type
│   │   └── scene.ts           # Scene interface
│   └── store/                 # Data Persistence Adapters
│       ├── memoryStore.ts     # Debug Mode: In-Memory array/object data store
│       └── supabaseStore.ts   # Release Mode: Supabase DB & Storage API client adapter
│
└── public/                    # Frontend Client Web Assets & Views
    ├── css/                   # Stylesheets for Media Art Theme
    │   ├── common.css         # Global variables, Dark garden aesthetic, Modal dialog CSS
    │   ├── ipad.css           # iPad 4-step workflow styles (Canvas, Form, Layout, Confirm)
    │   ├── projector.css      # Projector view styles (Full-bleed media, Flower canvas, Anchor positioning)
    │   └── admin.css          # Admin view styles (3-column grid, context dropdown, setting view)
    │
    ├── ipad/                  # iPad Input Application (/ipad)
    │   ├── index.html         # iPad 4-step HTML markup
    │   └── ipad.ts            # Touch Canvas drawing, Color Picker modal, Drag-positioning, Socket emit
    │
    ├── projector/             # Projector Display Application (/projector)
    │   ├── index.html         # Projector display HTML markup
    │   └── projector.ts       # Background media player, Socket receive, Flower scale/fade animation, 9-Anchor text renderer
    │
    └── admin/                 # Admin Management Application (/admin)
        ├── index.html         # Admin Main Scene Grid View HTML
        ├── admin.ts           # 3-column Scene Grid, Create Scene modal, Right-click context dropdown, Set Main Scene
        ├── setting.html       # Scene Detail Settings View HTML (/admin/setting)
        └── setting.ts         # Background drag & drop upload, All flowers render/drag edit, Flower deletion modal, Live Publish button
```

### 📄 주요 파일별 역할 요약

1. **`src/server.ts`**: Express 앱 및 Socket.io 인스턴스 생성, `/ipad`, `/projector`, `/admin` 정적 파일 라우팅 및 실시간 소켓 이벤트 통신 처리.
2. **`src/types/flower.ts`, `scene.ts`**: 전체 시스템에서 사용하는 `Flower` 및 `Scene` TypeScript 인터페이스 정의.
3. **`src/store/memoryStore.ts`**: Debug 모드용 메모리 기반 데이터 CRUD 핸들러.
4. **`src/store/supabaseStore.ts`**: Release 모드용 Supabase Client DB CRUD 및 파일 업로드 핸들러.
5. **`public/ipad/ipad.ts`**: 아이패드 캔버스 드로잉, 펜/지우개/두께/컬러피커, 이름 입력, Layout 화면의 기존 모든 꽃 렌더링 + 본인 꽃 위치 드래그 & 9앵커 선택, 전송 모달 logic.
6. **`public/projector/projector.ts`**: 정원 배경 미디어(이미지/GIF/동영상 loop) 분기 재생, 소켓 수신 시 실시간 꽃 피어남 애니메이션 및 9앵커 정밀 텍스트 위치 렌더링.
7. **`public/admin/admin.ts`**: 3열 그리드 씬 목록 표시, 메인 씬 지정(★), 우클릭 메뉴(이름변경/메인지정/삭제), 씬 생성 & 서버 전송.
8. **`public/admin/setting.ts`**: 씬 배경 교체, 해당 씬에 배치된 모든 꽃들 렌더링/선택/드래그 이동/속성 변경, 꽃 삭제 버튼 & 확인 모달, 게시(Publish) 승인 모달 logic.
