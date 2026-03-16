# Python AI 마이크로서비스 설계

**날짜**: 2026-03-16
**프로젝트**: stock-journal
**목적**: 포트폴리오 강화 (풀스택 + AI, 6개월 내 이직 목표)

---

## 1. 배경 및 목표

### 현재 상태
- Next.js `/api/ai-analysis` 라우트가 Gemini API를 직접 호출
- 거래 통계/패턴 계산은 TypeScript (`useTradeAnalysis` 훅)에서 처리
- 기술적 지표(RSI, MACD 등) 미지원

### 목표
- AI 분석 로직을 Python FastAPI 마이크로서비스로 분리
- **Python 서비스의 역할**: 기술지표 계산(새 기능) + Gemini 리포트 생성
- **TypeScript 유지**: 복잡한 거래 통계(`useTradeAnalysis`) 는 그대로 유지 → Python에 전달
- 모노레포 구조로 Next.js + Python 함께 관리
- Docker Compose로 로컬 개발, Railway로 클라우드 배포

### 범위 제외 (v1)
- Python에서 거래 통계 재구현 (TypeScript `useTradeAnalysis` 유지)
- `/analyze/patterns` 엔드포인트 (v2에서 추가)
- Next.js 서비스의 Docker 컨테이너화

---

## 2. 아키텍처

```
[Browser]
    │
    ▼
[Next.js App]
    ├── useTradeAnalysis (TypeScript) ← 거래 통계 계산 (기존 유지)
    │
    └── /api/ai-analysis ──► [Python FastAPI: ai-service]
                                  ├── POST /analyze/weekly
                                  │     1. TradeAnalysis + raw trades 수신
                                  │     2. yfinance로 주가 조회
                                  │     3. pandas로 기술지표(RSI, MACD) 계산
                                  │     4. Gemini 리포트 생성 (기술지표 포함)
                                  │     5. 결과 반환
                                  ├── POST /analyze/trade-review
                                  │     1. 단일 거래 정보 수신
                                  │     2. Gemini 리포트 생성
                                  │     3. 결과 반환
                                  └── GET  /health
```

### 데이터 흐름
1. 브라우저 → Next.js `/api/ai-analysis` 호출 (JWT 포함)
2. Next.js: JWT 검증 + 코인 차감 (인증 사용자만, 게스트는 스킵)
3. Next.js → Python 서비스 프록시 (최대 30초 타임아웃)
4. Python 서비스: 기술지표 계산 + Gemini 호출
5. Python 서비스 실패 / 타임아웃 시: Next.js가 코인 자동 반환
6. 결과 반환 → Next.js → 브라우저

---

## 3. 디렉토리 구조

```
stock-journal/              ← 기존 Next.js 프로젝트
├── app/api/ai-analysis/
│   └── route.ts            ← Python 서비스로 프록시하도록 내부 수정
├── .env.local              ← AI_SERVICE_URL=http://localhost:8000 추가
├── docker-compose.yml      ← ai-service 컨테이너만 추가
│
ai-service/                 ← 신규 Python 프로젝트 (모노레포)
├── main.py                 ← FastAPI 앱 진입점
├── routers/
│   ├── analyze.py          ← /analyze/weekly, /analyze/trade-review
│   └── health.py           ← GET /health
├── services/
│   ├── indicator.py        ← yfinance 주가 조회 + pandas 기술지표 계산
│   └── gemini.py           ← Gemini API 호출
├── schemas/
│   └── trade.py            ← Pydantic 입출력 모델
├── Dockerfile
└── requirements.txt
```

---

## 4. API 계약

### GET /health
```json
{ "status": "ok" }
```

---

### POST /analyze/weekly

**Request** (Next.js → Python)

Next.js가 이미 계산한 `TradeAnalysis` 객체 + 기술지표 계산용 종목 목록 전달.
camelCase → snake_case 변환은 Next.js 프록시 레이어에서 처리.

```json
{
  "analysis": {
    "profile": {
      "total_trades": 24,
      "win_rate": 62.5,
      "avg_return": 1.8,
      "profit_factor": 1.8,
      "max_drawdown_percent": 12.3,
      "avg_holding_days": 5.2,
      "consistency_score": 72,
      "trading_style_label": "스윙 트레이더",
      "risk_level_label": "중간",
      "overall_grade": "B+"
    },
    "advanced_metrics": {
      "rr_ratio": 1.4,
      "expectancy": 0.23,
      "volatility": 3.2,
      "sharpe_proxy": 0.87,
      "bias_score": {
        "bias_score": 68,
        "fomo_ratio": 0.12,
        "revenge_ratio": 0.05,
        "impulsive_ratio": 0.08,
        "over_trading_days": 2,
        "consecutive_loss_entry": 1
      },
      "timing": {
        "avg_win_holding_days": 7.2,
        "avg_loss_holding_days": 3.1,
        "holding_edge": 4.1,
        "early_exit_ratio": 0.25
      },
      "rr_ratio_benchmark": "fair",
      "expectancy_benchmark": "positive"
    },
    "weekday_stats": [...],
    "emotion_stats": [...],
    "strategy_stats": [...],
    "insights": [...],
    "streaks": { "current_win": 2, "current_loss": 0 },
    "holding_period_stats": [...],
    "concentration": [...]
  },
  "symbols": ["AAPL", "TSLA"],
  "username": "홍길동"
}
```

