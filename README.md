# 📈 Stock Journal

> 직관적인 매매일지로 시작하는 스마트한 주식 투자 관리

Stock Journal은 개인 투자자를 위한 현대적인 주식 매매 일지 애플리케이션입니다. 매매 기록, 수익률 분석, 리스크 관리를 한 곳에서 관리하며, 데이터 기반의 투자 결정을 돕습니다.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

## ✨ 주요 기능

### 📝 매매 일지
- **직관적인 기록 작성**: 매수/매도 거래를 간편하게 기록
- **차트 첨부**: 매매 시점의 차트 이미지를 함께 저장
- **태그 시스템**: 커스텀 태그로 거래를 분류하고 관리
- **전략 관리**: 나만의 매매 전략을 등록하고 추적
- **시장 일기**: 일별 시장 상황과 투자 심리를 기록

### 📊 통계 및 분석
- **실시간 수익률**: 보유 종목의 실시간 손익 계산
- **다양한 차트**: 일별/월별 수익률, 자산 추이 시각화
- **종목별 분석**: 각 종목의 매매 내역과 수익률 분석
- **태그별 통계**: 태그별 승률과 수익률 비교
- **전략별 성과**: 등록한 전략의 성과 추적
- **요일별 분석**: 요일별 매매 패턴 분석
- **보유 기간 분석**: 보유 기간에 따른 수익률 분석

### 🛡️ 리스크 관리
- **일일 손실 한도**: 하루 최대 손실액 설정 및 알림
- **포지션 리스크**: 종목별 위험도 모니터링
- **계좌 잔고 관리**: 계좌 잔고 추적 및 히스토리
- **고위험 포지션 알림**: 위험도가 높은 포지션 자동 감지

### 🎯 목표 설정
- **월별 목표**: 월별 수익 목표 설정 및 달성률 추적
- **진행률 시각화**: 목표 대비 현재 성과를 한눈에 확인

### 💱 다중 통화 지원
- **한국/미국 주식**: KRW, USD 통화 자동 인식
- **환율 변환**: 실시간 환율 적용 및 통합 손익 계산
- **통화별 표시**: 원화/달러 표시 전환 기능

### 🔐 인증 및 데이터
- **Supabase 인증**: 이메일 로그인 및 소셜 로그인 (네이버)
- **클라우드 동기화**: 로그인 시 데이터 자동 동기화
- **게스트 모드**: 로그인 없이 로컬에서 사용 가능
- **데이터 백업**: JSON 파일로 내보내기/가져오기

### 🎨 사용자 경험
- **다크 모드**: 눈의 피로를 줄이는 다크 테마
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **실시간 차트**: Recharts 기반의 인터랙티브 차트
- **애니메이션**: Framer Motion을 활용한 부드러운 전환

## 🚀 시작하기

### 사전 요구사항

- Node.js 20.x 이상
- npm 또는 yarn
- Supabase 계정 (선택사항)

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/stock-journal.git
cd stock-journal

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
```

### 환경 변수 설정

`.env.local` 파일에 다음 변수를 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Naver Login (선택사항)
NEXT_PUBLIC_NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# API Keys (선택사항)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 빌드

```bash
npm run build
npm start
```

## 🏗️ 기술 스택

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components with Lucide React icons
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Markdown**: React Markdown with remark-gfm

### Backend
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (이미지 저장)
- **API Routes**: Next.js API Routes

### External APIs
- **주가 데이터**: Alpha Vantage API
- **차트 데이터**: Yahoo Finance (via API routes)

## 📁 프로젝트 구조

```
stock-journal/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # 인증 관련 API
│   │   ├── stock-search/      # 주식 검색 API
│   │   └── stock-chart/       # 차트 데이터 API
│   ├── components/            # React 컴포넌트
│   │   ├── views/            # 페이지 뷰 컴포넌트
│   │   ├── charts/           # 차트 컴포넌트
│   │   └── ui/               # UI 컴포넌트
│   ├── hooks/                # Custom React Hooks
│   ├── lib/                  # 유틸리티 라이브러리
│   ├── types/                # TypeScript 타입 정의
│   └── utils/                # 헬퍼 함수
├── public/                   # 정적 파일
└── supabase_migrations/      # DB 마이그레이션
```

## 🎯 주요 컴포넌트

### Hooks
- `useTrades`: 매매 기록 CRUD 관리
- `useStats`: 통계 및 분석 데이터 계산
- `useRiskManagement`: 리스크 관리 로직
- `useMonthlyGoals`: 월별 목표 관리
- `useStrategies`: 매매 전략 관리
- `useDiary`: 시장 일기 관리
- `useMarketData`: 실시간 주가 및 환율 관리
- `useSupabaseAuth`: Supabase 인증 관리

### Views
- `TradeListView`: 매매 일지 피드
- `DashboardView`: 통계 대시보드
- `MarketDiaryView`: 시장 일기
- `SettingsView`: 설정 및 전략 관리

## 🔧 주요 기능 구현

### 실시간 주가 업데이트
```typescript
// Alpha Vantage API를 통한 주가 조회
const response = await fetch(`/api/stock-search?symbol=${symbol}`);
const data = await response.json();
```

### 수익률 계산
```typescript
// 보유 종목의 실현/미실현 손익 계산
const realizedPnL = sellAmount - buyAmount;
const unrealizedPnL = (currentPrice - avgBuyPrice) * quantity;
```

### 데이터 동기화
- 로그인 사용자: Supabase에 자동 저장
- 게스트 사용자: localStorage에 저장
- 게스트 → 로그인 시 데이터 마이그레이션 지원

## 📱 스크린샷

> 추후 스크린샷 추가 예정

## 🤝 기여하기

기여는 언제나 환영합니다! 다음 단계를 따라주세요:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📧 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.

---

