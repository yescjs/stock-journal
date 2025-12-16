export function getKoreanWeekdayLabel(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    const day = d.getDay();
    return `${names[day]}요일`;
}

export const formatNumber = (n: number, digits = 0) =>
    n.toLocaleString('ko-KR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });

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
