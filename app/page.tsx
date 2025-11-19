'use client';

import React, {
  useEffect,
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';

type TradeSide = 'BUY' | 'SELL';

interface Trade {
  id: number;
  date: string; // YYYY-MM-DD
  symbol: string;
  side: TradeSide;
  price: number;
  quantity: number;
  memo: string;
}

interface SymbolSummary {
  symbol: string;
  totalBuyQty: number;
  totalBuyAmount: number;
  totalSellQty: number;
  totalSellAmount: number;
  positionQty: number;
  avgCost: number;
  costBasis: number;
  realizedPnL: number;
}

const STORAGE_KEY = 'stock-journal-trades-v1';
const PASSWORD_KEY = 'stock-journal-password-v1';
const CURRENT_PRICE_KEY = 'stock-journal-current-prices-v1';
const THEME_KEY = 'stock-journal-theme-v1';

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState({
    date: '',
    symbol: '',
    side: 'BUY' as TradeSide,
    price: '',
    quantity: '',
    memo: '',
  });
  const [filterSymbol, setFilterSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 🔐 비밀번호 관련 상태
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] =
    useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showPasswordSettings, setShowPasswordSettings] =
    useState(false);

  // 💰 현재가 (심볼별)
  const [currentPrices, setCurrentPrices] = useState<
    Record<string, number>
  >({});

  // 🎨 다크 모드
  const [darkMode, setDarkMode] = useState(false);

  // 💾 백업 관련
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupMessage, setBackupMessage] = useState('');

  // 최초 로딩 시 localStorage에서 데이터 & 비밀번호 & 현재가 & 테마 읽기 + 날짜 기본값 세팅
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Trade[];
        setTrades(parsed);
      } catch {
        // 파싱 실패 시 무시
      }
    }

    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (savedPassword) {
      setHasPassword(true);
      setIsUnlocked(false); // 잠금 화면부터
    } else {
      setHasPassword(false);
      setIsUnlocked(true); // 비번 없으면 바로 열림
    }

    const savedPrices = localStorage.getItem(CURRENT_PRICE_KEY);
    if (savedPrices) {
      try {
        const parsed = JSON.parse(savedPrices) as Record<
          string,
          number
        >;
        setCurrentPrices(parsed);
      } catch {
        // 무시
      }
    }

    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }

    if (!form.date) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(prev => ({ ...prev, date: today }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // trades 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  // 현재가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      CURRENT_PRICE_KEY,
      JSON.stringify(currentPrices),
    );
  }, [currentPrices]);

  // 테마 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!form.date || !form.symbol || !form.price || !form.quantity) {
      alert('날짜, 종목, 가격, 수량은 필수입니다.');
      return;
    }

    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (Number.isNaN(price) || Number.isNaN(quantity)) {
      alert('가격과 수량은 숫자로 입력해주세요.');
      return;
    }

    const newTrade: Trade = {
      id: Date.now(),
      date: form.date,
      symbol: form.symbol.toUpperCase().trim(),
      side: form.side,
      price,
      quantity,
      memo: form.memo,
    };

    setTrades(prev => [newTrade, ...prev]);

    // 종목/구분/날짜는 그대로 두고, 가격/수량/메모만 초기화
    setForm(prev => ({
      ...prev,
      price: '',
      quantity: '',
      memo: '',
    }));
  };

  const handleDelete = (id: number) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleClearAll = () => {
    if (!confirm('모든 매매 기록을 삭제할까요?')) return;
    setTrades([]);
    setSelectedSymbol('');
  };

  // CSV 다운로드 (전체 내역 기준)
  const handleExportCsv = () => {
    if (trades.length === 0) {
      alert('내보낼 기록이 없습니다.');
      return;
    }

    const header = [
      'id',
      'date',
      'symbol',
      'side',
      'price',
      'quantity',
      'amount',
      'memo',
    ];

    const rows = trades.map(t => [
      t.id,
      t.date,
      t.symbol,
      t.side,
      t.price,
      t.quantity,
      t.price * t.quantity,
      t.memo.replace(/\r?\n/g, ' '),
    ]);

    const csvContent =
      '\uFEFF' +
      [header, ...rows]
        .map(row =>
          row
            .map(value => {
              const str = String(value ?? '');
              const escaped = str.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(','),
        )
        .join('\r\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'stock-journal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetDateFilter = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(prev => (prev === symbol ? '' : symbol));
  };

  const formatNumber = (n: number, digits = 0) =>
    n.toLocaleString('ko-KR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });

  // 🔐 잠금 해제 처리
  const handleUnlock = (e: FormEvent) => {
    e.preventDefault();
    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (!savedPassword) {
      setPasswordMessage('설정된 비밀번호가 없습니다.');
      setHasPassword(false);
      setIsUnlocked(true);
      return;
    }
    if (passwordInput === savedPassword) {
      setIsUnlocked(true);
      setPasswordInput('');
      setPasswordMessage('');
    } else {
      setPasswordMessage('비밀번호가 올바르지 않습니다.');
    }
  };

  // 🔐 비밀번호 설정/변경
  const handleSavePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setPasswordMessage('비밀번호를 입력해주세요.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordMessage('비밀번호와 확인이 일치하지 않습니다.');
      return;
    }
    if (typeof window === 'undefined') return;
    // ⚠️ 단순 localStorage 저장이므로 보안이 강한 방식은 아님
    localStorage.setItem(PASSWORD_KEY, newPassword);
    setHasPassword(true);
    setPasswordMessage(
      '비밀번호가 저장되었습니다. 다음 접속부터 잠금 화면이 표시됩니다.',
    );
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  // 🔐 비밀번호 삭제
  const handleRemovePassword = () => {
    if (
      !confirm(
        '비밀번호 잠금을 해제할까요? (localStorage에서 비밀번호 삭제)',
      )
    )
      return;
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PASSWORD_KEY);
    setHasPassword(false);
    setPasswordMessage('비밀번호 잠금이 해제되었습니다.');
  };

  // 💰 현재가 입력 핸들러
  const handleCurrentPriceChange = (symbol: string, value: string) => {
    if (value === '') {
      setCurrentPrices(prev => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setCurrentPrices(prev => ({
      ...prev,
      [symbol]: num,
    }));
  };

  // 💾 JSON 백업 내보내기
  const handleExportBackup = () => {
    if (
      trades.length === 0 &&
      Object.keys(currentPrices).length === 0
    ) {
      alert('백업할 데이터가 없습니다.');
      return;
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trades,
      currentPrices,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });

    const dateStr = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `stock-journal-backup-${dateStr}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupMessage('백업 파일을 다운로드했습니다.');
  };

  // 💾 JSON 백업 불러오기 버튼 클릭
  const handleImportBackupClick = () => {
    setBackupMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // 💾 JSON 백업 파일 선택 처리
  const handleBackupFileChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);

        if (!data || typeof data !== 'object') {
          throw new Error('잘못된 파일 형식입니다.');
        }
        if (!Array.isArray((data as any).trades)) {
          throw new Error('trades 필드가 없습니다.');
        }
        if (
          typeof (data as any).currentPrices !== 'object' ||
          (data as any).currentPrices === null
        ) {
          throw new Error('currentPrices 필드가 없습니다.');
        }

        if (
          !confirm(
            '백업 데이터를 불러오면 현재 브라우저에 저장된 매매 기록과 현재가 설정이 모두 덮어씌워집니다. 진행할까요?',
          )
        ) {
          return;
        }

        setTrades((data as any).trades as Trade[]);
        setCurrentPrices(
          (data as any).currentPrices as Record<string, number>,
        );
        setBackupMessage('백업 데이터를 성공적으로 불러왔습니다.');
      } catch (err) {
        console.error(err);
        alert(
          '백업 파일을 읽는 중 오류가 발생했습니다. 올바른 백업 파일인지 확인해주세요.',
        );
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // 1차 필터: 종목 검색
  const symbolFilteredTrades = trades.filter(t =>
    filterSymbol
      ? t.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
      : true,
  );

  // 2차 필터: 기간(시작일/종료일)
  const dateFilteredTrades = symbolFilteredTrades.filter(t => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });

  const displayedTrades = dateFilteredTrades;

  // 전체(현재 필터 기준) 통계
  const stats = displayedTrades.reduce(
    (acc, t) => {
      const amount = t.price * t.quantity;
      if (t.side === 'BUY') acc.buy += amount;
      else acc.sell += amount;
      return acc;
    },
    { buy: 0, sell: 0 },
  );
  const netCash = stats.sell - stats.buy;

  // 선택된 종목 통계 (현재 필터 기준)
  const symbolStats = displayedTrades
    .filter(t => selectedSymbol && t.symbol === selectedSymbol)
    .reduce(
      (acc, t) => {
        const amount = t.price * t.quantity;
        if (t.side === 'BUY') acc.buy += amount;
        else acc.sell += amount;
        return acc;
      },
      { buy: 0, sell: 0 },
    );
  const symbolNetCash = symbolStats.sell - symbolStats.buy;

  const hasDateRangeError =
    dateFrom && dateTo && dateFrom > dateTo;

  // 📊 종목별 보유/손익 요약 (전체 내역 기준, 필터와 무관)
  const symbolSummaries: SymbolSummary[] = (() => {
    if (trades.length === 0) return [];

    const sortedTrades = [...trades].sort((a, b) => {
      if (a.date === b.date) {
        return a.id - b.id;
      }
      return a.date.localeCompare(b.date);
    });

    const map = new Map<string, SymbolSummary>();

    for (const t of sortedTrades) {
      let s = map.get(t.symbol);
      if (!s) {
        s = {
          symbol: t.symbol,
          totalBuyQty: 0,
          totalBuyAmount: 0,
          totalSellQty: 0,
          totalSellAmount: 0,
          positionQty: 0,
          avgCost: 0,
          costBasis: 0,
          realizedPnL: 0,
        };
        map.set(t.symbol, s);
      }

      const amount = t.price * t.quantity;

      if (t.side === 'BUY') {
        s.totalBuyQty += t.quantity;
        s.totalBuyAmount += amount;
        s.positionQty += t.quantity;
        s.costBasis += amount;
      } else {
        s.totalSellQty += t.quantity;
        s.totalSellAmount += amount;

        const prevQty = s.positionQty;
        const prevCostBasis = s.costBasis;
        const prevAvgCost =
          prevQty !== 0 ? prevCostBasis / prevQty : 0;

        const sellQty = t.quantity;
        const realizedThis =
          (t.price - prevAvgCost) * sellQty;

        s.realizedPnL += realizedThis;

        s.positionQty = prevQty - sellQty;
        s.costBasis = prevCostBasis - prevAvgCost * sellQty;
      }
    }

    const result: SymbolSummary[] = [];
    for (const s of map.values()) {
      if (s.positionQty > 0) {
        s.avgCost = s.costBasis / s.positionQty;
      } else {
        s.avgCost = 0;
        s.costBasis = 0;
      }
      result.push(s);
    }

    result.sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    );
    return result;
  })();

  const mainClass =
    'min-h-screen flex justify-center px-4 py-8 ' +
    (darkMode ? 'bg-slate-900' : 'bg-slate-100');

  const containerClass =
    'w-full max-w-5xl shadow-md rounded-xl p-6 space-y-6 ' +
    (darkMode
      ? 'bg-slate-900 border border-slate-700 text-slate-100'
      : 'bg-white text-slate-900');

  const tableHeaderBg =
    'border-b ' +
    (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200');

  // 🔐 잠금 화면 (비밀번호 있는 경우에만)
  if (!isUnlocked && hasPassword) {
    return (
      <main className="min-h-screen bg-slate-100 flex justify-center items-center px-4">
        <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-center">
            주식 매매 일지 잠금 해제
          </h1>
          <p className="text-xs text-slate-500 text-center">
            이 브라우저에 저장된 비밀번호를 입력해야
            매매 일지를 볼 수 있습니다.
            <br />
            (비밀번호는 localStorage에만 저장되며,
            서버로 전송되지 않습니다.)
          </p>
          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">
                비밀번호
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={e =>
                  setPasswordInput(e.target.value)
                }
                className="border rounded px-2 py-1 text-sm"
                placeholder="비밀번호 입력"
              />
            </div>
            {passwordMessage && (
              <div className="text-xs text-rose-500">
                {passwordMessage}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white text-sm font-medium rounded-lg py-2"
            >
              잠금 해제
            </button>
          </form>
          <div className="text-[10px] text-slate-400 text-center">
            ⚠️ 이 잠금 기능은 기본적인 사생활 보호용입니다.
            브라우저 접근이 가능한 사람은
            개발자 도구/스토리지를 통해 데이터를 볼 수도 있습니다.
          </div>
        </div>
      </main>
    );
  }

  // 🔓 잠금 해제 이후 메인 화면
  return (
    <main className={mainClass}>
      <div className={containerClass}>
        {/* 숨겨진 백업 파일 입력 */}
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleBackupFileChange}
          className="hidden"
        />

        <header className="flex flex-col gap-2 border-b pb-4 mb-2 border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                나만 보는 주식 매매 일지
              </h1>
              <p className="text-sm text-slate-500">
                데이터와 비밀번호는 이 브라우저의{' '}
                <b>localStorage</b>에만 저장됩니다.
                (다른 사람/다른 브라우저에서는 보이지 않음)
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setDarkMode(prev => !prev)}
                className={
                  'text-xs rounded-lg px-3 py-1.5 border ' +
                  (darkMode
                    ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50')
                }
              >
                {darkMode ? '☀️ 라이트 모드' : '🌙 다크 모드'}
              </button>
              <button
                type="button"
                onClick={() =>
                  setShowPasswordSettings(prev => !prev)
                }
                className={
                  'text-xs rounded-lg px-3 py-1.5 border ' +
                  (darkMode
                    ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50')
                }
              >
                🔐 잠금 설정
              </button>
            </div>
          </div>

          {/* 🔐 비밀번호 설정/변경 섹션 (접이식) */}
          {showPasswordSettings && (
            <section
              className={
                'mt-2 border rounded-lg p-3 text-sm space-y-3 ' +
                (darkMode
                  ? 'bg-slate-800 border-slate-700'
                  : 'bg-slate-50')
              }
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-xs">
                  잠금 설정 (이 브라우저에만 적용)
                </div>
                {hasPassword && (
                  <span className="text-[10px] text-emerald-500">
                    현재 비밀번호가 설정되어 있습니다.
                  </span>
                )}
              </div>
              <form
                onSubmit={handleSavePassword}
                className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e =>
                      setNewPassword(e.target.value)
                    }
                    className="border rounded px-2 py-1 text-sm bg-transparent"
                    placeholder="새 비밀번호"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-600">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={e =>
                      setNewPasswordConfirm(
                        e.target.value,
                      )
                    }
                    className="border rounded px-2 py-1 text-sm bg-transparent"
                    placeholder="다시 입력"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white"
                  >
                    비밀번호 저장
                  </button>
                  {hasPassword && (
                    <button
                      type="button"
                      onClick={handleRemovePassword}
                      className="px-3 py-2 text-xs border rounded-lg text-slate-500"
                    >
                      비밀번호 삭제
                    </button>
                  )}
                </div>
              </form>
              {passwordMessage && (
                <div className="text-xs text-slate-300">
                  {passwordMessage}
                </div>
              )}
              <div className="text-[10px] text-slate-400">
                ⚠️ 참고: 이 잠금 기능은 기본적인 개인 정보
                보호용입니다. 브라우저에 물리적으로 접근
                가능한 사용자는 개발자 도구를 통해
                localStorage 내용에 접근할 수 있습니다. 아주
                민감한 정보는 가능한 한 다른 방식으로
                관리하는 것을 추천합니다.
              </div>
            </section>
          )}
        </header>

        {/* 요약 (현재 필터 기준) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div
            className={
              'border rounded-lg p-3 ' +
              (darkMode ? 'border-slate-700' : 'border-slate-200')
            }
          >
            <div className="text-slate-500">
              현재 조건의 거래 건수
            </div>
            <div className="text-xl font-semibold">
              {displayedTrades.length} 건
            </div>
          </div>
          <div
            className={
              'border rounded-lg p-3 ' +
              (darkMode ? 'border-slate-700' : 'border-slate-200')
            }
          >
            <div className="text-slate-500">매수 금액 합계</div>
            <div className="text-xl font-semibold">
              {formatNumber(stats.buy)} 원
            </div>
          </div>
          <div
            className={
              'border rounded-lg p-3 ' +
              (darkMode ? 'border-slate-700' : 'border-slate-200')
            }
          >
            <div className="text-slate-500">매도 금액 합계</div>
            <div className="text-xl font-semibold">
              {formatNumber(stats.sell)} 원
            </div>
          </div>
          <div
            className={
              'border rounded-lg p-3 ' +
              (darkMode ? 'border-slate-700' : 'border-slate-200')
            }
          >
            <div className="text-slate-500">
              순 현금 흐름 (매도 - 매수)
            </div>
            <div
              className={
                'text-xl font-semibold ' +
                (netCash > 0
                  ? 'text-emerald-500'
                  : netCash < 0
                  ? 'text-rose-400'
                  : '')
              }
            >
              {formatNumber(netCash)} 원
            </div>
          </div>
        </section>

        {/* 선택된 종목 요약 (필터 기준) */}
        <section>
          <div
            className={
              'border rounded-lg p-3 text-sm ' +
              (darkMode
                ? 'bg-slate-800 border-slate-700'
                : 'bg-slate-50 border-slate-200')
            }
          >
            {selectedSymbol ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    선택된 종목 (현재 필터 기준):{' '}
                    {selectedSymbol}
                  </div>
                  <button
                    className="text-xs text-slate-500 underline"
                    onClick={() => setSelectedSymbol('')}
                  >
                    선택 해제
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="text-slate-500 text-xs">
                      매수 금액
                    </div>
                    <div className="text-base font-semibold">
                      {formatNumber(symbolStats.buy)} 원
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">
                      매도 금액
                    </div>
                    <div className="text-base font-semibold">
                      {formatNumber(symbolStats.sell)} 원
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs">
                      순 현금 흐름 (매도 - 매수)
                    </div>
                    <div
                      className={
                        'text-base font-semibold ' +
                        (symbolNetCash > 0
                          ? 'text-emerald-500'
                          : symbolNetCash < 0
                          ? 'text-rose-400'
                          : '')
                      }
                    >
                      {formatNumber(symbolNetCash)} 원
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                아래 표에서 <b>종목 이름을 클릭</b>하면 해당
                종목의 매수/매도/순 현금 흐름 요약이 여기
                표시됩니다. (현재 설정된 종목/기간 필터 조건이
                반영됩니다.)
              </div>
            )}
          </div>
        </section>

        {/* 📊 종목별 보유/손익 요약 (전체 기준) */}
        {symbolSummaries.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                종목별 보유/손익 요약 (전체 내역 기준)
              </div>
              <div className="text-[11px] text-slate-400">
                * 필터와 관계없이 지금까지 입력한 모든
                내역으로 계산됩니다. 현재가는 여기에서
                직접 입력합니다.
              </div>
            </div>
            <div
              className={
                'border rounded-lg overflow-x-auto ' +
                (darkMode ? 'border-slate-700' : 'border-slate-200')
              }
            >
              <table className="w-full text-xs md:text-sm min-w-[720px]">
                <thead className={tableHeaderBg}>
                  <tr>
                    <th className="px-2 py-2 text-left">종목</th>
                    <th className="px-2 py-2 text-right">
                      보유수량
                    </th>
                    <th className="px-2 py-2 text-right">
                      평단가
                    </th>
                    <th className="px-2 py-2 text-right">
                      총 매수금액
                    </th>
                    <th className="px-2 py-2 text-right">
                      총 매도금액
                    </th>
                    <th className="px-2 py-2 text-right">
                      실현손익
                    </th>
                    <th className="px-2 py-2 text-right">
                      현재가
                    </th>
                    <th className="px-2 py-2 text-right">
                      평가금액
                    </th>
                    <th className="px-2 py-2 text-right">
                      평가손익(미실현)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {symbolSummaries.map(s => {
                    const hasPrice =
                      currentPrices[s.symbol] !== undefined;
                    const currentPrice = hasPrice
                      ? currentPrices[s.symbol]
                      : undefined;

                    const positionValue =
                      s.positionQty > 0 && hasPrice
                        ? s.positionQty * (currentPrice as number)
                        : 0;

                    const unrealizedPnL =
                      s.positionQty > 0 && hasPrice
                        ? ((currentPrice as number) - s.avgCost) *
                          s.positionQty
                        : 0;

                    return (
                      <tr
                        key={s.symbol}
                        className={
                          'border-t ' +
                          (darkMode
                            ? 'border-slate-700'
                            : 'border-slate-200')
                        }
                      >
                        <td className="px-2 py-2">
                          {s.symbol}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(s.positionQty)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {s.positionQty > 0
                            ? formatNumber(s.avgCost, 2)
                            : '-'}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(s.totalBuyAmount)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(s.totalSellAmount)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span
                            className={
                              s.realizedPnL > 0
                                ? 'text-emerald-500 font-semibold'
                                : s.realizedPnL < 0
                                ? 'text-rose-400 font-semibold'
                                : ''
                            }
                          >
                            {formatNumber(s.realizedPnL)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {s.positionQty > 0 ? (
                            <input
                              type="number"
                              className={
                                'border rounded px-1 py-0.5 text-right w-24 text-xs ' +
                                (darkMode
                                  ? 'bg-slate-900 border-slate-600'
                                  : '')
                              }
                              value={
                                hasPrice && currentPrice !== undefined
                                  ? String(currentPrice)
                                  : ''
                              }
                              onChange={e =>
                                handleCurrentPriceChange(
                                  s.symbol,
                                  e.target.value,
                                )
                              }
                              placeholder="현재가"
                            />
                          ) : (
                            <span className="text-slate-400">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {s.positionQty > 0 && hasPrice
                            ? formatNumber(positionValue)
                            : s.positionQty > 0
                            ? '현재가 입력'
                            : '-'}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {s.positionQty > 0 && hasPrice ? (
                            <span
                              className={
                                unrealizedPnL > 0
                                  ? 'text-emerald-500 font-semibold'
                                  : unrealizedPnL < 0
                                  ? 'text-rose-400 font-semibold'
                                  : ''
                              }
                            >
                              {formatNumber(unrealizedPnL)}
                            </span>
                          ) : s.positionQty > 0 ? (
                            <span className="text-slate-400">
                              현재가 입력
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 입력 폼 */}
        <section>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          >
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">
                날짜
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className={
                  'border rounded px-2 py-1 text-sm bg-transparent ' +
                  (darkMode ? 'border-slate-600' : '')
                }
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">
                종목
              </label>
              <input
                type="text"
                name="symbol"
                placeholder="예: MU, 삼성전자"
                value={form.symbol}
                onChange={handleChange}
                className={
                  'border rounded px-2 py-1 text-sm bg-transparent ' +
                  (darkMode ? 'border-slate-600' : '')
                }
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">
                구분
              </label>
              <select
                name="side"
                value={form.side}
                onChange={handleChange}
                className={
                  'border rounded px-2 py-1 text-sm bg-transparent ' +
                  (darkMode ? 'border-slate-600' : '')
                }
              >
                <option value="BUY">매수</option>
                <option value="SELL">매도</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">
                가격
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className={
                  'border rounded px-2 py-1 text-sm text-right bg-transparent ' +
                  (darkMode ? 'border-slate-600' : '')
                }
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">
                수량
              </label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                className={
                  'border rounded px-2 py-1 text-sm text-right bg-transparent ' +
                  (darkMode ? 'border-slate-600' : '')
                }
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs text-slate-600">
                메모
              </label>
              <textarea
                name="memo"
                value={form.memo}
                onChange={handleChange}
                className={
                  'border rounded px-2 py-1 text-sm bg-transparent ' +
                  (darkMode ? 'border-slate-600' : '')
                }
                rows={1}
              />
            </div>

            <div className="flex flex-wrap gap-2 md:col-span-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg py-2"
              >
                기록 추가
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 text-xs border rounded-lg text-slate-500"
              >
                전체 삭제
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-3 py-2 text-xs border rounded-lg text-slate-500"
              >
                CSV 다운로드
              </button>
            </div>
          </form>
        </section>

        {/* 💾 데이터 백업 / 복원 */}
        <section className="space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              데이터 백업 / 복원
            </span>
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
            >
              JSON 백업 다운로드
            </button>
            <button
              type="button"
              onClick={handleImportBackupClick}
              className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 hover:bg-slate-50"
            >
              백업 파일 불러오기
            </button>
            {backupMessage && (
              <span className="text-[11px] text-slate-400">
                {backupMessage}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            ❗ JSON 백업에는 매매 기록과 종목별 현재가 설정이
            모두 포함됩니다. 다른 브라우저나 PC에서 이
            파일을 "백업 파일 불러오기"로 읽으면 데이터가
            그대로 복원됩니다. (비밀번호 설정은
            브라우저별로 따로 관리됩니다)
          </p>
        </section>

        {/* 필터 & 목록 */}
        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            {/* 왼쪽: 종목 + 기간 필터 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600">
                  종목 필터
                </span>
                <input
                  type="text"
                  placeholder="종목 검색"
                  value={filterSymbol}
                  onChange={e =>
                    setFilterSymbol(e.target.value)
                  }
                  className={
                    'border rounded px-2 py-1 text-sm bg-transparent ' +
                    (darkMode ? 'border-slate-600' : '')
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-600">
                  기간 필터
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e =>
                    setDateFrom(e.target.value)
                  }
                  className={
                    'border rounded px-2 py-1 text-xs bg-transparent ' +
                    (darkMode ? 'border-slate-600' : '')
                  }
                  placeholder="시작일"
                />
                <span className="text-xs text-slate-400">
                  ~
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e =>
                    setDateTo(e.target.value)
                  }
                  className={
                    'border rounded px-2 py-1 text-xs bg-transparent ' +
                    (darkMode ? 'border-slate-600' : '')
                  }
                  placeholder="종료일"
                />
                <button
                  type="button"
                  onClick={resetDateFilter}
                  className="px-2 py-1 text-xs border rounded-lg text-slate-500"
                >
                  기간 초기화
                </button>
              </div>
              {hasDateRangeError && (
                <div className="text-xs text-rose-500">
                  시작일이 종료일보다 늦습니다. 날짜 범위를
                  다시 확인해주세요.
                </div>
              )}
            </div>

            {/* 오른쪽: 안내 */}
            <div className="text-xs text-slate-400 mt-2 md:mt-0">
              종목/기간 필터 조건이 위 요약과 아래 목록에 모두
              반영됩니다. 종목 이름을 클릭하면 해당 종목
              요약이 위에 표시됩니다.
            </div>
          </div>

          <div
            className={
              'border rounded-lg overflow-hidden ' +
              (darkMode ? 'border-slate-700' : 'border-slate-200')
            }
          >
            <table className="w-full text-xs md:text-sm">
              <thead className={tableHeaderBg}>
                <tr>
                  <th className="px-2 py-2 text-left">날짜</th>
                  <th className="px-2 py-2 text-left">종목</th>
                  <th className="px-2 py-2 text-center">
                    구분
                  </th>
                  <th className="px-2 py-2 text-right">
                    가격
                  </th>
                  <th className="px-2 py-2 text-right">
                    수량
                  </th>
                  <th className="px-2 py-2 text-right">
                    금액
                  </th>
                  <th className="px-2 py-2 text-left">메모</th>
                  <th className="px-2 py-2 text-center">
                    삭제
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedTrades.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-2 py-6 text-center text-slate-400"
                    >
                      현재 필터 조건에 해당하는 기록이
                      없습니다. (필터를 초기화하거나 다른
                      기간/종목을 선택해보세요.)
                    </td>
                  </tr>
                ) : (
                  displayedTrades.map(trade => {
                    const amount =
                      trade.price * trade.quantity;
                    const isSelected =
                      trade.symbol === selectedSymbol;
                    return (
                      <tr
                        key={trade.id}
                        className={
                          'border-t ' +
                          (darkMode
                            ? 'border-slate-700'
                            : 'border-slate-200')
                        }
                      >
                        <td className="px-2 py-2">
                          {trade.date}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleSymbolClick(
                                trade.symbol,
                              )
                            }
                            className={
                              'underline-offset-2 ' +
                              (isSelected
                                ? 'font-semibold underline text-blue-400'
                                : 'text-blue-500 hover:underline')
                            }
                          >
                            {trade.symbol}
                          </button>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={
                              trade.side === 'BUY'
                                ? 'text-emerald-500 font-semibold'
                                : 'text-rose-400 font-semibold'
                            }
                          >
                            {trade.side === 'BUY'
                              ? '매수'
                              : '매도'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(trade.price)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(trade.quantity)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(amount)}
                        </td>
                        <td className="px-2 py-2 max-w-xs">
                          <span className="line-clamp-2">
                            {trade.memo}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() =>
                              handleDelete(trade.id)
                            }
                            className="text-xs text-slate-400 hover:text-red-500"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
