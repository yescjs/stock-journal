# Python AI 마이크로서비스 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** stock-journal에 Python FastAPI 마이크로서비스(`ai-service/`)를 추가하여 기술지표 계산(RSI, MACD)과 Gemini AI 리포트 생성을 담당하게 한다.

**Architecture:** Next.js `/api/ai-analysis` 라우트가 Python FastAPI 서비스로 요청을 프록시. Python 서비스는 yfinance로 주가 데이터를 조회하고 pandas로 RSI/MACD를 직접 계산한 뒤 Gemini API로 리포트를 생성한다. TypeScript의 거래 통계 계산(`useTradeAnalysis`)은 그대로 유지한다.

**Tech Stack:** Python 3.11, FastAPI 0.115, pandas 2.2, numpy 1.26, yfinance 0.2, google-generativeai 0.8, pytest, Docker, Railway

**Spec:** `docs/superpowers/specs/2026-03-16-python-ai-microservice-design.md`

---

## 파일 구조 (전체)

### 신규 생성
```
ai-service/
├── main.py                    ← FastAPI 앱 진입점, 라우터 등록
├── requirements.txt           ← Python 의존성 목록
├── Dockerfile                 ← 컨테이너 빌드 설정
├── .env.example               ← 환경변수 예시 (GEMINI_API_KEY)
├── routers/
│   ├── __init__.py
│   ├── health.py              ← GET /health
│   └── analyze.py            ← POST /analyze/weekly, /analyze/trade-review
├── services/
│   ├── __init__.py
│   ├── indicator.py           ← yfinance 주가 조회 + pandas RSI/MACD 계산
│   └── gemini.py              ← Gemini API 호출
├── schemas/
│   ├── __init__.py
│   └── trade.py               ← Pydantic 입출력 모델
└── tests/
    ├── __init__.py
    ├── test_health.py
    ├── test_indicator.py
    ├── test_gemini.py
    └── test_analyze.py

stock-journal/
├── docker-compose.yml         ← ai-service 컨테이너 설정 (신규)
```

### 수정
```
stock-journal/
├── app/api/ai-analysis/route.ts  ← Python 서비스 프록시로 내부 수정
└── .env.local                    ← AI_SERVICE_URL=http://localhost:8000 추가
```

---

## Chunk 1: 프로젝트 셋업 + Health 엔드포인트

> **개념 설명**
> - **FastAPI**: Python으로 REST API를 빠르게 만드는 프레임워크. Next.js의 API Routes와 유사
> - **uvicorn**: FastAPI를 실행하는 서버 (Node.js의 Express 서버 역할)
> - **가상환경(venv)**: 프로젝트별 Python 패키지를 격리하는 공간 (Node.js의 `node_modules`와 유사)
> - **pytest**: Python 테스트 프레임워크

### Task 1: requirements.txt + 가상환경 설정

**Files:**
- Create: `ai-service/requirements.txt`
- Create: `ai-service/.env.example`

- [ ] **Step 1: ai-service 디렉토리 생성**

```bash
mkdir ai-service
cd ai-service
```

- [ ] **Step 2: requirements.txt 작성**

`ai-service/requirements.txt`:
```
fastapi==0.115.6
uvicorn==0.30.6
pydantic==2.9.2
pandas==2.2.3
numpy==1.26.4
yfinance==0.2.50
google-generativeai==0.8.3
pytest==8.3.3
pytest-asyncio==0.24.0
python-dotenv==1.0.1
```

- [ ] **Step 3: .env.example 작성**

`ai-service/.env.example`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

- [ ] **Step 4: pytest.ini 작성 (테스트 경로 설정)**

`ai-service/pytest.ini`:
```ini
[pytest]
pythonpath = .
```

> **왜 필요한가?**: pytest가 `from main import app` 같은 임포트를 찾을 수 있도록
> 현재 디렉토리(`ai-service/`)를 Python 경로에 추가한다.
> 이 파일이 없으면 모든 테스트에서 `ModuleNotFoundError`가 발생한다.

- [ ] **Step 5: 가상환경 생성 및 패키지 설치**

```bash
# ai-service/ 디렉토리 안에서 실행
python -m venv venv

# Windows bash에서 가상환경 활성화
source venv/Scripts/activate

# 패키지 설치
pip install -r requirements.txt
```

> 성공 확인: `pip list`로 fastapi, pandas 등이 설치됐는지 확인

- [ ] **Step 6: .gitignore 설정 (venv 제외)**

`ai-service/.gitignore`:
```
venv/
__pycache__/
.env
*.pyc
.pytest_cache/
```

---

### Task 2: FastAPI 앱 진입점 + Health 엔드포인트

**Files:**
- Create: `ai-service/main.py`
- Create: `ai-service/routers/__init__.py`
- Create: `ai-service/routers/health.py`
- Create: `ai-service/tests/__init__.py`
- Create: `ai-service/tests/test_health.py`

- [ ] **Step 1: 테스트 먼저 작성 (TDD)**

`ai-service/tests/test_health.py`:
```python
# FastAPI 테스트는 TestClient를 사용한다
# TestClient는 실제 서버 없이 HTTP 요청을 시뮬레이션한다
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_returns_ok():
    """GET /health는 {"status": "ok"}를 반환해야 한다"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
# ai-service/ 에서 실행 (venv 활성화 상태)
pytest tests/test_health.py -v
```

예상 결과: `ModuleNotFoundError: No module named 'main'` (아직 main.py 없음)

- [ ] **Step 3: health 라우터 작성**

`ai-service/routers/__init__.py`: (빈 파일)
```python
```

`ai-service/routers/health.py`:
```python
# APIRouter: 라우트를 모듈별로 분리하는 FastAPI 기능
# Next.js의 app/api/ 폴더 구조와 유사한 개념
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    """서비스 상태 확인 엔드포인트"""
    return {"status": "ok"}
```

