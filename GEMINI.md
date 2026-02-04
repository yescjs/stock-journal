# Gemini CLI Context: Stock Journal

이 파일은 Stock Journal 프로젝트의 구조, 기술 스택 및 개발 컨벤션을 설명합니다. Gemini CLI와의 상호작용 시 이 문서를 참조하여 일관성 있는 코드를 작성하세요.

## 🚀 프로젝트 개요 (Project Overview)

**Stock Journal**은 개인 투자자를 위한 현대적인 주식 매매 일지 애플리케이션입니다. Next.js 16 App Router를 기반으로 구축되었으며, 사용자가 매매 기록을 작성하고 수익률 분석 및 리스크 관리를 수행할 수 있도록 돕습니다.

- **핵심 기능**: 매매 일지 작성(이미지 첨부 포함), 실시간 수익률 통계, 리스크 관리 설정, 목표 관리, 다중 통화 지원(KRW/USD).
- **데이터 저장**: 
    - **게스트 모드**: 브라우저 `localStorage`에 저장.
    - **로그인 모드**: Supabase (PostgreSQL + Auth + Storage) 사용.

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 (with `clsx`, `tailwind-merge`)
- **Backend/BaaS**: Supabase (Database, Auth, Storage)
- **Visualization**: Recharts
- **Animation**: Framer Motion
- **Testing**: Playwright
- **Deployment**: Vercel

## 📁 주요 디렉토리 구조 (Directory Structure)

- `app/`: Next.js App Router 경로 및 컴포넌트
    - `api/`: 서버리스 API 엔드포인트 (주가 검색, 차트 데이터 등)
    - `components/`: UI 및 비즈니스 컴포넌트
        - `ui/`: 재사용 가능한 기본 UI 컴포넌트 (Button, Badge, Card 등)
        - `views/`: 대시보드, 매매 목록 등 주요 페이지 뷰
    - `hooks/`: 비즈니스 로직 및 상태 관리 (데이터 CRUD, 통계 계산 등)
    - `lib/`: Supabase 클라이언트 등 외부 라이브러리 설정
    - `types/`: TypeScript 인터페이스 정의
    - `utils/`: 헬퍼 함수 (날짜 포맷, 파일 처리 등)
- `supabase_migrations/`: 데이터베이스 스키마 및 마이그레이션 SQL
- `tests/`: Playwright E2E 테스트 코드

## 📜 실행 및 개발 명령 (Scripts)

- `npm run dev`: 개발 서버 실행 (`localhost:3000`)
- `npm run build`: 프로덕션 빌드 생성
- `npm run start`: 빌드된 애플리케이션 실행
- `npm run lint`: ESLint를 사용한 코드 린팅
- `npx playwright test`: E2E 테스트 실행

## 🎨 개발 컨벤션 (Development Conventions)

### 1. 컴포넌트 및 스타일링
- **Tailwind CSS 4**: 스타일링은 기본적으로 Tailwind를 사용합니다.
- **`cn` 유틸리티**: `app/components/ui/Button.tsx` 등에 정의된 `cn` 함수를 사용하여 조건부 클래스를 결합합니다.
- **Toss Design System 스타일**: UI 컴포넌트는 토스 디자인 시스템 스타일(둥근 모서리, 부드러운 그림자)을 지향합니다.

### 2. 상태 관리 및 데이터 Fetching
- **Custom Hooks**: 비즈니스 로직은 Hook으로 분리합니다 (예: `useTrades`, `useStats`).
- **Auth State**: `useSupabaseAuth`를 통해 사용자 로그인 상태를 감지하고, 이에 따라 데이터를 DB 또는 LocalStorage에서 불러옵니다.

### 3. 타입 정의
- 모든 데이터 모델은 `app/types/` 폴더 내에 정의합니다. 
- API 응답 및 컴포넌트 Props에 대해 엄격한 타이핑을 권장합니다.

### 4. 언어 및 주석
- **사용자 인터페이스**: 한국어가 기본 언어입니다.
- **코드 및 주석**: 변수명은 영어로 작성하되, 복잡한 로직에 대한 설명이나 커밋 메시지는 한국어로 작성합니다.

## ⚠️ 주의 사항
- **환경 변수**: Supabase URL, Key 및 외부 API 키(`ALPHA_VANTAGE_API_KEY`)가 필요합니다.
- **게스트 모드 처리**: 로그인하지 않은 사용자를 위해 항상 `localStorage` 폴백 로직을 고려해야 합니다.
- **이미지 업로드**: 이미지는 Supabase Storage에 저장되거나(로그인 시) Base64 데이터 URL로 저장됩니다(게스트 시).
