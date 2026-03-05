import { TradeSide } from '@/app/types/trade';

export type BrokerType = 'kiwoom' | 'mirae' | 'nh' | 'unknown';

export interface ParsedTradeRow {
  date: string;        // YYYY-MM-DD
  symbol: string;      // 정규화된 종목코드
  symbol_name: string; // 종목명
  side: TradeSide;
  price: number;
  quantity: number;
  rowIndex: number;    // 원본 CSV 행 번호 (에러 추적용)
  raw: string;         // 원본 행 텍스트
}

export interface ParseResult {
  broker: BrokerType;
  trades: ParsedTradeRow[];
  errors: { row: number; message: string }[];
  totalRows: number;
}

// ─── 디코딩 ─────────────────────────────────────────────────────────────────

/** UTF-8 우선 시도 후 EUC-KR 폴백
 *
 * 순서가 중요한 이유:
 * - UTF-8 한글 바이트를 EUC-KR로 해석하면 다른 한글 문자가 만들어질 수 있어
 *   한글 체크를 통과하지만 증권사 키워드는 깨진 상태가 된다.
 * - UTF-8로 먼저 시도하면 UTF-8 파일(웹에서 저장)은 즉시 정상 처리되고,
 *   EUC-KR 파일(증권사 HTS 내보내기)은 한글 없는 깨진 텍스트가 나와
 *   EUC-KR로 재시도하게 된다.
 */
export async function decodeCSVFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  // UTF-8 우선 시도
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (/[\uAC00-\uD7A3]/.test(utf8)) {
    return utf8;
  }

  // EUC-KR 폴백 (증권사 HTS 내보내기 파일)
  try {
    const euckr = new TextDecoder('euc-kr').decode(buffer);
    if (/[\uAC00-\uD7A3]/.test(euckr)) {
      return euckr;
    }
  } catch {
    // EUC-KR 미지원 환경
  }

  // 한글 없는 파일 (영문 CSV 등)은 UTF-8로 반환
  return utf8;
}

// ─── 행 파싱 ────────────────────────────────────────────────────────────────

/** CSV 행을 필드 배열로 파싱 (따옴표 이스케이프 처리) */
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── 정규화 헬퍼 ────────────────────────────────────────────────────────────

/** 종목코드 정규화: A005930 → 005930, AAPL.KS → AAPL */
export function normalizeSymbol(raw: string): string {
  let s = raw.trim();
  // 키움 A 접두사 제거 (6자리 숫자 앞)
  s = s.replace(/^A(\d{6})$/, '$1');
  // 거래소 접미사 제거
  s = s.replace(/\.(KS|KQ|KRX)$/i, '');
  return s;
}

/** 매수/매도 정규화 */
export function normalizeSide(raw: string): TradeSide | null {
  const s = raw.trim();
  if (['매수', '매입', 'BUY', '01', '1'].includes(s)) return 'BUY';
  if (['매도', '매출', 'SELL', '02', '2'].includes(s)) return 'SELL';
  if (s.includes('매수')) return 'BUY';
  if (s.includes('매도')) return 'SELL';
  return null;
}

/** 날짜 정규화 → YYYY-MM-DD */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  // YYYY-MM-DD 또는 YYYY/MM/DD 또는 YYYY.MM.DD
  const withDash = s.replace(/[./]/g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(withDash)) {
    return withDash;
  }

  // YY-MM-DD
  const shortDash = s.replace(/[./]/g, '-');
  if (/^\d{2}-\d{2}-\d{2}$/.test(shortDash)) {
    return `20${shortDash}`;
  }

  return null;
}