- [ ] **Step 4: FastAPI 앱 진입점 작성**

`ai-service/main.py`:
```python
# FastAPI 앱의 진입점
# Next.js의 app/ 폴더 전체와 유사한 역할
from fastapi import FastAPI
from routers import health

app = FastAPI(
    title="Stock Journal AI Service",
    description="주식 매매 일지 AI 분석 마이크로서비스",
    version="1.0.0",
)

# 라우터 등록 (Next.js의 app/api/ 라우트 등록과 유사)
app.include_router(health.router)
```

- [ ] **Step 5: 테스트 재실행 → 성공 확인**

```bash
pytest tests/test_health.py -v
```

예상 결과:
```
tests/test_health.py::test_health_returns_ok PASSED
```

- [ ] **Step 6: 서버 직접 실행하여 확인**

```bash
uvicorn main:app --reload --port 8000
```

브라우저에서 `http://localhost:8000/health` 접속 → `{"status":"ok"}` 확인
브라우저에서 `http://localhost:8000/docs` 접속 → Swagger 자동 문서 확인

- [ ] **Step 7: 커밋**

```bash
cd ..  # stock-journal 루트로 이동
git add ai-service/
git commit -m "feat(ai-service): FastAPI 프로젝트 셋업 및 health 엔드포인트 추가"
```

---

## Chunk 2: Pydantic 스키마 + 기술지표 서비스

> **개념 설명**
> - **Pydantic**: Python의 타입 검증 라이브러리. TypeScript의 타입/인터페이스와 동일한 역할
> - **pandas**: Python 데이터 분석 라이브러리. 표(DataFrame)로 데이터를 다룸
> - **RSI**: 주가의 과매수/과매도 상태를 0-100 사이 값으로 나타내는 지표
> - **MACD**: 단기/장기 이동평균의 차이로 추세 전환을 감지하는 지표
> - **yfinance**: Yahoo Finance API로 주가 데이터를 가져오는 Python 라이브러리

### Task 3: Pydantic 스키마 정의

**Files:**
- Create: `ai-service/schemas/__init__.py`
- Create: `ai-service/schemas/trade.py`

- [ ] **Step 1: schemas/__init__.py 생성** (빈 파일)

- [ ] **Step 2: Pydantic 스키마 작성**

`ai-service/schemas/trade.py`:
```python
# Pydantic v2의 BaseModel: TypeScript의 interface와 동일
# 모든 필드에 타입을 지정하면 자동으로 유효성 검사
from pydantic import BaseModel
from typing import Optional, Any


# ─── 거래 기본 모델 ──────────────────────────────────────────────────────────

class BiasScore(BaseModel):
    bias_score: float
    fomo_ratio: float
    revenge_ratio: float
    impulsive_ratio: float
    over_trading_days: int
    consecutive_loss_entry: int


class Timing(BaseModel):
    avg_win_holding_days: float
    avg_loss_holding_days: float
    holding_edge: float
    early_exit_ratio: float


class AdvancedMetrics(BaseModel):
    rr_ratio: float
    expectancy: float
    volatility: float
    sharpe_proxy: float
    bias_score: BiasScore
    timing: Timing
    rr_ratio_benchmark: str
    expectancy_benchmark: str


class Profile(BaseModel):
    total_trades: int
    win_rate: float
    avg_return: float
    profit_factor: float
    max_drawdown_percent: float
    avg_holding_days: float
    consistency_score: float
    trading_style_label: str
    risk_level_label: str
    overall_grade: str


class Streaks(BaseModel):
    current_win: int
    current_loss: int


class TradeAnalysis(BaseModel):
    profile: Profile
    advanced_metrics: AdvancedMetrics
    weekday_stats: list[Any] = []
    emotion_stats: list[Any] = []
    strategy_stats: list[Any] = []
    insights: list[Any] = []
    streaks: Streaks
    holding_period_stats: list[Any] = []
    concentration: list[Any] = []


# ─── 요청 모델 ───────────────────────────────────────────────────────────────

class WeeklyAnalysisRequest(BaseModel):
    analysis: TradeAnalysis
    symbols: list[str] = []
    username: Optional[str] = None


class TradeReviewRequest(BaseModel):
    symbol: str
    symbol_name: Optional[str] = None
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    holding_days: int
    pnl: float
    pnl_percent: float
    is_win: bool
    emotion_tag: Optional[str] = None
    strategy_name: Optional[str] = None


# ─── 응답 모델 ───────────────────────────────────────────────────────────────

class IndicatorResult(BaseModel):
    rsi: float
    macd: float
    signal: str  # "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL"


class WeeklyAnalysisResponse(BaseModel):
    report: str
    indicators: dict[str, IndicatorResult] = {}
    generated_at: str


class TradeReviewResponse(BaseModel):
    report: str
    generated_at: str


class ErrorResponse(BaseModel):
    error: str
    message: str
```

- [ ] **Step 3: 스키마 임포트 확인**

```bash
# Python 인터프리터로 임포트 테스트
python -c "from schemas.trade import WeeklyAnalysisRequest, TradeReviewRequest; print('스키마 임포트 성공')"
```

예상 결과: `스키마 임포트 성공`

- [ ] **Step 4: 커밋**

```bash
git add ai-service/schemas/
git commit -m "feat(ai-service): Pydantic 스키마 정의 (요청/응답 모델)"
```

---

### Task 4: 기술지표 서비스 (RSI + MACD)

**Files:**
- Create: `ai-service/services/__init__.py`
- Create: `ai-service/services/indicator.py`
- Create: `ai-service/tests/test_indicator.py`

- [ ] **Step 1: 테스트 먼저 작성**

