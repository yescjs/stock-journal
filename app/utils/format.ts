export function getKoreanWeekdayLabel(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    const day = d.getDay();
    return `${names[day]}요일`;
}

// 스마트 숫자 포맷팅: 미국 주식(낮은 가격)은 소수점, 한국 주식(높은 가격)은 정수
export const formatNumber = (n: number, forceDigits?: number) => {
    // forceDigits가 지정되면 해당 자릿수 사용
    if (forceDigits !== undefined) {
        return n.toLocaleString('ko-KR', {
            minimumFractionDigits: forceDigits,
            maximumFractionDigits: forceDigits,
        });
    }

    // 자동 판단: 1000 미만은 소수점 2자리, 이상은 정수
    const digits = Math.abs(n) < 1000 ? 2 : 0;
    const rounded = digits === 0 ? Math.round(n) : n;

    return rounded.toLocaleString('ko-KR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};

// 한국 주식 여부 판단 (심볼에 .KS 또는 .KQ 포함, 또는 숫자로만 구성)
export const isKRWSymbol = (symbol: string): boolean => {
    if (!symbol) return false;
    return symbol.includes('.KS') || symbol.includes('.KQ') || /^\d+$/.test(symbol);
};


// 수량 포맷팅: 한국 주식은 정수, 미국 주식은 소수점 2자리
export const formatQuantity = (n: number, symbol?: string) => {
    // 심볼이 있고 한국 주식이면 정수
    if (symbol && isKRWSymbol(symbol)) {

        return Math.round(n).toLocaleString('ko-KR');
    }
    // 심볼 없이 호출되면 값으로 판단: 정수면 정수로, 소수면 소수점 2자리
    if (!symbol) {
        return Number.isInteger(n)
            ? Math.round(n).toLocaleString('ko-KR')
            : n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // 미국 주식은 소수점 2자리
    return n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 통화 기호 반환 (라벨용)
export const getCurrencySymbol = (symbol?: string): string => {
    if (!symbol) return '';
    return isKRWSymbol(symbol) ? '원' : '$';

};

// 가격 포맷팅 (통화 기호 포함)
export const formatPrice = (n: number, symbol?: string): string => {
    const isKR = symbol ? isKRWSymbol(symbol) : false;


    if (isKR) {
        // 한국 주식: 숫자 뒤에 "원" (더 자연스러운 한국어 표기)
        return `${Math.round(n).toLocaleString('ko-KR')}원`;
    } else {
        // 미국 주식: $ 앞에 붙이기
        return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
};

export function formatMonthLabel(monthKey: string): string {
    const parts = monthKey.split('-');
    if (parts.length >= 2) {
        const year = parts[0];
        const monthNum = Number(parts[1]);
        if (!Number.isNaN(monthNum)) {
            return `${year}년 ${monthNum}월`;
        }
    }
    return monthKey;
}

export function parseTagString(str: string | undefined | null): string[] {
    if (!str) return [];
    return str
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
}
