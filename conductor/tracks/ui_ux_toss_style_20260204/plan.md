# Implementation Plan: UI/UX 전면 개편 (토스 스타일)

## Phase 1: 디자인 시스템 및 기초 설정 (Design System & Foundation) [checkpoint: 98e5c2d]
- [x] Task: 전역 타이포그래피 및 컬러 팔레트 설정
    - [x] Pretendard 등 산세리프 폰트 설치 및 tailwind 설정 업데이트
    - [x] `tailwind.config.ts`에 Toss Blue 및 단계별 그레이 스케일 컬러 정의
- [x] Task: 다크/라이트 모드 테마 시스템 구축
    - [x] `next-themes` 설치 및 ThemeProvider 설정
    - [x] `globals.css`에 테마별 기본 배경색 및 텍스트 색상 정의
- [x] Task: Conductor - User Manual Verification 'Phase 1: 디자인 시스템 및 기초 설정' (Protocol in workflow.md)

## Phase 2: 핵심 UI 컴포넌트 리뉴얼 (Core UI Components - TDD) [checkpoint: 1aa1ffb]
- [x] Task: Button 컴포넌트 리뉴얼
    - [x] Button 컴포넌트의 스타일 및 상태(hover, active, disabled) 테스트 작성
    - [x] 토스 스타일(둥근 모서리, 클릭 애니메이션)을 적용하여 구현
- [x] Task: Input 및 Badge 컴포넌트 리뉴얼
    - [x] Input/Badge 컴포넌트 테스트 작성
    - [x] 테두리를 최소화하고 배경색을 활용한 깔끔한 스타일로 구현
- [x] Task: Card 컴포넌트 리뉴얼
    - [x] Card 컴포넌트의 Elevation(그림자) 및 패딩 테스트 작성
    - [x] 부드러운 그림자와 `rounded-3xl` 이상의 곡률 적용
- [x] Task: Conductor - User Manual Verification 'Phase 2: 핵심 UI 컴포넌트 리뉴얼' (Protocol in workflow.md)

## Phase 3: 레이아웃 및 네비게이션 개편 (Layout & Navigation) [checkpoint: 1faccdf]
- [x] Task: 하이브리드 레이아웃(중앙 컨테이너) 구현
    - [x] Root Layout 구조를 변경하여 데스크탑에서 중앙 600px 컨테이너 적용
    - [x] 좌우 여백에 보조 정보를 표시할 사이드바 영역 확보
- [x] Task: 하단 탭 바 및 헤더 리뉴얼
    - [x] 모바일 최적화 하단 네비게이션 바 구현
    - [x] 스크롤 위치에 따라 반응하는 동적 헤더 인터렉션 적용
- [x] Task: 모달 및 바텀 시트 시스템 구축
    - [x] `Framer Motion`을 활용하여 아래에서 위로 올라오는 바텀 시트 구현
- [x] Task: Conductor - User Manual Verification 'Phase 3: 레이아웃 및 네비게이션 개편' (Protocol in workflow.md)

## Phase 4: 뷰 적용 및 애니메이션 (Views & Transitions)
- [x] Task: 주요 페이지 뷰(Dashboard, TradeList) 스타일 적용
    - [x] 기존 뷰 컴포넌트에 리뉴얼된 UI 요소 적용 및 레이아웃 최적화
- [x] Task: 페이지 전환 애니메이션 적용
    - [x] `Framer Motion`의 `AnimatePresence`를 활용한 페이지 간 부드러운 전환 추가
- [x] Task: Conductor - User Manual Verification 'Phase 4: 뷰 적용 및 애니메이션' (Protocol in workflow.md)

## Phase 5: 최종 폴리싱 및 검증 (Polishing & Final Check) [checkpoint: ce1933d]
- [x] Task: 전체 다크/라이트 모드 색상 대비 및 시인성 최종 점검
- [x] Task: 성능 최적화 (애니메이션 부하 및 Lighthouse 점수 확인)
- [x] Task: Conductor - User Manual Verification 'Phase 5: 최종 폴리싱 및 검증' (Protocol in workflow.md)