`ai-service/tests/test_indicator.py`:
```python
import pandas as pd
import pytest
from services.indicator import calculate_rsi, calculate_macd, get_indicators


class TestCalculateRsi:
    def test_rising_prices_give_high_rsi(self):
        """꾸준히 상승하는 가격의 RSI는 70 이상이어야 한다"""
        prices = pd.Series([100 + i * 2 for i in range(30)])
        rsi = calculate_rsi(prices)
        assert rsi > 70

    def test_falling_prices_give_low_rsi(self):
        """꾸준히 하락하는 가격의 RSI는 30 이하여야 한다"""
        prices = pd.Series([200 - i * 2 for i in range(30)])
        rsi = calculate_rsi(prices)
        assert rsi < 30

    def test_rsi_is_between_0_and_100(self):
        """RSI 값은 항상 0~100 사이여야 한다"""
        import random
        random.seed(42)
        prices = pd.Series([random.uniform(50, 150) for _ in range(50)])
        rsi = calculate_rsi(prices)
        assert 0 <= rsi <= 100

    def test_rsi_requires_minimum_data(self):
        """데이터가 15개 미만이면 None을 반환해야 한다"""
        prices = pd.Series([100, 101, 102])
        result = calculate_rsi(prices)
        assert result is None


class TestCalculateMacd:
    def test_macd_returns_float_and_signal(self):
        """MACD는 (float, signal_string) 튜플을 반환해야 한다"""
        prices = pd.Series([100 + i * 0.5 for i in range(60)])
        macd_val, signal = calculate_macd(prices)
        assert isinstance(macd_val, float)
        assert signal in ("OVERBOUGHT", "OVERSOLD", "NEUTRAL")

    def test_macd_requires_minimum_data(self):
        """데이터가 27개 미만이면 None을 반환해야 한다"""
        prices = pd.Series([100, 101, 102])
        result = calculate_macd(prices)
        assert result is None


class TestGetIndicators:
    def test_returns_empty_dict_on_invalid_symbol(self):
        """존재하지 않는 종목 심볼이면 빈 딕셔너리를 반환해야 한다"""
        # yfinance를 mock하여 빈 DataFrame 반환 → 실제 네트워크 호출 없이 테스트
        import pandas as pd
        from unittest.mock import patch, MagicMock
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()  # 빈 DataFrame
        with patch("services.indicator.yf.Ticker", return_value=mock_ticker):
            result = get_indicators(["INVALID_SYMBOL_XYZ_999"])
        assert result == {}

    def test_empty_symbols_returns_empty_dict(self):
        """빈 심볼 목록이면 빈 딕셔너리를 반환해야 한다"""
        result = get_indicators([])
        assert result == {}
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_indicator.py -v
```

예상 결과: `ModuleNotFoundError: No module named 'services.indicator'`

- [ ] **Step 3: indicator.py 구현**

`ai-service/services/__init__.py`: (빈 파일)

`ai-service/services/indicator.py`:
```python
"""
기술지표 계산 서비스

RSI (Relative Strength Index): 과매수/과매도 판단 지표 (0~100)
  - 70 이상: 과매수 (OVERBOUGHT) — 조정 가능성
  - 30 이하: 과매도 (OVERSOLD) — 반등 가능성

MACD (Moving Average Convergence Divergence): 추세 전환 감지 지표
  - MACD선 = 단기EMA(12) - 장기EMA(26)
  - 시그널선 = MACD선의 EMA(9)
  - 히스토그램 = MACD선 - 시그널선 (양수: 상승 모멘텀, 음수: 하락 모멘텀)
"""
import pandas as pd
import numpy as np
import yfinance as yf
from typing import Optional


def calculate_rsi(prices: pd.Series, period: int = 14) -> Optional[float]:
    """
    RSI 계산 (pandas EWM 방식)

    Args:
        prices: 종가(Close) Series
        period: RSI 기간 (기본 14일)

    Returns:
        RSI 값 (0~100), 데이터 부족 시 None
    """
    if len(prices) < period + 1:
        return None

    delta = prices.diff()               # 전일 대비 변화량
    gain = delta.clip(lower=0)          # 상승분 (하락은 0으로)
    loss = -delta.clip(upper=0)         # 하락분 (상승은 0으로, 양수로 변환)

    # 지수가중이동평균(EWM): 최근 데이터에 더 높은 가중치
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()

    # 0으로 나누기 방지
    with np.errstate(divide='ignore', invalid='ignore'):
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))

    return float(rsi.iloc[-1])


def calculate_macd(
    prices: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> Optional[tuple[float, str]]:
    """
    MACD 히스토그램 계산

    Args:
        prices: 종가 Series
        fast: 단기 EMA 기간 (기본 12)
        slow: 장기 EMA 기간 (기본 26)
        signal: 시그널 EMA 기간 (기본 9)

    Returns:
        (히스토그램 값, 신호 문자열) 또는 None
    """
    if len(prices) < slow + signal:
        return None

    ema_fast = prices.ewm(span=fast, adjust=False).mean()   # 단기 이동평균
    ema_slow = prices.ewm(span=slow, adjust=False).mean()   # 장기 이동평균
    macd_line = ema_fast - ema_slow                          # MACD선
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()  # 시그널선
    histogram = float((macd_line - signal_line).iloc[-1])   # 히스토그램

    # RSI로 신호 판단
    rsi = calculate_rsi(prices)
    if rsi is None:
        sig = "NEUTRAL"
    elif rsi > 70:
        sig = "OVERBOUGHT"
    elif rsi < 30:
        sig = "OVERSOLD"
    else:
        sig = "NEUTRAL"

    return histogram, sig


def get_indicators(symbols: list[str]) -> dict:
    """
    여러 종목의 기술지표를 한 번에 계산

    yfinance로 최근 60일 종가 데이터를 가져와 RSI, MACD 계산.
    개별 종목 실패 시 해당 종목만 건너뜀 (전체 실패 방지).

    Args:
        symbols: 종목 코드 목록 (예: ["AAPL", "TSLA"])

    Returns:
        {symbol: {rsi, macd, signal}} 딕셔너리
    """
    if not symbols:
        return {}

    result = {}
    for symbol in symbols:
        try:
            ticker = yf.Ticker(symbol)
            # 최근 60일 일봉 데이터 조회
            hist = ticker.history(period="60d")

            if hist.empty or len(hist) < 30:
                continue

            prices = hist["Close"]
            rsi = calculate_rsi(prices)
            macd_result = calculate_macd(prices)

            if rsi is None or macd_result is None:
                continue

            macd_val, signal = macd_result
            result[symbol] = {
                "rsi": round(rsi, 2),
                "macd": round(macd_val, 4),
                "signal": signal,
            }
        except Exception:
            # 개별 종목 실패는 무시 (리포트 생성 계속)
            continue

    return result
```