/** 숫자 정규화 (쉼표·공백 제거) */
export function normalizeNumber(raw: string): number {
  const n = parseFloat(raw.replace(/[,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

// ─── 증권사 감지 ─────────────────────────────────────────────────────────────

/** 헤더 행을 분석하여 증권사 자동 감지 */
export function detectBroker(headerLine: string): BrokerType {
  const h = headerLine;

  // 키움증권: 종목번호 또는 매매구분 조합
  if (h.includes('종목번호') && h.includes('매매구분')) return 'kiwoom';
  if (h.includes('종목코드') && h.includes('매매구분') && h.includes('체결단가')) return 'kiwoom';
  if (h.includes('종목코드') && h.includes('매매구분') && h.includes('단가')) return 'kiwoom';

  // NH투자증권: 거래유형 OR 매도/매수 조합
  if (h.includes('거래유형') && (h.includes('거래일') || h.includes('거래일자'))) return 'nh';
  if (h.includes('매도/매수') || h.includes('매도매수구분')) return 'nh';

  // 미래에셋: 거래일자 + 거래구분
  if (h.includes('거래일자') && h.includes('거래구분')) return 'mirae';
  if (h.includes('체결일') && h.includes('거래구분')) return 'mirae';
  if (h.includes('거래일') && h.includes('거래구분')) return 'mirae';

  return 'unknown';
}

// ─── 컬럼 인덱스 탐색 ────────────────────────────────────────────────────────

/** 헤더 배열에서 후보 키워드 중 첫 번째로 매칭되는 인덱스 반환 */
function findColIdx(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex(h => h.trim().includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

/** 헤더 행 위치 탐색 (상단 메타데이터 행 건너뜀) */
function findHeaderRowIndex(lines: string[], keywords: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (keywords.some(kw => line.includes(kw))) return i;
  }
  return -1;
}

// ─── 증권사별 파서 ───────────────────────────────────────────────────────────

function parseGeneric(
  lines: string[],
  broker: BrokerType,
  dateKeys: string[],
  symbolKeys: string[],
  symbolNameKeys: string[],
  sideKeys: string[],
  priceKeys: string[],
  quantityKeys: string[],
  headerKeyword: string,
): ParseResult {
  const result: ParseResult = { broker, trades: [], errors: [], totalRows: 0 };

  const headerIdx = findHeaderRowIndex(lines, [headerKeyword]);
  if (headerIdx === -1) {
    result.errors.push({ row: 0, message: '헤더 행을 찾을 수 없습니다.' });
    return result;
  }

  const headers = parseCSVLine(lines[headerIdx]);
  const dateCol = findColIdx(headers, dateKeys);
  const symbolCol = findColIdx(headers, symbolKeys);
  const symbolNameCol = findColIdx(headers, symbolNameKeys);
  const sideCol = findColIdx(headers, sideKeys);
  const priceCol = findColIdx(headers, priceKeys);
  const quantityCol = findColIdx(headers, quantityKeys);

  const required = [
    { name: '날짜', idx: dateCol },
    { name: '구분(매수/매도)', idx: sideCol },
    { name: '단가', idx: priceCol },
    { name: '수량', idx: quantityCol },
  ];
  const missing = required.filter(r => r.idx === -1).map(r => r.name);
  if (missing.length > 0) {
    result.errors.push({ row: headerIdx, message: `필수 컬럼을 찾을 수 없습니다: ${missing.join(', ')}` });
    return result;
  }

  const dataLines = lines.slice(headerIdx + 1);
  result.totalRows = dataLines.filter(l => l.trim().length > 0).length;

  dataLines.forEach((line, i) => {
    if (!line.trim()) return;
    const rowNum = headerIdx + 2 + i;
    const fields = parseCSVLine(line);

    // 필드 수가 너무 적으면 스킵 (합계 행 등)
    if (fields.length < Math.max(dateCol, sideCol, priceCol, quantityCol) + 1) return;

    const rawDate = fields[dateCol] ?? '';
    const rawSide = fields[sideCol] ?? '';
    const rawPrice = fields[priceCol] ?? '';
    const rawQty = fields[quantityCol] ?? '';

    const date = normalizeDate(rawDate);
    if (!date) {
      result.errors.push({ row: rowNum, message: `날짜 파싱 실패: "${rawDate}"` });
      return;
    }

    const side = normalizeSide(rawSide);
    if (!side) {
      // 매수/매도가 아닌 행 (이자, 배당 등)은 조용히 스킵
      return;
    }

    const price = normalizeNumber(rawPrice);
    const quantity = normalizeNumber(rawQty);
    if (price <= 0 || quantity <= 0) {
      result.errors.push({ row: rowNum, message: `가격 또는 수량이 0: 가격=${rawPrice}, 수량=${rawQty}` });
      return;
    }

    const rawSymbol = symbolCol !== -1 ? (fields[symbolCol] ?? '') : '';
    const rawSymbolName = symbolNameCol !== -1 ? (fields[symbolNameCol] ?? '') : '';
    const symbol = normalizeSymbol(rawSymbol) || rawSymbolName;
    const symbol_name = rawSymbolName || rawSymbol;

    if (!symbol) {
      result.errors.push({ row: rowNum, message: '종목코드를 찾을 수 없습니다.' });
      return;
    }

    result.trades.push({
      date,
      symbol,
      symbol_name,
      side,
      price,
      quantity,
      rowIndex: rowNum,
      raw: line,
    });
  });

  return result;
}

/** 키움증권 CSV 파서 */
function parseKiwoom(lines: string[]): ParseResult {
  return parseGeneric(
    lines,
    'kiwoom',
    ['주문일자', '일자', '날짜', '거래일', '체결일'],
    ['종목번호', '종목코드'],
    ['종목명'],
    ['매매구분', '구분'],
    ['체결단가', '단가', '체결가'],
    ['체결수량', '수량', '체결량'],
    '매매구분',
  );
}

/** 미래에셋증권 CSV 파서 */
function parseMirae(lines: string[]): ParseResult {
  return parseGeneric(
    lines,
    'mirae',
    ['거래일자', '체결일', '거래일'],
    ['종목코드'],
    ['종목명'],
    ['거래구분', '구분'],
    ['단가', '거래단가', '체결단가'],
    ['수량', '거래수량', '체결수량'],
    '거래구분',
  );
}

/** NH투자증권 CSV 파서 */
function parseNH(lines: string[]): ParseResult {
  return parseGeneric(
    lines,
    'nh',
    ['거래일자', '거래일', '체결일'],
    ['종목코드', '종목번호'],
    ['종목명'],
    ['거래유형', '매도/매수', '매도매수구분', '구분'],
    ['단가', '거래단가', '체결단가'],
    ['수량', '거래수량', '체결수량'],
    '거래유형',
  );
}

// ─── 메인 진입점 ─────────────────────────────────────────────────────────────

/** CSV 파일 파싱 메인 함수 */
export async function parseCSV(file: File): Promise<ParseResult> {
  const text = await decodeCSVFile(file);
  const lines = text.split(/\r?\n/);

  if (lines.length === 0 || lines.every(l => !l.trim())) {
    return { broker: 'unknown', trades: [], errors: [{ row: 0, message: '파일이 비어있습니다.' }], totalRows: 0 };
  }

  // 헤더 행을 찾아 증권사 감지
  let broker: BrokerType = 'unknown';
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const detected = detectBroker(lines[i]);
    if (detected !== 'unknown') {
      broker = detected;
      break;
    }
  }

  switch (broker) {
    case 'kiwoom': return parseKiwoom(lines);
    case 'mirae': return parseMirae(lines);
    case 'nh': return parseNH(lines);
    default:
      return {
        broker: 'unknown',
        trades: [],
        errors: [{ row: 0, message: '지원하지 않는 형식입니다. 키움증권, 미래에셋증권, NH투자증권 CSV 파일만 지원합니다.' }],
        totalRows: 0,
      };
  }
}
