# TradeForm UX 개선 — 2단계 흐름 → 인라인 접이식 설계

**날짜:** 2026-03-19
**상태:** 승인됨

---

## 배경 및 목적

현재 TradeForm은 거래 저장 시 강제로 2단계 흐름을 거친다:

1. **Step 1** — 날짜, 종목, 단가, 수량 입력
2. **Step 2** — TradeChecklist 모달 팝업 → 체크리스트 5개 + 심리태그 선택 후 "매매 실행" 버튼

사용자 피드백:
- 매번 모달이 뜨는 것이 흐름을 끊는다
- 체크리스트를 실제로 활용하는 빈도가 낮다
- 빠른 기록이 주된 사용 패턴이다

**목표:** 기본 경로는 "저장하기 한 번"으로 단순화하되, 체크리스트·심리태그 기능은 필요할 때 접근 가능하도록 인라인 토글로 제공한다.

---

## 선택한 접근 방식: 인라인 접이식 심화 기록 섹션

폼 하단 저장 버튼 바로 위에 "심화 기록 (체크리스트 · 심리태그)" 토글을 배치한다. 기본은 접혀 있고, 클릭 시 같은 폼 안에서 애니메이션으로 펼쳐진다. 저장 버튼은 항상 하나로 유지된다.

---

## 아키텍처

### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `app/components/TradeForm.tsx` | 핵심 변경: 상태·흐름 단순화, 인라인 심화 섹션 추가 |
| `app/components/TradeChecklist.tsx` | 모달 역할 제거 — 내부 로직을 TradeForm으로 흡수 후 파일 삭제 |

### 변경 없는 파일

- `app/utils/emotionDetector.ts` — 그대로 재사용
- `app/hooks/useTradeTemplates.ts` — 변경 없음
- `app/types/trade.ts` — 변경 없음

---

## 상태 변경

```typescript
// 제거
const [showChecklist, setShowChecklist] = useState(false);

// 추가
const [showAdvanced, setShowAdvanced] = useState(false);

// TradeForm 내부로 이동 (TradeChecklist에서 흡수)
const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

// 편집 모드: initialData.emotion_tag 있으면 초기값으로 사용
const [selectedEmotion, setSelectedEmotion] = useState<string>(
  initialData?.emotion_tag ?? 'PLANNED'
);

// initialData 변경 시 동기화 (useEffect)
useEffect(() => {
  if (initialData?.emotion_tag) {
    setSelectedEmotion(initialData.emotion_tag);
  }
}, [initialData]);
```

---

## 데이터 흐름

```
기존:
validateForm() → setShowChecklist(true) → TradeChecklist 모달
  → handleChecklistConfirm(disciplineScore, emotionTag) → executeSubmit(emotionTag)

변경 후:
validateForm() → executeSubmit(showAdvanced ? selectedEmotion : undefined)
```

- 편집 모드: 동일하게 바로 executeSubmit 호출 (showAdvanced 상태에 따라 selectedEmotion 전달)
- 신규 거래 (심화 접힘): emotion_tag 없이 저장
- 신규 거래 (심화 펼침): selectedEmotion을 emotion_tag로 전달

---

## disciplineScore 처리 방침

`calcDisciplineScore`는 UI 표시 목적으로만 유지한다. `TradeSubmitData`에 `discipline_score` 필드가 없고 DB에도 저장하지 않으므로, 체크리스트 완료율을 인라인으로 보여주는 시각적 피드백으로만 사용한다 (예: "3/5 완료" 텍스트 표시). 점수를 saveSubmit에 전달하지 않는다.

---

## emotionDetector 호출 시점

`detectEmotionPatterns`는 `showAdvanced`가 true일 때만 계산하도록 `useMemo`로 감싼다:

```typescript
const emotionWarnings = useMemo(() => {
  if (!showAdvanced) return [];
  return detectEmotionPatterns(baseTrades, {
    symbol: form.symbol,
    side: form.side,
    price: Number(form.price),
    quantity: Number(form.quantity),
  });
}, [showAdvanced, baseTrades, form.symbol, form.side, form.price, form.quantity]);
```

---

## UI 컴포넌트 설계

### 심리 태그 목록

기존 `EMOTION_OPTIONS` 6개 전부 유지: `PLANNED`, `FOMO`, `FEAR`, `GREED`, `REVENGE`, `IMPULSE`

### 토글 버튼 (접힘 상태)
```
┌─────────────────────────────────────────────┐
│  심화 기록 (체크리스트 · 심리태그)          ＋  │
└─────────────────────────────────────────────┘
[       저장하기       ]
```

### 펼침 상태 (Framer Motion AnimatePresence)
```
┌─────────────────────────────────────────────┐
│  심화 기록                                  －  │
│  ─────────────────────────────────────────  │
│  체크리스트                       3/5 완료   │
│  ☑ 계획된 매매인가요?                          │
│  ☑ 손절 가격을 설정했나요?                     │
│  ☐ 포지션 크기가 적절한가요?                   │
│  ☑ 감정적 매매가 아닌가요?                     │
│  ☐ 매도 시나리오가 있나요?                     │
│                                              │
│  심리 태그                                    │
│  [PLANNED] [FOMO] [FEAR] [GREED]             │
│  [REVENGE] [IMPULSE]                         │
│                                              │
│  ⚠ 자동 감지 경고 (있을 경우 표시)             │
└─────────────────────────────────────────────┘
[       저장하기       ]
```

### 애니메이션
```typescript
<AnimatePresence>
  {showAdvanced && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ overflow: 'hidden' }}
    >
      {/* 체크리스트 + 태그 + 경고 */}
    </motion.div>
  )}
</AnimatePresence>
```

---

## 저장 후 상태 초기화

`executeSubmit` 성공 후 기존 폼 초기화 로직에 추가:

```typescript
// 기존
setForm((prev) => ({ ...prev, price: '', quantity: '' }));

// 추가
setShowAdvanced(false);
setChecklist(DEFAULT_CHECKLIST);
setSelectedEmotion('PLANNED');
```

---

## 제거 항목

- `showChecklist` state
- `handleChecklistConfirm()` 함수
- `<TradeChecklist>` 렌더링 블록
- `TradeChecklist.tsx` 파일 전체 (내부 상수·타입은 TradeForm으로 이동)

---

## 검증 방법

1. `npm run dev` 실행
2. **기본 경로:** 새 거래 입력 → "저장하기" 클릭 → 모달 없이 바로 완료 확인
3. **토글 동작:** "심화 기록" 클릭 → 애니메이션으로 펼쳐짐, 다시 클릭 → 접힘 확인
4. **심화 저장 (로그인):** 체크리스트 체크 + 심리태그 선택 후 저장 → Supabase `trades` 테이블에 `emotion_tag` 저장 확인
5. **심화 저장 (게스트):** 동일 과정 → `localStorage` `stock-journal-guest-trades-v1`에 `emotion_tag` 저장 확인
6. **편집 모드:** 기존에 emotion_tag가 있는 거래 편집 → "심화 기록" 토글 열 때 해당 태그가 선택 상태로 표시되는지 확인
7. **저장 후 리셋:** 저장 완료 후 "심화 기록" 섹션이 자동으로 접힘 상태로 돌아가는지 확인
8. `npm run build` — 타입 오류 없음 확인