- [ ] **Step 4: 테스트 재실행 → 성공 확인**

```bash
pytest tests/test_indicator.py -v
```

예상 결과:
```
tests/test_indicator.py::TestCalculateRsi::test_rising_prices_give_high_rsi PASSED
tests/test_indicator.py::TestCalculateRsi::test_falling_prices_give_low_rsi PASSED
tests/test_indicator.py::TestCalculateRsi::test_rsi_is_between_0_and_100 PASSED
tests/test_indicator.py::TestCalculateRsi::test_rsi_requires_minimum_data PASSED
tests/test_indicator.py::TestCalculateMacd::test_macd_returns_float_and_signal PASSED
tests/test_indicator.py::TestCalculateMacd::test_macd_requires_minimum_data PASSED
tests/test_indicator.py::TestGetIndicators::test_returns_empty_dict_on_invalid_symbol PASSED
tests/test_indicator.py::TestGetIndicators::test_empty_symbols_returns_empty_dict PASSED
```

> `test_returns_empty_dict_on_invalid_symbol`은 yfinance 네트워크 호출을 하므로
> 인터넷 연결이 필요함. 오프라인 환경이면 skip.

- [ ] **Step 5: 커밋**

```bash
git add ai-service/services/ ai-service/tests/test_indicator.py
git commit -m "feat(ai-service): RSI/MACD 기술지표 계산 서비스 추가"
```

---

## Chunk 3: Gemini 서비스 + analyze 라우터

> **개념 설명**
> - **unittest.mock**: Python 내장 모킹 라이브러리. 테스트에서 실제 API 호출 대신 가짜 응답을 반환
> - **@pytest.fixture**: 테스트에서 반복 사용하는 설정을 재사용하는 방법

### Task 5: Gemini 서비스

**Files:**
- Create: `ai-service/services/gemini.py`
- Create: `ai-service/tests/test_gemini.py`

- [ ] **Step 1: 테스트 먼저 작성**

`ai-service/tests/test_gemini.py`:
```python
from unittest.mock import patch, MagicMock
import pytest
from services.gemini import call_gemini, build_weekly_prompt, build_trade_review_prompt
from schemas.trade import TradeAnalysis, Profile, AdvancedMetrics, BiasScore, Timing, Streaks


def make_sample_analysis() -> TradeAnalysis:
    """테스트용 TradeAnalysis 샘플 데이터"""
    return TradeAnalysis(
        profile=Profile(
            total_trades=10,
            win_rate=60.0,
            avg_return=1.5,
            profit_factor=1.8,
            max_drawdown_percent=8.0,
            avg_holding_days=5.0,
            consistency_score=70.0,
            trading_style_label="스윙",
            risk_level_label="중간",
            overall_grade="B",
        ),
        advanced_metrics=AdvancedMetrics(
            rr_ratio=1.4,
            expectancy=0.2,
            volatility=2.5,
            sharpe_proxy=0.8,
            bias_score=BiasScore(
                bias_score=65,
                fomo_ratio=0.1,
                revenge_ratio=0.05,
                impulsive_ratio=0.08,
                over_trading_days=1,
                consecutive_loss_entry=0,
            ),
            timing=Timing(
                avg_win_holding_days=6.0,
                avg_loss_holding_days=3.0,
                holding_edge=3.0,
                early_exit_ratio=0.2,
            ),
            rr_ratio_benchmark="fair",
            expectancy_benchmark="positive",
        ),
        streaks=Streaks(current_win=2, current_loss=0),
    )


class TestBuildWeeklyPrompt:
    def test_prompt_contains_win_rate(self):
        """주간 프롬프트에 승률이 포함되어야 한다"""
        analysis = make_sample_analysis()
        prompt = build_weekly_prompt(analysis, username="테스트")
        assert "60.0" in prompt or "60%" in prompt

    def test_prompt_contains_username(self):
        """username이 있으면 프롬프트에 포함되어야 한다"""
        analysis = make_sample_analysis()
        prompt = build_weekly_prompt(analysis, username="홍길동")
        assert "홍길동" in prompt


class TestCallGemini:
    def test_calls_gemini_and_returns_text(self):
        """Gemini API를 호출하고 텍스트를 반환해야 한다"""
        mock_response = MagicMock()
        mock_response.text = "## 분석 리포트\n테스트 내용입니다."

        with patch("services.gemini.genai") as mock_genai:
            mock_model = MagicMock()
            mock_model.generate_content.return_value = mock_response
            mock_genai.GenerativeModel.return_value = mock_model

            result = call_gemini("시스템 프롬프트", "유저 프롬프트")

        assert result == "## 분석 리포트\n테스트 내용입니다."

    def test_raises_error_when_api_key_missing(self):
        """GEMINI_API_KEY가 없으면 ValueError를 발생시켜야 한다"""
        import os
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="GEMINI_API_KEY"):
                call_gemini("system", "user")
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_gemini.py -v
```

예상 결과: `ModuleNotFoundError: No module named 'services.gemini'`

- [ ] **Step 3: gemini.py 구현**

