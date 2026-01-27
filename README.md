# 📈 Stock Journal

> 직관적인 매매일지로 시작하는 스마트한 주식 투자 관리

Stock Journal은 개인 투자자를 위한 현대적인 주식 매매 일지 애플리케이션입니다. 매매 기록, 수익률 분석, 리스크 관리를 한 곳에서 관리하며, 데이터 기반의 투자 결정을 돕습니다.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

## 화면 스크린샷
[메인 화면]
<img width="1872" height="954" alt="Image" src="https://github.com/user-attachments/assets/82433202-8d77-4755-b05b-cddef64ab989" /><img width="1872" height="954" alt="Image" src="https://github.com/user-attachments/assets/e3413ef3-f4f9-419b-813e-89be943fa717" />

[통계 화면]
<img width="1872" height="954" alt="Image" src="https://github.com/user-attachments/assets/9c4dbad5-6897-4ae8-8135-005c3e969df5" /><img width="1872" height="954" alt="Image" src="https://github.com/user-attachments/assets/551b72ed-6df2-4969-a8a9-0f20bb561b4e" />

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

### 웹사이트 접속

**[www.매매일지.com](https://www.매매일지.com)** 에서 바로 사용하실 수 있습니다.

- **로그인**: 이메일 또는 네이버 계정으로 로그인하여 데이터를 클라우드에 동기화
- **게스트 모드**: 로그인 없이 바로 시작 (데이터는 브라우저에 저장됩니다)

### 데이터 관리

- **클라우드 동기화**: 로그인 시 모든 데이터가 자동으로 저장되며 어디서든 접속 가능
- **로컬 저장**: 게스트 모드에서는 브라우저의 로컬 스토리지에 데이터 저장
- **백업/복원**: 설정 메뉴에서 JSON 파일로 데이터 내보내기/가져오기 가능
- **게스트 데이터 마이그레이션**: 게스트로 사용하다가 로그인하면 기존 데이터를 계정으로 이전 가능

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

<img width="2816" height="1536" alt="Image" src="https://github.com/user-attachments/assets/710e6bf4-27ce-4705-9348-f8365ccefdb6" />

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

## 📱 주요 화면

### 매매 일지
- 시간순 매매 기록 피드
- 월별 그룹핑 및 필터링
- 차트 이미지 첨부 및 메모

### 통계 대시보드
- 종목별/태그별/전략별 성과 분석
- 일별/월별 수익률 차트
- 요일별 패턴 및 보유 기간 분석

### 시장 일기
- 캘린더 뷰로 일별 기록 관리
- 해당 날짜의 매매 내역 연동

### 설정
- 매매 전략 관리
- 데이터 백업/복원
- 리스크 관리 설정

## 💡 사용 팁

1. **매매 전 전략 수립**: 설정에서 나만의 매매 전략을 등록하고 거래 시 선택
2. **태그 활용**: 섹터, 테마, 매매 유형 등으로 태그를 만들어 분류
3. **차트 첨부**: 매매 시점의 차트를 캡처하여 첨부하면 나중에 복기할 때 유용
4. **리스크 관리**: 일일 손실 한도를 설정하여 감정적 매매 방지
5. **정기적인 복기**: 통계 대시보드에서 패턴을 분석하고 개선점 발견

## 📧 문의 및 피드백

서비스 이용 중 문제가 발생하거나 개선 아이디어가 있으시면 GitHub Issues를 통해 알려주세요.

---
