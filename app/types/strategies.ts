// 전략 타입 정의

export interface Strategy {
    id: string;
    user_id?: string;
    name: string;
    description?: string;
    entry_rules?: string;   // 진입 조건 (마크다운)
    exit_rules?: string;    // 청산 조건 (마크다운)
    risk_notes?: string;    // 리스크 관리 주의사항
    color: string;          // 색상 (hex)
    created_at?: string;
}

// 감정/심리 상태 태그
export type EmotionTag =
    | 'PLANNED'      // 계획대로
    | 'FOMO'         // Fear of Missing Out
    | 'FEAR'         // 공포 매도
    | 'GREED'        // 탐욕
    | 'REVENGE'      // 복수 매매
    | 'IMPULSIVE'    // 충동 매매
    | 'CONFIDENT'    // 확신
    | 'HESITANT';    // 망설임

export const EMOTION_TAG_LABELS: Record<EmotionTag, string> = {
    PLANNED: '계획대로',
    FOMO: 'FOMO',
    FEAR: '공포',
    GREED: '탐욕',
    REVENGE: '복수매매',
    IMPULSIVE: '충동',
    CONFIDENT: '확신',
    HESITANT: '망설임',
};

export const EMOTION_TAG_COLORS: Record<EmotionTag, string> = {
    PLANNED: '#10b981',     // emerald
    FOMO: '#f59e0b',        // amber
    FEAR: '#ef4444',        // red
    GREED: '#f97316',       // orange
    REVENGE: '#dc2626',     // red-600
    IMPULSIVE: '#f43f5e',   // rose
    CONFIDENT: '#3b82f6',   // blue
    HESITANT: '#6b7280',    // gray
};

// 기본 전략 프리셋
export const DEFAULT_STRATEGIES: Omit<Strategy, 'id' | 'user_id' | 'created_at'>[] = [
    {
        name: '돌파매매',
        description: '저항선/고점 돌파 시 진입',
        entry_rules: '- 거래량 급증과 함께 저항선 돌파\n- 일봉/주봉 기준 신고가 갱신',
        exit_rules: '- 목표가 도달 시 분할 매도\n- 돌파 실패 시 손절',
        risk_notes: '- 거짓 돌파 주의\n- 거래량 확인 필수',
        color: '#3b82f6',
    },
    {
        name: '눌림목',
        description: '상승 추세 중 조정 시 진입',
        entry_rules: '- 20일선/60일선 지지 확인\n- 거래량 감소 후 반등',
        exit_rules: '- 전고점 부근에서 분할 매도\n- 이평선 이탈 시 손절',
        risk_notes: '- 추세 전환 시 빠른 손절\n- 하락장에서는 주의',
        color: '#10b981',
    },
    {
        name: '스윙',
        description: '2-7일 보유 중기 매매',
        entry_rules: '- 일봉 기준 바닥권 확인\n- RSI 과매도 구간 진입',
        exit_rules: '- 목표 수익률 도달\n- 보유 기간 초과 시 재평가',
        risk_notes: '- 오버나잇 리스크 관리\n- 분할 매수/매도 권장',
        color: '#8b5cf6',
    },
    {
        name: '단타/데이트레이딩',
        description: '당일 매수/매도 완료',
        entry_rules: '- 갭상승 후 눌림 진입\n- 거래량 상위 종목 집중',
        exit_rules: '- 당일 청산 원칙\n- 분봉 기준 추세 이탈 시 청산',
        risk_notes: '- 손절 기준 엄격히 적용\n- 과도한 거래 횟수 주의',
        color: '#f59e0b',
    },
    {
        name: '역추세',
        description: '과매도/과매수 구간 역방향 진입',
        entry_rules: '- RSI 30 이하 또는 70 이상\n- 강한 지지/저항 근처',
        exit_rules: '- 평균 회귀 시 청산\n- 추세 지속 시 빠른 손절',
        risk_notes: '- 추세 강도 확인 필수\n- 손절 라인 사전 설정',
        color: '#ec4899',
    },
];