`ai-service/services/gemini.py`:
```python
"""
Gemini API 호출 서비스

현재 Next.js route.ts의 callGeminiAPI() + 프롬프트 빌더를 Python으로 이전.
"""
import os
import google.generativeai as genai
from schemas.trade import TradeAnalysis, TradeReviewRequest

# ─── 시스템 프롬프트 ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """당신은 월스트리트 헤지펀드에서 10년 이상 트레이딩 코치로 활동한 전문 투자 코치입니다.
사용자의 매매 데이터를 심층 분석하고, 전문적이고 실행 가능한 피드백을 한국어로 제공합니다.

반드시 지켜야 할 규칙:
1. 응답은 항상 **마크다운** 형식으로, 볼드/이탤릭을 활용하여 가독성 높게 작성합니다
2. 이모지는 ## 레벨의 대분류 헤딩에만 사용합니다
3. 분석은 데이터에 근거해야 하며, 데이터가 없는 부분은 추측하지 않습니다
4. 승률, 수익률, 수익 팩터, R:R 비율, Expectancy 등 핵심 수치를 인용하고 의미를 해석합니다
5. 투자 권유나 특정 종목 추천은 절대 하지 않습니다
6. 정중한 존댓말을 사용하면서도 프로페셔널한 톤을 유지합니다
7. 응답은 2000-3000자 분량으로 충분히 상세하게 작성합니다"""


# ─── Gemini API 호출 ─────────────────────────────────────────────────────────

def call_gemini(system_prompt: str, user_prompt: str) -> str:
    """
    Gemini API 호출

    Args:
        system_prompt: AI 역할과 규칙 정의
        user_prompt: 분석할 데이터

    Returns:
        생성된 리포트 텍스트

    Raises:
        ValueError: API 키 미설정 시
        RuntimeError: API 호출 실패 시
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt,
    )

    response = model.generate_content(user_prompt)
    if not response.text:
        raise RuntimeError("Gemini API에서 유효한 응답을 받지 못했습니다.")

    return response.text


# ─── 프롬프트 빌더 ───────────────────────────────────────────────────────────

def build_weekly_prompt(analysis: TradeAnalysis, username: str | None = None) -> str:
    """주간 리포트용 프롬프트 생성"""
    p = analysis.profile
    am = analysis.advanced_metrics
    bs = am.bias_score
    t = am.timing

    prefix = f"투자자 {username}의 " if username else ""

    return f"""{prefix}매매 분석 리포트를 작성해주세요.

## 기본 성과 지표
- 완결된 총 거래: {p.total_trades}건
- 승률: {p.win_rate:.1f}%
- 평균 수익률: {p.avg_return:+.1f}%
- 수익 팩터: {p.profit_factor:.2f}
- 최대 낙폭: -{p.max_drawdown_percent:.1f}%
- 평균 보유 기간: {p.avg_holding_days:.0f}일
- 투자 스타일: {p.trading_style_label}
- 종합 등급: {p.overall_grade}

## 고급 지표
- R:R 비율: {am.rr_ratio:.2f} ({am.rr_ratio_benchmark})
- Expectancy: {am.expectancy:.2f}% ({am.expectancy_benchmark})
- Sharpe 유사지표: {am.sharpe_proxy:.2f}
- 심리 편향 점수: {bs.bias_score:.0f}/100
  - FOMO 비율: {bs.fomo_ratio * 100:.0f}%
  - 복수매매 비율: {bs.revenge_ratio * 100:.0f}%
  - 충동매매 비율: {bs.impulsive_ratio * 100:.0f}%

## 타이밍 분석
- 수익 거래 평균 보유일: {t.avg_win_holding_days:.1f}일
- 손실 거래 평균 보유일: {t.avg_loss_holding_days:.1f}일
- 조기 청산 비율: {t.early_exit_ratio * 100:.0f}%

위 데이터를 바탕으로 다음 섹션으로 리포트를 작성해주세요:
## 📊 핵심 성과 지표 / ## 🧠 심리 패턴 진단 / ## ⚖️ 리스크 관리 평가
## ⏱️ 타이밍 능력 분석 / ## 🏆 이번 기간 잘한 점 / ## ⚠️ 핵심 개선 포인트
## ✅ 다음 거래 전 체크리스트 (- [ ] 형식, 현재 수치 괄호 병기)"""


def build_trade_review_prompt(trade: TradeReviewRequest) -> str:
    """개별 거래 리뷰용 프롬프트 생성"""
    holding = "당일 거래" if trade.holding_days == 0 else f"{trade.holding_days}일 보유"
    result = "수익" if trade.is_win else "손실"
    symbol_display = trade.symbol_name or trade.symbol

    return f"""다음 완결된 매매 1건에 대한 전문 코치의 상세한 거래 리뷰를 작성해주세요.

## 거래 정보
- 종목: {symbol_display}
- 매수일: {trade.entry_date} / 매수가: {trade.entry_price:,.0f}
- 매도일: {trade.exit_date} / 매도가: {trade.exit_price:,.0f}
- 보유 기간: {holding}
- 결과: {result} ({trade.pnl_percent:+.2f}%, {trade.pnl:+,.0f}원)
{f'- 진입 심리: {trade.emotion_tag}' if trade.emotion_tag else ''}
{f'- 적용 전략: {trade.strategy_name}' if trade.strategy_name else ''}

400-600자 분량으로 다음 구조로 리뷰를 작성해주세요:
## 📋 한 줄 평 / ## ✅ 잘한 점 / ## ⚠️ 개선 포인트 / ## 🎯 다음 거래 제안"""
```

- [ ] **Step 4: 테스트 재실행 → 성공 확인**

```bash
pytest tests/test_gemini.py -v
```

예상 결과:
```
tests/test_gemini.py::TestBuildWeeklyPrompt::test_prompt_contains_win_rate PASSED
tests/test_gemini.py::TestBuildWeeklyPrompt::test_prompt_contains_username PASSED
tests/test_gemini.py::TestCallGemini::test_calls_gemini_and_returns_text PASSED
tests/test_gemini.py::TestCallGemini::test_raises_error_when_api_key_missing PASSED
```

