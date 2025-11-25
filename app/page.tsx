'use client';

import React, {
  useEffect,
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';
import { createClient, type User } from '@supabase/supabase-js';

type TradeSide = 'BUY' | 'SELL';

interface Trade {
  id: string;            // Supabase uuid 기준으로 문자열 사용
  date: string;          // YYYY-MM-DD
  symbol: string;
  side: TradeSide;
  price: number;
  quantity: number;
  memo: string;
  tags?: string[];
  image?: string;        // 이미지 파일 (URL)
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

// localStorage용 키 (비밀번호, 현재가, 테마, 백업용)
const PASSWORD_KEY = 'stock-journal-password-v1';
const CURRENT_PRICE_KEY = 'stock-journal-current-prices-v1';
const THEME_KEY = 'stock-journal-theme-v1';

type ActiveTab = 'journal' | 'stats' | 'settings';

// Supabase 클라이언트 (브라우저 공개키 사용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getKoreanWeekdayLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  const day = d.getDay();
  return `${names[day]}요일`;
}

const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// YYYY-MM → "2025년 11월"
function formatMonthLabel(monthKey: string): string {
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

type NotifyType = 'success' | 'error' | 'info';

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);

  // 🔐 Supabase Auth 상태
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [form, setForm] = useState({
    date: '',
    symbol: '',
    side: 'BUY' as TradeSide,
    price: '',
    quantity: '',
    memo: '',
    tags: '',
  });
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 잠금
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  // 현재가
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>(
    {},
  );

  // 테마
  const [darkMode, setDarkMode] = useState(false);

  // 백업
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupMessage, setBackupMessage] = useState('');

  // 탭
  const [activeTab, setActiveTab] = useState<ActiveTab>('journal');

  // 월별 접기 상태
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  // 수정 기능
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editForm, setEditForm] = useState({
    id: '',
    date: '',
    symbol: '',
    side: 'BUY' as TradeSide,
    price: '',
    quantity: '',
    memo: '',
    tags: '',
  });
  const [editingSaving, setEditingSaving] = useState(false);

  // 이미지 파일 업로드용
  const chartInputRef = useRef<HTMLInputElement | null>(null);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [chartPreview, setChartPreview] = useState<string | null>(null);

  // 기록 추가 버튼 로딩
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 토스트 알림
  const [notify, setNotify] = useState<{ type: NotifyType; message: string } | null>(null);

  // 전체 화면 모달용 이미지
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const weekdayLabel = getKoreanWeekdayLabel(form.date);

  // Supabase에서 매매 기록 불러오는 함수 (user_id 기준)
  async function initTrades(userId: string) {
    setTradesLoading(true);
    setTradesError(null);

    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Failed to fetch trades:', error);
        setTradesError('매매 기록을 불러오는 중 오류가 발생했습니다.');
      } else if (data) {
        const normalized = (data as Trade[]).map(t => ({
          ...t,
          tags: t.tags ?? [],
        }));
        setTrades(normalized);
      }
    } catch (err) {
      console.error(err);
      setTradesError('매매 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setTradesLoading(false);
    }
  }

  // 초기 로딩: localStorage 값들 + 로그인 상태 확인 + trades 조회
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1) 비밀번호 / 잠금 상태
    const savedPassword = localStorage.getItem(PASSWORD_KEY);
    if (savedPassword) {
      setHasPassword(true);
      setIsUnlocked(false);
    } else {
      setHasPassword(false);
      setIsUnlocked(true);
    }

    // 2) 현재가
    const savedPrices = localStorage.getItem(CURRENT_PRICE_KEY);
    if (savedPrices) {
      try {
        const parsed = JSON.parse(savedPrices) as Record<string, number>;
        setCurrentPrices(parsed);
      } catch {
        //
      }
    }

    // 3) 테마
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }

    // 4) 폼 날짜 기본값
    if (!form.date) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(prev => ({ ...prev, date: today }));
    }

    // 5) Supabase Auth 상태 확인 (getUser -> getSession 으로 변경)
    async function bootstrap() {
      setAuthLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('getSession error:', error);
        }

        const session = data?.session ?? null;

        if (session?.user) {
          setCurrentUser(session.user);
          await initTrades(session.user.id);
        } else {
          setCurrentUser(null);
          setTrades([]);
        }
      } catch (err) {
        console.error('bootstrap unexpected error:', err);
      } finally {
        setAuthLoading(false);
      }
    }

    bootstrap();

    // 6) 로그인/로그아웃 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        initTrades(session.user.id);
      } else {
        setCurrentUser(null);
        setTrades([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 현재가/테마는 계속 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CURRENT_PRICE_KEY, JSON.stringify(currentPrices));
  }, [currentPrices]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // 공통 유틸
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

  const showNotify = (type: NotifyType, message: string) => {
    setNotify({ type, message });
    setTimeout(() => setNotify(null), 2500);
  };

  // Supabase에 저장하는 제출 로직 (user_id 기준)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      alert('로그인 후 사용해주세요.');
      return;
    }

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

    const parsedTags =
      form.tags
        ?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0) ?? [];
    const uniqueTags = Array.from(new Set(parsedTags));

    let imageUrl: string | null = null;

    try {
      setIsSubmitting(true);

      // 1) 이미지 파일이 있다면 Supabase Storage에 업로드
      if (chartFile) {
        const fileExt = chartFile.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`; // 유저별 폴더

        const { error: uploadError } = await supabase.storage
          .from('trade-images')
          .upload(filePath, chartFile, {
            contentType: chartFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Failed to upload image:', uploadError);
          alert('이미지 업로드 중 오류가 발생했습니다. 이미지 없이 기록만 저장합니다.');
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('trade-images')
            .getPublicUrl(filePath);

          imageUrl = publicUrlData.publicUrl;
        }
      }

      // 2) DB에 레코드 저장
      const { data, error } = await supabase
        .from('trades')
        .insert([
          {
            user_id: currentUser.id,
            date: form.date,
            symbol: form.symbol.toUpperCase().trim(),
            side: form.side,
            price,
            quantity,
            memo: form.memo,
            tags: uniqueTags,
            image: imageUrl,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Failed to insert trade:', error);
        alert('매매 기록 저장 중 오류가 발생했습니다.');
        return;
      }

      const created: Trade = {
        ...(data as Trade),
        tags: (data as any).tags ?? uniqueTags,
      };

      setTrades(prev => [created, ...prev]);

      // 폼 리셋
      setForm(prev => ({
        ...prev,
        price: '',
        quantity: '',
        memo: '',
        tags: '',
      }));
      setChartFile(null);
      setChartPreview(null);
      if (chartInputRef.current) {
        chartInputRef.current.value = '';
      }

      showNotify('success', '매매 기록이 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    if (!currentUser) {
      alert('로그인 후 다시 시도해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to delete trade:', error);
        alert('삭제 중 오류가 발생했습니다.');
        showNotify('error', '삭제 중 오류가 발생했습니다.');
        return;
      }

      setTrades(prev => prev.filter(t => t.id !== id));
      showNotify('success', '기록을 삭제했습니다.');
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
      showNotify('error', '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('모든 매매 기록을 삭제할까요?')) return;
    if (!currentUser) {
      alert('로그인 후 다시 시도해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Failed to clear trades:', error);
        alert('전체 삭제 중 오류가 발생했습니다.');
        showNotify('error', '전체 삭제 중 오류가 발생했습니다.');
        return;
      }

      setTrades([]);
      setSelectedSymbol('');
      showNotify('success', '모든 기록을 삭제했습니다.');
    } catch (err) {
      console.error(err);
      alert('전체 삭제 중 오류가 발생했습니다.');
      showNotify('error', '전체 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleStartEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setEditForm({
      id: trade.id,
      date: trade.date,
      symbol: trade.symbol,
      side: trade.side,
      price: String(trade.price),
      quantity: String(trade.quantity),
      memo: trade.memo ?? '',
      tags: (trade.tags ?? []).join(','),
    });
  };

  const handleEditChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancelEdit = () => {
    setEditingTrade(null);
    setEditForm({
      id: '',
      date: '',
      symbol: '',
      side: 'BUY',
      price: '',
      quantity: '',
      memo: '',
      tags: '',
    });
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTrade) return;
    if (!currentUser) {
      alert('로그인 후 다시 시도해주세요.');
      return;
    }

    if (!editForm.date || !editForm.symbol || !editForm.price || !editForm.quantity) {
      alert('날짜, 종목, 가격, 수량은 필수입니다.');
      return;
    }

    const price = Number(editForm.price);
    const quantity = Number(editForm.quantity);
    if (Number.isNaN(price) || Number.isNaN(quantity)) {
      alert('가격과 수량은 숫자로 입력해주세요.');
      return;
    }

    const parsedTags =
      editForm.tags
        ?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0) ?? [];
    const uniqueTags = Array.from(new Set(parsedTags));

    try {
      setEditingSaving(true);
      const { data, error } = await supabase
        .from('trades')
        .update({
          date: editForm.date,
          symbol: editForm.symbol.toUpperCase().trim(),
          side: editForm.side,
          price,
          quantity,
          memo: editForm.memo,
          tags: uniqueTags,
        })
        .eq('id', editingTrade.id)
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update trade:', error);
        alert('수정 저장 중 오류가 발생했습니다.');
        return;
      }

      const updated = {
        ...(data as Trade),
        tags: (data as any).tags ?? uniqueTags,
      };

      setTrades(prev =>
        prev.map(t => (t.id === editingTrade.id ? updated : t)),
      );
      handleCancelEdit();
      showNotify('success', '기록이 수정되었습니다.');
    } catch (err) {
      console.error(err);
      alert('수정 저장 중 오류가 발생했습니다.');
      showNotify('error', '기록 수정 중 오류가 발생했습니다.');
    } finally {
      setEditingSaving(false);
    }
  };

  const handleChartFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setChartFile(null);
      setChartPreview(null);
      return;
    }

    const maxSize = 500 * 1024; // 500KB 제한
    if (file.size > maxSize) {
      alert('이미지 용량이 너무 큽니다. 500KB 이하로 줄여서 올려주세요.');
      e.target.value = '';
      setChartFile(null);
      setChartPreview(null);
      return;
    }

    setChartFile(file);

    const previewUrl = URL.createObjectURL(file);
    setChartPreview(previewUrl);
  };

  // CSV
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
      'tags',
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
      (t.tags ?? []).join(','),
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

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  // 잠금
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
    localStorage.setItem(PASSWORD_KEY, newPassword);
    setHasPassword(true);
    setPasswordMessage(
      '비밀번호가 저장되었습니다. 다음 접속부터 잠금 화면이 표시됩니다.',
    );
    setNewPassword('');
    setNewPasswordConfirm('');
  };

  const handleRemovePassword = () => {
    if (!confirm('비밀번호 잠금을 해제할까요?')) return;
    localStorage.removeItem(PASSWORD_KEY);
    setHasPassword(false);
    setPasswordMessage('비밀번호 잠금이 해제되었습니다.');
  };

  // 현재가
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

  // 백업 (상태 기준)
  const handleExportBackup = () => {
    if (trades.length === 0 && Object.keys(currentPrices).length === 0) {
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

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stock-journal-backup-${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupMessage('백업 파일을 다운로드했습니다.');
  };

  const handleImportBackupClick = () => {
    setBackupMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleBackupFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
            '백업 데이터를 불러오면 현재 화면에 보이는 매매 기록과 현재가 설정이 모두 덮어씌워집니다. (Supabase DB에는 자동 반영되지 않습니다.) 진행할까요?',
          )
        ) {
          return;
        }

        const importedTrades = (data as any).trades as Trade[];
        const normalized = importedTrades.map(t => ({
          ...t,
          tags: t.tags ?? [],
        }));

        setTrades(normalized);
        setCurrentPrices(
          (data as any).currentPrices as Record<string, number>,
        );
        setBackupMessage(
          '백업 데이터를 성공적으로 불러왔습니다. (DB 반영은 별도 작업이 필요합니다.)',
        );
      } catch (err) {
        console.error(err);
        alert(
          '백업 파일을 읽는 중 오류가 발생했습니다. 올바른 백업 파일인지 확인해주세요.',
        );
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // 태그 목록
  const allTags: string[] = Array.from(
    new Set(trades.flatMap(t => t.tags ?? [])),
  ).sort((a, b) => a.localeCompare(b));

  // 필터링
  const symbolFilteredTrades = trades.filter(t =>
    filterSymbol
      ? t.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
      : true,
  );

  const tagFilteredTrades = symbolFilteredTrades.filter(t => {
    if (!filterTag) return true;
    const tags = (t.tags ?? []).map(tag => tag.toLowerCase());
    const keyword = filterTag.toLowerCase();
    return tags.some(tag => tag.includes(keyword));
  });

  const dateFilteredTrades = tagFilteredTrades.filter(t => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });

  const displayedTrades = dateFilteredTrades;

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

  const hasDateRangeError = dateFrom && dateTo && dateFrom > dateTo;

  // 종목별 요약 (전체 기준)
  const symbolSummaries: SymbolSummary[] = (() => {
    if (trades.length === 0) return [];

    const sortedTrades = [...trades].sort((a, b) => {
      if (a.date === b.date) return a.id.localeCompare(b.id);
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
        const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;

        const sellQty = t.quantity;
        const realizedThis = (t.price - prevAvgCost) * sellQty;

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

    result.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return result;
  })();

  // 태그 통계 (거래 수)
  const tagStats = (() => {
    const map = new Map<string, number>();
    for (const t of trades) {
      (t.tags ?? []).forEach(tag => {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      });
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  // 월별 그룹
  const monthGroups = (() => {
    if (displayedTrades.length === 0) return [];

    const map = new Map<string, Trade[]>();

    for (const t of displayedTrades) {
      const key = t.date && t.date.length >= 7 ? t.date.slice(0, 7) : '기타';
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }

    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    return keys.map(key => ({
      key,
      label: formatMonthLabel(key),
      trades: map.get(key)!,
      count: map.get(key)!.length,
    }));
  })();

  const mainClass =
    'min-h-screen flex justify-center px-4 py-8 ' +
    (darkMode ? 'bg-slate-900' : 'bg-slate-100');

  const containerClass =
    'w-full max-w-4xl shadow-sm rounded-xl p-5 space-y-5 ' +
    (darkMode
      ? 'bg-slate-900 border border-slate-700 text-slate-100'
      : 'bg-white text-slate-900');

  const tableHeaderBg =
    'border-b text-xs md:text-sm ' +
    (darkMode
      ? 'bg-slate-800 border-slate-700'
      : 'bg-slate-50 border-slate-200');

  // 🚩 1단계: 로그인 상태 확인
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-sm text-slate-500">로그인 상태를 확인하는 중입니다…</div>
      </main>
    );
  }

  // 로그인 안 되어 있으면 로그인 화면
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
          <h1 className="text-lg font-bold">나만 보는 주식 매매 일지</h1>
          <p className="text-xs text-slate-500">
            이메일 로그인 후, 어디서 접속해도 같은 매매 일지를 불러올 수 있습니다.
          </p>
          <LoginForm />
        </div>
      </main>
    );
  }

  // 🚩 2단계: 잠금 화면
  if (!isUnlocked && hasPassword) {
    return (
      <main className="min-h-screen bg-slate-100 flex justify-center items-center px-4">
        <div className="w-full max-w-sm bg-white shadow-md rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-center">
            주식 매매 일지 잠금 해제
          </h1>
          <p className="text-xs text-slate-500 text-center">
            이 브라우저에 저장된 비밀번호를 입력하면 매매 일지를 볼 수
            있습니다.
          </p>
          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-600">비밀번호</label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
                placeholder="비밀번호 입력"
              />
            </div>
            {passwordMessage && (
              <div className="text-xs text-rose-500">{passwordMessage}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white text-sm font-medium rounded-lg py-2"
            >
              잠금 해제
            </button>
          </form>
          <p className="text-[10px] text-slate-400 text-center">
            비밀번호는 이 브라우저의 localStorage에만 저장됩니다.
          </p>
        </div>
      </main>
    );
  }

  // 🔓 메인 화면 + 모달
  return (
    <>
      {/* 이미지 미리보기 모달 */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className={
              'max-w-[90vw] max-h-[90vh] rounded-lg overflow-hidden shadow-lg ' +
              (darkMode ? 'bg-slate-900' : 'bg-white')
            }
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40">
              <span className="text-xs text-slate-400">이미지 파일</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-[11px] px-2 py-1 rounded border border-slate-500 text-slate-200 hover:bg-slate-700"
              >
                닫기
              </button>
            </div>
            <div className="p-2 flex items-center justify-center">
              <img
                src={previewImage}
                alt="이미지 파일"
                className="max-w-[86vw] max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <main className={mainClass}>
        <div className={containerClass}>
          {/* 숨겨진 파일 입력 (백업 복원용) */}
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            onChange={handleBackupFileChange}
            className="hidden"
          />

          {/* 헤더 */}
          <header className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
            <div>
              <h1 className="text-xl font-bold">나만 보는 주식 매매 일지</h1>
              <p className="text-xs text-slate-500">
                매매 기록은 Supabase 서버 DB에 계정별로 저장되고, 비밀번호/설정은 이
                브라우저에만 저장되는 개인용 매매 노트입니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="text-[10px] px-2 py-1 rounded border border-slate-300 text-slate-500 hover:bg-slate-50"
                >
                  로그아웃
                </button>
              </div>
              <span className="text-[10px] text-slate-400">
                잠금 상태: {hasPassword ? '비밀번호 설정됨' : '설정 안 됨'}
              </span>
            </div>
          </header>

          {/* 탭 */}
          <nav
            className={
              'flex text-xs md:text-sm rounded-full overflow-hidden border ' +
              (darkMode
                ? 'border-slate-700 bg-slate-900'
                : 'border-slate-200 bg-slate-50')
            }
          >
            {[
              { id: 'journal', label: '기록' },
              { id: 'stats', label: '통계' },
              { id: 'settings', label: '설정·백업' },
            ].map(tab => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={
                    'flex-1 px-3 py-1.5 text-center ' +
                    (selected ? 'bg-blue-600 text-white' : 'text-slate-500')
                  }
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* JOURNAL 탭 */}
          {activeTab === 'journal' && (
            <section className="space-y-4">
              {/* 간단 요약 */}
              <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                <div
                  className={
                    'border rounded-lg p-3 ' +
                    (darkMode
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-slate-50')
                  }
                >
                  <div className="text-slate-500">필터 후 거래 건수</div>
                  <div className="text-lg font-semibold">
                    {tradesLoading ? '로딩 중…' : `${displayedTrades.length} 건`}
                  </div>
                </div>
                <div
                  className={
                    'border rounded-lg p-3 ' +
                    (darkMode
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-slate-50')
                  }
                >
                  <div className="text-slate-500">매수 합계</div>
                  <div className="text-lg font-semibold">
                    {formatNumber(stats.buy)} 원
                  </div>
                </div>
                <div
                  className={
                    'border rounded-lg p-3 ' +
                    (darkMode
                      ? 'border-slate-700 bg-slate-900'
                      : 'border-slate-200 bg-slate-50')
                  }
                >
                  <div className="text-slate-500">순 현금 흐름</div>
                  <div
                    className={
                      'text-lg font-semibold ' +
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
              </div>

              {/* 빠른 입력 카드 */}
              <div
                className={
                  'border rounded-lg p-3 space-y-3 ' +
                  (darkMode
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-white')
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    새 매매 기록 추가
                  </span>
                  <span className="text-[11px] text-slate-400">
                    최소 정보만 입력하고 빠르게 쌓는 용도
                  </span>
                </div>

                {/* 입력 폼 */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* 1줄: 날짜 + 요일, 종목, 구분 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 날짜 + 요일 박스 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        날짜
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          name="date"
                          value={form.date}
                          onChange={handleChange}
                          className={
                            'flex-1 border rounded px-2 py-1 text-xs bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        />
                        <div
                          className={
                            'px-2 min-w-[70px] text-center text-[11px] flex items-center justify-center rounded ' +
                            (darkMode
                              ? 'bg-slate-800 text-slate-200'
                              : 'bg-slate-100 text-slate-600')
                          }
                        >
                          {weekdayLabel || '요일'}
                        </div>
                      </div>
                    </div>

                    {/* 종목 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        종목
                      </label>
                      <input
                        type="text"
                        name="symbol"
                        placeholder="예: 삼성전자"
                        value={form.symbol}
                        onChange={handleChange}
                        className={
                          'border rounded px-2 py-1 text-xs bg-transparent ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                      />
                    </div>

                    {/* 구분 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        구분
                      </label>
                      <select
                        name="side"
                        value={form.side}
                        onChange={handleChange}
                        className={
                          'border rounded px-2 py-1 text-xs bg-transparent ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                      >
                        <option value="BUY">매수</option>
                        <option value="SELL">매도</option>
                      </select>
                    </div>
                  </div>

                  {/* 2줄: 가격, 수량, 태그 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        가격
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        className={
                          'border rounded px-2 py-1 text-xs text-right bg-transparent ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        수량
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={form.quantity}
                        onChange={handleChange}
                        className={
                          'border rounded px-2 py-1 text-xs text-right bg-transparent ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        태그 (쉼표로 구분, 예: 단타, 장기)
                      </label>
                      <input
                        type="text"
                        name="tags"
                        value={form.tags}
                        onChange={handleChange}
                        className={
                          'border rounded px-2 py-1 text-xs bg-transparent ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                      />
                    </div>
                  </div>

                  {/* 메모 + 이미지 파일 라인 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* 메모 */}
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[11px] text-slate-500">
                        메모 (선택)
                      </label>
                      <textarea
                        name="memo"
                        value={form.memo}
                        onChange={handleChange}
                        className={
                          'border rounded px-2 py-1 text-xs bg-transparent resize-none ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                        rows={2}
                      />
                    </div>

                    {/* 이미지 파일 (선택) */}
                    <div className="flex flex-col gap-1 md:col-span-1">
                      <label className="text-[11px] text-slate-500">
                        이미지 파일 (선택)
                      </label>

                      <input
                        ref={chartInputRef}
                        id="chart-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleChartFileChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => chartInputRef.current?.click()}
                        className={
                          'w-full flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-[11px] ' +
                          (darkMode
                            ? 'border-slate-600 bg-slate-900 hover:bg-slate-800'
                            : 'border-slate-300 bg-white hover:bg-slate-50')
                        }
                      >
                        <span className="font-medium">
                          파일 선택하기
                        </span>
                      </button>

                      {chartPreview && (
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={
                              'w-12 h-12 rounded border overflow-hidden flex items-center justify-center ' +
                              (darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-300')
                            }
                          >
                            <img
                              src={chartPreview}
                              alt="선택된 파일"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] text-slate-600">
                              선택된 파일 미리보기
                            </span>
                            <span className="text-[10px] text-emerald-500">
                              기록 저장 시 Supabase Storage에 업로드됩니다.
                            </span>
                          </div>
                        </div>
                      )}

                      {!chartPreview && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          당시 보던 차트 화면을 캡처해서 올려두면 복기할 때 도움이 됩니다.
                          (예: 500KB 이하의 작은 캡처 이미지)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 기록 추가 버튼 라인 */}
                  <div
                    className={
                      'flex items-center justify-between rounded-lg px-3 py-2 mt-1 ' +
                      (darkMode
                        ? 'bg-slate-800/70'
                        : 'bg-slate-50 border border-slate-200')
                    }
                  >
                    <span className="text-[11px] text-slate-500">
                      👉 내용 입력 후{' '}
                      <span className="font-semibold text-slate-700">
                        ‘기록 추가’
                      </span>
                      를 누르면 매매 일지가 저장됩니다.
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={
                        'flex items-center gap-1 px-6 py-2 text-sm font-semibold rounded-lg shadow transition ' +
                        (isSubmitting
                          ? 'bg-slate-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800')
                      }
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>저장 중...</span>
                        </span>
                      ) : (
                        <>
                          <span>＋</span>
                          <span>기록 추가</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* 선택한 기록 수정 카드 */}
              {editingTrade && (
                <div
                  className={
                    'border rounded-lg p-3 space-y-3 ' +
                    (darkMode
                      ? 'border-amber-500/60 bg-slate-900'
                      : 'border-amber-400/60 bg-amber-50')
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      선택한 기록 수정: {editingTrade.symbol} ({editingTrade.date})
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      수정 취소
                    </button>
                  </div>

                  <form onSubmit={handleEditSubmit} className="space-y-3 text-xs md:text-sm">
                    {/* 1줄: 날짜, 종목, 구분 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">
                          날짜
                        </label>
                        <input
                          type="date"
                          name="date"
                          value={editForm.date}
                          onChange={handleEditChange}
                          className={
                            'border rounded px-2 py-1 text-xs bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">
                          종목
                        </label>
                        <input
                          type="text"
                          name="symbol"
                          value={editForm.symbol}
                          onChange={handleEditChange}
                          className={
                            'border rounded px-2 py-1 text-xs bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">
                          구분
                        </label>
                        <select
                          name="side"
                          value={editForm.side}
                          onChange={handleEditChange}
                          className={
                            'border rounded px-2 py-1 text-xs bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        >
                          <option value="BUY">매수</option>
                          <option value="SELL">매도</option>
                        </select>
                      </div>
                    </div>

                    {/* 2줄: 가격, 수량, 태그 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">
                          가격
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={editForm.price}
                          onChange={handleEditChange}
                          className={
                            'border rounded px-2 py-1 text-xs text-right bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">
                          수량
                        </label>
                        <input
                          type="number"
                          name="quantity"
                          value={editForm.quantity}
                          onChange={handleEditChange}
                          className={
                            'border rounded px-2 py-1 text-xs text-right bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-slate-500">
                          태그 (쉼표로 구분)
                        </label>
                        <input
                          type="text"
                          name="tags"
                          value={editForm.tags}
                          onChange={handleEditChange}
                          className={
                            'border rounded px-2 py-1 text-xs bg-transparent ' +
                            (darkMode ? 'border-slate-600' : '')
                          }
                        />
                      </div>
                    </div>

                    {/* 메모 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-500">
                        메모
                      </label>
                      <textarea
                        name="memo"
                        value={editForm.memo}
                        onChange={handleEditChange}
                        className={
                          'border rounded px-2 py-1 text-xs bg-transparent resize-none ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        선택한 매매 기록의 기본 정보만 수정합니다. (이미지 변경은 추후 지원 예정)
                      </span>
                      <button
                        type="submit"
                        disabled={editingSaving}
                        className={
                          'px-4 py-2 rounded-lg text-xs font-semibold shadow ' +
                          (editingSaving
                            ? 'bg-slate-400 text-white'
                            : 'bg-amber-500 text-white hover:bg-amber-600')
                        }
                      >
                        {editingSaving ? '저장 중...' : '수정 저장'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 필터 카드 */}
              <div
                className={
                  'border rounded-lg p-3 space-y-2 text-xs md:text-sm ' +
                  (darkMode
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-slate-50')
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">보기 필터</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSymbol('');
                      setFilterTag('');
                      resetDateFilter();
                    }}
                    className="text-[11px] text-slate-400 underline underline-offset-2"
                  >
                    전체 초기화
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-xs">기간</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className={
                        'border rounded px-2 py-1 text-[11px] bg-transparent ' +
                        (darkMode ? 'border-slate-600' : '')
                      }
                    />
                    <span className="text-[11px] text-slate-400">~</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className={
                        'border rounded px-2 py-1 text-[11px] bg-transparent ' +
                        (darkMode ? 'border-slate-600' : '')
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-xs">종목</span>
                    <input
                      type="text"
                      placeholder="예: 삼성전자"
                      value={filterSymbol}
                      onChange={e => setFilterSymbol(e.target.value)}
                      className={
                        'border rounded px-2 py-1 text-xs bg-transparent ' +
                        (darkMode ? 'border-slate-600' : '')
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 text-xs">태그</span>
                    <input
                      type="text"
                      placeholder="예: 단타"
                      value={filterTag}
                      onChange={e => setFilterTag(e.target.value)}
                      className={
                        'border rounded px-2 py-1 text-xs bg-transparent ' +
                        (darkMode ? 'border-slate-600' : '')
                      }
                    />
                  </div>
                </div>

                {hasDateRangeError && (
                  <div className="text-xs text-rose-500">
                    시작일이 종료일보다 늦습니다. 날짜 범위를 다시
                    확인해주세요.
                  </div>
                )}

                {allTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1 text-[11px]">
                    <span className="text-slate-500">자주 쓰는 태그:</span>
                    {allTags.map(tag => {
                      const selected =
                        filterTag.toLowerCase() === tag.toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setFilterTag(selected ? '' : tag)}
                          className={
                            'px-2 py-0.5 rounded-full border ' +
                            (selected
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-slate-300 text-slate-600 hover:bg-slate-100')
                          }
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 선택 종목 요약 */}
              <div
                className={
                  'border rounded-lg p-3 text-xs md:text-sm ' +
                  (darkMode
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-slate-50')
                }
              >
                {selectedSymbol ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        선택 종목 요약: {selectedSymbol}
                      </span>
                      <button
                        type="button"
                        className="text-[11px] text-slate-400 underline"
                        onClick={() => setSelectedSymbol('')}
                      >
                        선택 해제
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-slate-500 text-[11px]">
                          매수 금액
                        </div>
                        <div className="text-sm font-semibold">
                          {formatNumber(symbolStats.buy)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px]">
                          매도 금액
                        </div>
                        <div className="text-sm font-semibold">
                          {formatNumber(symbolStats.sell)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[11px]">
                          순 현금 흐름
                        </div>
                        <div
                          className={
                            'text-sm font-semibold ' +
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
                  <span className="text-[11px] text-slate-500">
                    아래 목록에서 종목 이름을 클릭하면 이곳에 해당 종목 요약이
                    표시됩니다.
                  </span>
                )}
              </div>

              {/* 기록 목록 (월별 그룹 + 고정 높이 스크롤) */}
              <div
                className={
                  'border rounded-lg ' +
                  (darkMode ? 'border-slate-700' : 'border-slate-200')
                }
              >
                {tradesError && (
                  <div className="px-3 py-2 text-xs text-rose-500 border-b border-slate-200">
                    {tradesError}
                  </div>
                )}
                <div className="h-[420px] overflow-y-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead
                      className={
                        'sticky top-0 z-10 ' +
                        (darkMode
                          ? 'bg-slate-800 border-b border-slate-700'
                          : 'bg-slate-50 border-b border-slate-200')
                      }
                    >
                      <tr>
                        <th className="px-2 py-2 text-left">날짜</th>
                        <th className="px-2 py-2 text-left">종목</th>
                        <th className="px-2 py-2 text-center">구분</th>
                        <th className="px-2 py-2 text-right">가격</th>
                        <th className="px-2 py-2 text-right">수량</th>
                        <th className="px-2 py-2 text-right">금액</th>
                        <th className="px-2 py-2 text-left">태그</th>
                        <th className="px-2 py-2 text-left">파일</th>
                        <th className="px-2 py-2 text-left">메모</th>
                        <th className="px-2 py-2 text-center">수정</th>
                        <th className="px-2 py-2 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradesLoading ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-2 py-6 text-center text-slate-400"
                          >
                            매매 기록을 불러오는 중입니다…
                          </td>
                        </tr>
                      ) : tradesError ? (
                        <tr>
                          <td colSpan={11} className="px-2 py-6 text-center text-rose-400">
                            {tradesError}
                          </td>
                        </tr>
                      ) : monthGroups.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-2 py-6 text-center text-slate-400"
                          >
                            현재 조건에 해당하는 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        monthGroups.map(group => {
                          const isOpen = openMonths[group.key] ?? true;
                          const monthRowClass = darkMode
                            ? 'bg-slate-900 border-t border-slate-700'
                            : 'bg-slate-100 border-t border-slate-200';

                          return (
                            <React.Fragment key={group.key}>
                              {/* 월 헤더 행 */}
                              <tr>
                                <td
                                  colSpan={11}
                                  className={
                                    monthRowClass +
                                    ' px-2 py-1.5 text-[11px] md:text-xs cursor-pointer'
                                  }
                                  onClick={() => toggleMonth(group.key)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500">
                                        {isOpen ? '▼' : '▶'}
                                      </span>
                                      <span className="font-semibold">
                                        {group.label}
                                      </span>
                                      <span className="text-slate-400">
                                        ({group.count}건)
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      클릭해서 {isOpen ? '접기' : '펼치기'}
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* 월별 실제 기록 행들 */}
                              {isOpen &&
                                group.trades.map(trade => {
                                  const amount =
                                    trade.price * trade.quantity;
                                  const isSelected =
                                    trade.symbol === selectedSymbol;
                                  const tags = trade.tags ?? [];

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
                                            handleSymbolClick(trade.symbol)
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
                                          {trade.side === 'BUY' ? '매수' : '매도'}
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
                                      <td className="px-2 py-2">
                                        {tags.length === 0 ? (
                                          <span className="text-slate-400">
                                            -
                                          </span>
                                        ) : (
                                          <div className="flex flex-wrap gap-1">
                                            {tags.map(tag => (
                                              <button
                                                key={tag}
                                                type="button"
                                                onClick={() =>
                                                  setFilterTag(tag)
                                                }
                                                className="px-1.5 py-0.5 rounded-full border border-slate-300 text-[10px] text-slate-600"
                                              >
                                                #{tag}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 text-left">
                                        {trade.image ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setPreviewImage(trade.image!)
                                            }
                                            className="text-[11px] text-blue-500 underline underline-offset-2"
                                          >
                                            보기
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-400">
                                            -
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-2 py-2 max-w-xs">
                                        <span className="line-clamp-2">
                                          {trade.memo}
                                        </span>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(trade)}
                                          className="text-[11px] text-blue-500 hover:underline"
                                        >
                                          수정
                                        </button>
                                      </td>
                                      <td className="px-2 py-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(trade.id)}
                                          className="text-[11px] text-slate-400 hover:text-red-500"
                                        >
                                          삭제
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* STATS 탭 */}
          {activeTab === 'stats' && (
            <section className="space-y-4 text-xs md:text-sm">
              {symbolSummaries.length === 0 ? (
                <p className="text-slate-500">
                  아직 입력된 매매 기록이 없습니다. 먼저 &quot;기록&quot; 탭에서
                  몇 개 입력해 보세요.
                </p>
              ) : (
                <>
                  <div
                    className={
                      'border rounded-lg p-3 space-y-2 ' +
                      (darkMode
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-200 bg-slate-50')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        종목별 보유/손익 요약
                      </span>
                      <span className="text-[11px] text-slate-400">
                        현재가는 이 화면에서 직접 입력
                      </span>
                    </div>
                    <div
                      className={
                        'border rounded-lg overflow-x-auto ' +
                        (darkMode
                          ? 'border-slate-700'
                          : 'border-slate-200')
                      }
                    >
                      <table className="w-full text-xs md:text-sm min-w-[720px]">
                        <thead className={tableHeaderBg}>
                          <tr>
                            <th className="px-2 py-2 text-left">종목</th>
                            <th className="px-2 py-2 text-right">보유수량</th>
                            <th className="px-2 py-2 text-right">평단가</th>
                            <th className="px-2 py-2 text-right">총 매수</th>
                            <th className="px-2 py-2 text-right">총 매도</th>
                            <th className="px-2 py-2 text-right">
                              실현손익
                            </th>
                            <th className="px-2 py-2 text-right">현재가</th>
                            <th className="px-2 py-2 text-right">
                              평가금액
                            </th>
                            <th className="px-2 py-2 text-right">
                              평가손익
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
                                <td className="px-2 py-2">{s.symbol}</td>
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
                                        'border rounded px-1 py-0.5 text-right w-24 text-[11px] ' +
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
                                    <span className="text-slate-400">-</span>
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
                  </div>

                  {/* 태그 통계 */}
                  <div
                    className={
                      'border rounded-lg p-3 space-y-2 ' +
                      (darkMode
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-200 bg-slate-50')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        태그별 사용 현황
                      </span>
                      <span className="text-[11px] text-slate-400">
                        전략 / 계좌 / 심리 상태 등을 태그로 관리해보세요.
                      </span>
                    </div>
                    {tagStats.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        아직 태그가 없습니다. 기록 입력 시 &quot;태그&quot; 칸에
                        전략명을 적어보세요.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {tagStats.map(([tag, count]) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setFilterTag(tag);
                              setActiveTab('journal');
                            }}
                            className="px-3 py-1 rounded-full border border-slate-300 text-[11px] text-slate-700 bg-white"
                          >
                            #{tag}{' '}
                            <span className="text-slate-400">
                              ({count}건)
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* SETTINGS 탭 */}
          {activeTab === 'settings' && (
            <section className="space-y-4 text-xs md:text-sm">
              {/* 비밀번호 설정 */}
              <div
                className={
                  'border rounded-lg p-3 space-y-3 ' +
                  (darkMode
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-slate-50')
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    잠금 비밀번호 설정
                  </span>
                  {hasPassword && (
                    <span className="text-[11px] text-emerald-500">
                      현재 비밀번호가 설정되어 있습니다.
                    </span>
                  )}
                </div>
                <form
                  onSubmit={handleSavePassword}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">
                      새 비밀번호
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className={
                        'border rounded px-2 py-1 text-xs bg-transparent ' +
                        (darkMode ? 'border-slate-600' : '')
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-500">
                      새 비밀번호 확인
                    </label>
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={e =>
                        setNewPasswordConfirm(e.target.value)
                      }
                      className={
                        'border rounded px-2 py-1 text-xs bg-transparent ' +
                        (darkMode ? 'border-slate-600' : '')
                      }
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
                  <div className="text-[11px] text-slate-300">
                    {passwordMessage}
                  </div>
                )}
                <p className="text-[10px] text-slate-400">
                  이 잠금 기능은 기본적인 사생활 보호용입니다. 비밀번호는 이
                  브라우저 localStorage에만 저장되며, 매매 기록(DB 데이터)과는
                  별도입니다.
                </p>
              </div>

              {/* 데이터 관리 */}
              <div
                className={
                  'border rounded-lg p-3 space-y-2 ' +
                  (darkMode
                    ? 'border-slate-700 bg-slate-900'
                    : 'border-slate-200 bg-slate-50')
                }
              >
                <span className="font-semibold text-sm">데이터 관리</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 bg-white"
                  >
                    CSV 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 bg-white"
                  >
                    JSON 백업 다운로드 (현재 화면 기준)
                  </button>
                  <button
                    type="button"
                    onClick={handleImportBackupClick}
                    className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 bg-white"
                  >
                    백업 파일 불러오기 (상태만 반영)
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 border rounded-lg text-xs text-rose-500 bg-white"
                  >
                    모든 기록 삭제 (DB 포함)
                  </button>
                </div>
                {backupMessage && (
                  <p className="text-[11px] text-slate-400">
                    {backupMessage}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  JSON 백업에는 현재 화면에 표시된 매매 기록과 종목별 현재가가
                  함께 저장됩니다. 이 기능은 로컬 상태 복원용이며, Supabase DB
                  데이터와는 별도로 동작합니다.
                </p>
              </div>

              <p className="text-[10px] text-slate-400">
                매매 기록은 Supabase 데이터베이스에 저장되며, 비밀번호·테마·현재가
                정보 등 일부 설정은 이 브라우저의 localStorage에만 저장됩니다.
              </p>
            </section>
          )}
        </div>
        {notify && (
          <div className="fixed bottom-4 right-4 z-50">
            <div
              className={
                'min-w-[220px] max-w-xs px-4 py-3 rounded-lg shadow-lg text-xs md:text-sm ' +
                (notify.type === 'success'
                  ? 'bg-emerald-500 text-white'
                  : notify.type === 'error'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-700 text-white')
              }
            >
              <div className="flex items-start justify-between gap-2">
                <span>{notify.message}</span>
                <button
                  type="button"
                  onClick={() => setNotify(null)}
                  className="text-[10px] opacity-80 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

/** 이메일 로그인 폼 (매직 링크) */
function LoginForm() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setSending(true);
      setMsg(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined'
              ? window.location.origin
              : undefined,
        },
      });
      if (error) {
        console.error(error);
        setMsg('로그인 메일 전송 중 오류가 발생했습니다.');
      } else {
        setMsg('로그인 링크가 이메일로 전송되었습니다. 메일함을 확인해주세요.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSendMagicLink} className="space-y-3 text-xs">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-slate-600">이메일</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="border rounded px-2 py-1 text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={sending || !email}
        className={
          'w-full rounded-lg py-2 text-xs font-semibold ' +
          (sending
            ? 'bg-slate-400 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700')
        }
      >
        {sending ? '메일 전송 중...' : '로그인 링크 보내기'}
      </button>
      {msg && <p className="text-[11px] text-slate-500">{msg}</p>}
      <p className="text-[10px] text-slate-400">
        이 서비스는 Supabase Auth를 사용하며, 비밀번호 없이 이메일 링크로만 로그인합니다.
      </p>
    </form>
  );
}