**Response (성공)**
```json
{
  "report": "## 📊 핵심 성과 지표...",
  "indicators": {
    "AAPL": { "rsi": 54.2, "macd": 0.31, "signal": "NEUTRAL" },
    "TSLA": { "rsi": 71.8, "macd": -0.12, "signal": "OVERBOUGHT" }
  },
  "generated_at": "2024-01-20T10:30:00Z"
}
```

> 기술지표: yfinance로 최근 60일 OHLCV 조회 → pandas로 RSI(14), MACD(12,26,9) 계산.
> yfinance 조회 실패 시 indicators 필드를 빈 객체 `{}`로 반환 (리포트는 계속 생성).

**Response (에러)**
```json
{
  "error": "GEMINI_UNAVAILABLE",
  "message": "Gemini API 호출 실패"
}
```

---

### POST /analyze/trade-review

**Request**

Next.js의 `RoundTrip` 타입을 snake_case로 직렬화하여 전달.

```json
{
  "symbol": "AAPL",
  "symbol_name": "Apple Inc.",
  "entry_date": "2024-01-10",
  "exit_date": "2024-01-15",
  "entry_price": 145.0,
  "exit_price": 152.0,
  "holding_days": 5,
  "pnl": 70000,
  "pnl_percent": 4.83,
  "is_win": true,
  "emotion_tag": "FOMO",
  "strategy_name": "모멘텀"
}
```

**Response (성공)**
```json
{
  "report": "## 📋 한 줄 평...",
  "generated_at": "2024-01-20T10:30:00Z"
}
```

**Response (에러)**
```json
{
  "error": "GEMINI_UNAVAILABLE",
  "message": "Gemini API 호출 실패"
}
```

---

## 5. Next.js 프록시 동작

```
상황                        →  처리
──────────────────────────────────────────────────────
Python 200 OK              →  코인 차감 유지, 결과 반환
Python 에러 응답            →  코인 자동 반환, 500 반환
Python 30초 타임아웃        →  코인 자동 반환, 504 반환
게스트 사용자 (user=null)   →  코인 로직 스킵, 프록시만 수행
```

camelCase → snake_case 변환: Next.js 프록시에서 JSON 직렬화 시 처리.

---

## 6. 기술 스택

| 역할 | 라이브러리 | 버전 |
|------|-----------|------|
| 웹 프레임워크 | fastapi | 0.115.x |
| 데이터 처리 | pandas | 2.2.x |
| 수치 계산 | numpy | 1.26.x |
| 기술지표 계산 | pandas (직접 구현) | - |
| 주가 데이터 | yfinance | 0.2.x |
| 입출력 검증 | pydantic | v2 (fastapi 내장) |
| AI 호출 | google-generativeai | 0.8.x |
| ASGI 서버 | uvicorn | 0.30.x |

> **기술지표 구현 방식**: pandas-ta는 pandas 2.x와 설치 충돌 문제가 있어 제외.
> RSI와 MACD를 pandas로 직접 구현 (공식 수식 사용, 30~40줄 수준).
> 이는 오히려 지표 원리를 이해하는 좋은 학습 기회.

---

## 7. 개발 환경

### 로컬 (Docker Compose - ai-service만)
```yaml
# docker-compose.yml
services:
  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    volumes:
      - ./ai-service:/app
```

- Next.js는 기존대로 `npm run dev` 별도 실행
- `.env.local`에 `AI_SERVICE_URL=http://localhost:8000` 추가

### 배포 (Railway)
- `ai-service/` 폴더를 Railway 서비스로 연결
- GitHub push → 자동 배포
- Next.js `.env.local`의 `AI_SERVICE_URL`을 Railway URL로 변경

---

## 8. 구현 순서

1. `ai-service/` FastAPI 프로젝트 셋업 + GET `/health` 엔드포인트
2. Pydantic 스키마 정의 (`schemas/trade.py`)
3. `services/indicator.py` — yfinance 주가 조회 + pandas RSI/MACD 계산
4. `services/gemini.py` — Gemini API 호출 구현
5. `routers/analyze.py` — weekly, trade-review 엔드포인트 조합
6. Next.js `route.ts` 프록시 연결 (camelCase→snake_case 변환 포함)
7. `docker-compose.yml` 작성 + 통합 테스트
8. Railway 배포