- [ ] **Step 5: 커밋**

```bash
git add ai-service/services/gemini.py ai-service/tests/test_gemini.py
git commit -m "feat(ai-service): Gemini API 서비스 및 프롬프트 빌더 추가"
```

---

### Task 6: analyze 라우터

**Files:**
- Create: `ai-service/routers/analyze.py`
- Create: `ai-service/tests/test_analyze.py`

- [ ] **Step 1: 테스트 먼저 작성**

`ai-service/tests/test_analyze.py`:
```python
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 테스트용 weekly 요청 데이터
SAMPLE_WEEKLY_REQUEST = {
    "analysis": {
        "profile": {
            "total_trades": 10, "win_rate": 60.0, "avg_return": 1.5,
            "profit_factor": 1.8, "max_drawdown_percent": 8.0,
            "avg_holding_days": 5.0, "consistency_score": 70.0,
            "trading_style_label": "스윙", "risk_level_label": "중간",
            "overall_grade": "B",
        },
        "advanced_metrics": {
            "rr_ratio": 1.4, "expectancy": 0.2, "volatility": 2.5,
            "sharpe_proxy": 0.8,
            "bias_score": {
                "bias_score": 65, "fomo_ratio": 0.1, "revenge_ratio": 0.05,
                "impulsive_ratio": 0.08, "over_trading_days": 1,
                "consecutive_loss_entry": 0,
            },
            "timing": {
                "avg_win_holding_days": 6.0, "avg_loss_holding_days": 3.0,
                "holding_edge": 3.0, "early_exit_ratio": 0.2,
            },
            "rr_ratio_benchmark": "fair", "expectancy_benchmark": "positive",
        },
        "streaks": {"current_win": 2, "current_loss": 0},
    },
    "symbols": ["AAPL"],
    "username": "테스트",
}

SAMPLE_TRADE_REVIEW_REQUEST = {
    "symbol": "AAPL",
    "symbol_name": "Apple Inc.",
    "entry_date": "2024-01-10",
    "exit_date": "2024-01-15",
    "entry_price": 145.0,
    "exit_price": 152.0,
    "holding_days": 5,
    "pnl": 70000,
    "pnl_percent": 4.83,
    "is_win": True,
    "emotion_tag": "FOMO",
    "strategy_name": "모멘텀",
}


class TestWeeklyAnalysis:
    def test_weekly_analysis_success(self):
        """주간 분석 요청이 성공하면 report와 generated_at을 반환해야 한다"""
        with patch("routers.analyze.call_gemini") as mock_gemini, \
             patch("routers.analyze.get_indicators") as mock_indicators:
            mock_gemini.return_value = "## 리포트 내용"
            mock_indicators.return_value = {
                "AAPL": {"rsi": 54.2, "macd": 0.31, "signal": "NEUTRAL"}
            }

            response = client.post("/analyze/weekly", json=SAMPLE_WEEKLY_REQUEST)

        assert response.status_code == 200
        data = response.json()
        assert "report" in data
        assert "generated_at" in data
        assert data["report"] == "## 리포트 내용"

    def test_weekly_analysis_gemini_failure_returns_500(self):
        """Gemini 실패 시 500과 에러 메시지를 반환해야 한다"""
        with patch("routers.analyze.call_gemini") as mock_gemini, \
             patch("routers.analyze.get_indicators") as mock_indicators:
            mock_gemini.side_effect = RuntimeError("Gemini 연결 실패")
            mock_indicators.return_value = {}

            response = client.post("/analyze/weekly", json=SAMPLE_WEEKLY_REQUEST)

        assert response.status_code == 500
        assert response.json()["error"] == "GEMINI_UNAVAILABLE"

    def test_weekly_indicators_failure_still_returns_report(self):
        """기술지표 계산 실패해도 리포트는 반환해야 한다"""
        with patch("routers.analyze.call_gemini") as mock_gemini, \
             patch("routers.analyze.get_indicators") as mock_indicators:
            mock_gemini.return_value = "## 리포트 내용"
            mock_indicators.side_effect = Exception("yfinance 오류")

            response = client.post("/analyze/weekly", json=SAMPLE_WEEKLY_REQUEST)

        assert response.status_code == 200
        assert response.json()["indicators"] == {}


class TestTradeReview:
    def test_trade_review_success(self):
        """거래 리뷰 요청이 성공하면 report를 반환해야 한다"""
        with patch("routers.analyze.call_gemini") as mock_gemini:
            mock_gemini.return_value = "## 📋 한 줄 평\n좋은 거래입니다."

            response = client.post("/analyze/trade-review", json=SAMPLE_TRADE_REVIEW_REQUEST)

        assert response.status_code == 200
        assert "report" in response.json()

    def test_trade_review_gemini_failure(self):
        """Gemini 실패 시 500을 반환해야 한다"""
        with patch("routers.analyze.call_gemini") as mock_gemini:
            mock_gemini.side_effect = RuntimeError("API 실패")

            response = client.post("/analyze/trade-review", json=SAMPLE_TRADE_REVIEW_REQUEST)

        assert response.status_code == 500
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
pytest tests/test_analyze.py -v
```

예상 결과: `404 Not Found` (라우터 미등록)

- [ ] **Step 3: analyze 라우터 작성**

