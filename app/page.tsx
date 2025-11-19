'use client';

import React, {
  useEffect,
  useState,
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

const STORAGE_KEY = 'stock-journal-trades-v1';

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

  // 최초 로딩 시 localStorage에서 불러오기 + 날짜 기본값 세팅
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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
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

    // 종목/메모는 유지하고 싶으면 여기서 원하는 대로 조정
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
  };

  const filteredTrades = trades.filter(t =>
    filterSymbol
      ? t.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
      : true,
  );

  const stats = trades.reduce(
    (acc, t) => {
      const amount = t.price * t.quantity;
      if (t.side === 'BUY') acc.buy += amount;
      else acc.sell += amount;
      return acc;
    },
    { buy: 0, sell: 0 },
  );

  const formatNumber = (n: number) =>
    n.toLocaleString('ko-KR', {
      maximumFractionDigits: 0,
    });

  return (
    <main className="min-h-screen bg-slate-100 flex justify-center px-4 py-8">
      <div className="w-full max-w-4xl bg-white shadow-md rounded-xl p-6 space-y-6">
        <header className="flex flex-col gap-1 border-b pb-4 mb-2">
          <h1 className="text-2xl font-bold">나만 보는 주식 매매 일지</h1>
          <p className="text-sm text-slate-500">
            데이터는 이 브라우저의 <b>localStorage</b>에만 저장됩니다.
            (다른 사람/다른 브라우저에서는 보이지 않음)
          </p>
        </header>

        {/* 요약 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="border rounded-lg p-3">
            <div className="text-slate-500">총 거래 건수</div>
            <div className="text-xl font-semibold">{trades.length} 건</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-slate-500">총 매수 금액</div>
            <div className="text-xl font-semibold">
              {formatNumber(stats.buy)} 원
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-slate-500">총 매도 금액</div>
            <div className="text-xl font-semibold">
              {formatNumber(stats.sell)} 원
            </div>
          </div>
        </section>

        {/* 입력 폼 */}
        <section>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
          >
            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">날짜</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">종목</label>
              <input
                type="text"
                name="symbol"
                placeholder="예: MU, 삼성전자"
                value={form.symbol}
                onChange={handleChange}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">구분</label>
              <select
                name="side"
                value={form.side}
                onChange={handleChange}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="BUY">매수</option>
                <option value="SELL">매도</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">가격</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                className="border rounded px-2 py-1 text-sm text-right"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-1">
              <label className="text-xs text-slate-600">수량</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                className="border rounded px-2 py-1 text-sm text-right"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs text-slate-600">메모</label>
              <textarea
                name="memo"
                value={form.memo}
                onChange={handleChange}
                className="border rounded px-2 py-1 text-sm"
                rows={1}
              />
            </div>

            <div className="flex gap-2 md:col-span-2">
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
            </div>
          </form>
        </section>

        {/* 필터 & 목록 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">종목 필터</span>
              <input
                type="text"
                placeholder="종목 검색"
                value={filterSymbol}
                onChange={e => setFilterSymbol(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="text-xs text-slate-400">
              최근 기록이 위에 표시됩니다.
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-2 py-2 text-left">날짜</th>
                  <th className="px-2 py-2 text-left">종목</th>
                  <th className="px-2 py-2 text-center">구분</th>
                  <th className="px-2 py-2 text-right">가격</th>
                  <th className="px-2 py-2 text-right">수량</th>
                  <th className="px-2 py-2 text-left">메모</th>
                  <th className="px-2 py-2 text-center">삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-2 py-6 text-center text-slate-400"
                    >
                      아직 기록이 없습니다. 위에서 첫 거래를 기록해 보세요.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map(trade => (
                    <tr key={trade.id} className="border-t">
                      <td className="px-2 py-2">{trade.date}</td>
                      <td className="px-2 py-2">{trade.symbol}</td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={
                            trade.side === 'BUY'
                              ? 'text-emerald-600 font-semibold'
                              : 'text-rose-600 font-semibold'
                          }
                        >
                          {trade.side === 'BUY' ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatNumber(trade.price)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatNumber(trade.quantity)}
                      </td>
                      <td className="px-2 py-2 max-w-xs">
                        <span className="line-clamp-2">{trade.memo}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