`ai-service/routers/analyze.py`:
```python
"""
분석 라우터

POST /analyze/weekly      - 주간 AI 리포트
POST /analyze/trade-review - 개별 거래 리뷰
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.trade import WeeklyAnalysisRequest, TradeReviewRequest
from services.indicator import get_indicators
from services.gemini import call_gemini, build_weekly_prompt, build_trade_review_prompt, SYSTEM_PROMPT

router = APIRouter(prefix="/analyze")


@router.post("/weekly")
def weekly_analysis(body: WeeklyAnalysisRequest):
    """
    주간 AI 분석 리포트 생성

    1. yfinance로 종목별 기술지표(RSI, MACD) 계산
    2. Gemini로 AI 리포트 생성
    """
    # 기술지표 계산 (실패해도 리포트는 계속 생성)
    indicators = {}
    try:
        indicators = get_indicators(body.symbols)
    except Exception:
        pass  # 지표 실패는 소프트 실패 — 빈 딕셔너리로 진행

    # Gemini 리포트 생성
    try:
        prompt = build_weekly_prompt(body.analysis, body.username)
        report = call_gemini(SYSTEM_PROMPT, prompt)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "GEMINI_UNAVAILABLE", "message": str(e)},
        )

    return {
        "report": report,
        "indicators": indicators,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/trade-review")
def trade_review(body: TradeReviewRequest):
    """
    개별 거래 AI 리뷰 생성
    """
    try:
        prompt = build_trade_review_prompt(body)
        report = call_gemini(SYSTEM_PROMPT, prompt)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "GEMINI_UNAVAILABLE", "message": str(e)},
        )

    return {
        "report": report,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
```

- [ ] **Step 4: main.py에 analyze 라우터 등록**

`ai-service/main.py`:
```python
from fastapi import FastAPI
from routers import health, analyze  # analyze 추가

app = FastAPI(
    title="Stock Journal AI Service",
    description="주식 매매 일지 AI 분석 마이크로서비스",
    version="1.0.0",
)

app.include_router(health.router)
app.include_router(analyze.router)  # 추가
```

- [ ] **Step 5: 테스트 전체 실행 → 성공 확인**

```bash
pytest tests/ -v
```

예상 결과: 모든 테스트 PASSED

- [ ] **Step 6: 커밋**

```bash
git add ai-service/routers/analyze.py ai-service/tests/test_analyze.py ai-service/main.py
git commit -m "feat(ai-service): analyze 라우터 추가 (weekly, trade-review)"
```

---

## Chunk 4: Next.js 프록시 + Docker + 배포

### Task 7: Next.js route.ts 프록시 수정

**Files:**
- Modify: `app/api/ai-analysis/route.ts`
- Modify: `.env.local`

> **개념 설명**
> - **camelCase → snake_case 변환**: TypeScript는 camelCase(`winRate`), Python은 snake_case(`win_rate`) 관례
> - 변환 유틸리티 함수로 JSON 객체 키를 일괄 변환

- [ ] **Step 1: .env.local에 AI_SERVICE_URL 추가**

`.env.local`에 다음 줄 추가:
```
AI_SERVICE_URL=http://localhost:8000
```

- [ ] **Step 2: route.ts 전체 교체**

> 기존 파일을 아래 내용으로 **전체 교체**한다.
> 변경 포인트: Gemini 직접 호출 로직 제거 → Python 서비스 프록시로 교체.
> 프롬프트 빌더, mock 모드, GEMINI_MODELS 상수는 모두 제거 (Python 서비스가 담당).
> 코인 차감/반환 로직, 인증 로직은 그대로 유지.

`app/api/ai-analysis/route.ts` 전체 내용:
```typescript
// POST /api/ai-analysis
// Python AI 서비스로 요청을 프록시. 인증 및 코인 차감은 여기서 처리.
import { NextRequest, NextResponse } from 'next/server';
import { TradeAnalysis, RoundTrip } from '@/app/types/analysis';
import { COIN_COSTS } from '@/app/types/coins';
import { getAuthUser, createAuthedClient } from '@/app/lib/supabaseServerAuth';

// ─── Request / Response Types ─────────────────────────────────────────────

interface WeeklyReportRequest {
  type: 'weekly_report';
  analysis: TradeAnalysis;
  username?: string;
}

interface TradeReviewRequest {
  type: 'trade_review';
  roundTrip: RoundTrip;
}

type AIAnalysisRequest = WeeklyReportRequest | TradeReviewRequest;

interface AIAnalysisResponse {
  report: string;
  generatedAt: string;
}

// ─── camelCase → snake_case 변환 ──────────────────────────────────────────
// Python 서버는 snake_case 관례를 사용하므로 키를 변환해서 전달

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function convertKeysToSnakeCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toSnakeCase(k),
        convertKeysToSnakeCase(v),
      ])
    );
  }
  return obj;
}

// ─── Python AI 서비스 호출 ────────────────────────────────────────────────

async function callAIService(body: AIAnalysisRequest): Promise<string> {
  const aiServiceUrl = process.env.AI_SERVICE_URL;
  if (!aiServiceUrl) {
    throw new Error('AI_SERVICE_URL 환경변수가 설정되지 않았습니다. .env.local을 확인하세요.');
  }

  const endpoint = body.type === 'weekly_report'
    ? '/analyze/weekly'
    : '/analyze/trade-review';

  let requestData: unknown;
  if (body.type === 'weekly_report') {
    // roundTrips에서 고유 종목 심볼 추출 (기술지표 계산용)
    const symbols = [...new Set((body.analysis.roundTrips ?? []).map((r) => r.symbol))];
    requestData = convertKeysToSnakeCase({
      analysis: body.analysis,
      symbols,
      username: body.username,
    });
  } else {
    requestData = convertKeysToSnakeCase(body.roundTrip);
  }

  // 30초 타임아웃 설정
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${aiServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'AI 서비스 오류' }));
      throw new Error(err.message || `AI 서비스 오류 (${res.status})`);
    }

    const data = await res.json();
    return data.report as string;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<AIAnalysisResponse | { error: string }>> {
  try {
    const body = (await req.json()) as AIAnalysisRequest;

    // 코인 차감 로직 (인증 사용자만)
    const { user } = await getAuthUser(req);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabase = token ? createAuthedClient(token) : null;

    const cost = body.type === 'weekly_report' ? COIN_COSTS.weekly_report : COIN_COSTS.trade_review;
    let coinDeducted = false;

    if (user && supabase) {
      const { error: deductError } = await supabase.rpc('deduct_coins', {
        p_user_id: user.id,
        p_amount: cost,
        p_ref_type: body.type,
        p_ref_id: null,
      });

      if (deductError) {
        if (deductError.message.includes('INSUFFICIENT_COINS')) {
          return NextResponse.json({ error: 'INSUFFICIENT_COINS' }, { status: 402 });
        }
        return NextResponse.json({ error: 'Coin deduction failed' }, { status: 500 });
      }
      coinDeducted = true;
    }

    try {
      const report = await callAIService(body);
      return NextResponse.json({
        report,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // AI 실패 시 코인 반환
      if (coinDeducted && user && supabase) {
        await supabase.rpc('add_coins', {
          p_user_id: user.id,
          p_amount: cost,
          p_type: 'refund',
          p_ref_type: body.type,
          p_ref_id: null,
        });
      }
      throw err;
    }
  } catch (err) {
    console.error('AI analysis error:', err);
    const message = err instanceof Error ? err.message : '서버 오류가 발생했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: 로컬 통합 테스트**

```bash
# 터미널 1: Python 서비스 실행
cd ai-service
source venv/Scripts/activate
GEMINI_API_KEY=your_key uvicorn main:app --reload --port 8000

# 터미널 2: Next.js 실행
npm run dev

# 브라우저에서 stock-journal 접속 → AI 리포트 생성 테스트
```

- [ ] **Step 4: 커밋**

```bash
git add app/api/ai-analysis/route.ts .env.local
git commit -m "feat: AI 분석 라우트를 Python 마이크로서비스로 프록시 연결"
```

---

### Task 8: Dockerfile + Docker Compose

**Files:**
- Create: `ai-service/Dockerfile`
- Create: `docker-compose.yml` (stock-journal 루트)

- [ ] **Step 1: Dockerfile 작성**

`ai-service/Dockerfile`:
```dockerfile
# Python 3.11 슬림 이미지 (불필요한 패키지 제거된 경량 버전)
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 먼저 복사 (캐시 최적화: 코드 변경 시 재설치 불필요)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 서버 실행 (--reload 제거: 프로덕션 모드)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: docker-compose.yml 작성**

`docker-compose.yml` (stock-journal 루트):
```yaml
# Docker Compose: 여러 컨테이너를 한 번에 관리하는 도구
# 지금은 ai-service 하나만 관리
services:
  ai-service:
    build: ./ai-service
    ports:
      - "8000:8000"           # 호스트:컨테이너 포트 매핑
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}  # 루트의 .env 파일에서 자동으로 읽음 (.env.local 아님)
    volumes:
      - ./ai-service:/app     # 로컬 파일 → 컨테이너 실시간 동기화 (개발용)
```

- [ ] **Step 3: 루트에 .env 파일 생성 (Docker Compose용)**

> Docker Compose는 `.env.local`이 아닌 `.env`를 읽는다.
> `.env.local`의 `GEMINI_API_KEY` 값을 루트 `.env`에도 추가.

루트 `.env` 파일 생성 또는 편집:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

> `.env`는 `.gitignore`에 이미 포함되어 있으므로 커밋되지 않는다.

- [ ] **Step 4: Docker로 실행 테스트**

```bash
# stock-journal 루트에서 실행
docker compose up --build

# 다른 터미널에서 health 확인
curl http://localhost:8000/health
# 예상 결과: {"status":"ok"}
```

- [ ] **Step 4: 커밋**

```bash
git add ai-service/Dockerfile docker-compose.yml
git commit -m "feat(ai-service): Dockerfile 및 Docker Compose 설정 추가"
```

---

### Task 9: Railway 배포

> **개념 설명**
> - **Railway**: GitHub 레포를 연결하면 push 시 자동 배포되는 클라우드 플랫폼
> - 무료 플랜으로 충분히 사용 가능 ($5 크레딧/월 제공)

**Files:**
- Create: `ai-service/railway.toml`

- [ ] **Step 1: railway.toml 작성**

`ai-service/railway.toml`:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
```

- [ ] **Step 2: Railway 프로젝트 생성**

1. [railway.app](https://railway.app) 접속 → GitHub 로그인
2. `New Project` → `Deploy from GitHub repo`
3. `stock-journal` 레포 선택
4. `ai-service/` 폴더를 루트 디렉토리로 지정
5. 환경변수 설정: `GEMINI_API_KEY=your_key`

- [ ] **Step 3: 배포 확인**

Railway 대시보드에서 배포 URL 확인 (예: `https://ai-service-xxx.up.railway.app`)

```bash
curl https://ai-service-xxx.up.railway.app/health
# 예상 결과: {"status":"ok"}
```

- [ ] **Step 4: Next.js 환경변수 업데이트**

`.env.local` (로컬) 또는 Vercel/Railway 환경변수:
```
AI_SERVICE_URL=https://ai-service-xxx.up.railway.app
```

- [ ] **Step 5: 최종 커밋**

```bash
git add ai-service/railway.toml
git commit -m "feat(ai-service): Railway 배포 설정 추가"
```

---

## 전체 테스트 명령

```bash
# ai-service/ 에서 모든 테스트 실행
cd ai-service
source venv/Scripts/activate
pytest tests/ -v --tb=short

# 예상 결과: 모든 테스트 PASSED
```

## 완료 체크리스트

- [ ] `GET /health` → `{"status": "ok"}`
- [ ] RSI/MACD 계산 테스트 통과
- [ ] Gemini 서비스 테스트 통과 (mock)
- [ ] `/analyze/weekly` 엔드포인트 테스트 통과
- [ ] `/analyze/trade-review` 엔드포인트 테스트 통과
- [ ] Next.js에서 Python 서비스 프록시 작동 확인
- [ ] Docker Compose로 로컬 실행 성공
- [ ] Railway 배포 + health 확인
