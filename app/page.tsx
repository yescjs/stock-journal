'use client';

import React, {
  useEffect,
  useState,
  useRef,
  ChangeEvent,
  FormEvent,
} from 'react';
import { createClient, type User, AuthApiError, AuthWeakPasswordError } from '@supabase/supabase-js';

type TradeSide = 'BUY' | 'SELL';

interface Trade {
  id: string;            // Supabase uuid 또는 guest-... 문자열
  date: string;          // YYYY-MM-DD
  symbol: string;
  side: TradeSide;
  price: number;
  quantity: number;
  memo: string;
  tags?: string[];
  image?: string;        // 이미지 파일 (URL 또는 data URL)
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
  winCount: number;
  lossCount: number;
  evenCount: number;
  tradeCount: number;
  winRate: number;
}

interface TagPerf {
  tag: string;
  tradeCount: number;      // 이 태그가 달린 SELL 거래 수
  winCount: number;        // 이익
  lossCount: number;       // 손실
  evenCount: number;       // 본전
  realizedPnL: number;     // 실현손익 합계
  avgPnLPerTrade: number;  // 거래 1건당 평균 손익
  winRate: number;         // 승률 (%)
}

type PnLChartMode = 'daily' | 'monthly';

type PnLPoint = {
  key: string;   // YYYY-MM-DD 또는 YYYY-MM
  label: string; // 화면에 찍을 라벨
  value: number; // 해당 날짜/월의 실현 손익
};


// localStorage용 키 (비밀번호, 현재가, 테마, 게스트용 매매기록)
const CURRENT_PRICE_KEY = 'stock-journal-current-prices-v1';
const THEME_KEY = 'stock-journal-theme-v1';
const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';
const OPEN_MONTHS_KEY = 'stock-journal-open-months-v1';

type ActiveTab = 'journal' | 'stats' | 'settings';
type SortKey = 'date' | 'symbol' | 'amount';
type SymbolSortKey =
  | 'symbol'
  | 'positionQty'
  | 'avgCost'
  | 'totalBuyAmount'
  | 'totalSellAmount'
  | 'realizedPnL'
  | 'currentPrice'
  | 'positionValue'
  | 'unrealizedPnL'
  | 'winRate';

type TagSortKey =
  | 'tag'
  | 'tradeCount'
  | 'winRate'
  | 'realizedPnL'
  | 'avgPnLPerTrade';

type SortState = {
  key: SortKey;
  dir: 'asc' | 'desc';
};

type TagFilterMode = 'AND' | 'OR';

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

// File → data URL (게스트 모드에서 이미지 저장용)
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = err => reject(err);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);        // 로그인 계정의 DB 기록
  const [guestTrades, setGuestTrades] = useState<Trade[]>([]); // 게스트 모드 로컬 기록
  const [guestLoaded, setGuestLoaded] = useState(false); // 게스트 기록 로딩 완료 여부
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
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>('OR');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

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

  // 타입 & 상태
  const [pnlChartMode, setPnlChartMode] = useState<PnLChartMode>('daily');

  // 정렬 상태
const [sort, setSort] = useState<SortState>({
  key: 'date',
  dir: 'desc',
});

  // STATS 탭 - 종목표 정렬
  const [symbolSort, setSymbolSort] = useState<{
    key: SymbolSortKey;
    dir: 'asc' | 'desc';
  }>({
    key: 'symbol',
    dir: 'asc',
  });

  // STATS 탭 - 태그표 정렬
  const [tagSort, setTagSort] = useState<{
    key: TagSortKey;
    dir: 'asc' | 'desc';
  }>({
    key: 'tradeCount',
    dir: 'desc',
  });

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
  const [notify, setNotify] = useState<{
    type: NotifyType;
    message: string;
  } | null>(null);

  // 전체 화면 모달용 이미지
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 로그인 모달
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 게스트 → 계정 마이그레이션
  const [isMigrating, setIsMigrating] = useState(false);

  const weekdayLabel = getKoreanWeekdayLabel(form.date);

  // 현재 화면에서 사용하는 "기준 매매 기록"
  const baseTrades = currentUser ? trades : guestTrades;

  // 기록 추가 폼 위치
  const addFormRef = useRef<HTMLDivElement | null>(null);

  // 상태 & 핸들러 추가
  const [symbolSuggestions, setSymbolSuggestions] = useState<string[]>([]);
  const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);

  // 자주 쓰는 기본 심볼 리스트 (국내 + 해외 예시)
  const STATIC_SYMBOLS: string[] = [
    // 국내 주식
    '삼성전자',
    'SK하이닉스',
    'LG에너지솔루션',
    'NAVER',
    '카카오',
    '삼성바이오로직스',

    // 미국 주식 (티커/이름 혼용)
    'AAPL',
    'MSFT',
    'NVDA',
    'TSLA',
    'AMZN',
    'META',

    // ETF 예시
    'QQQ',
    'SPY',
    'SOXL',
    'TQQQ',
  ];

  // 태그 문자열(form.tags)을 쉼표 기준 배열로 파싱
  function parseTagString(str: string | undefined | null): string[] {
    if (!str) return [];
    return str
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
  }

  // 태그 하나를 추가/제거하면서 form.tags 갱신
  const toggleFormTag = (tag: string) => {
    setForm(prev => {
      const currentTags = parseTagString(prev.tags);
      const lower = tag.toLowerCase();

      const has = currentTags.some(t => t.toLowerCase() === lower);
      const nextTags = has
        ? currentTags.filter(t => t.toLowerCase() !== lower)
        : [...currentTags, tag];

      return {
        ...prev,
        tags: nextTags.join(','),
      };
    });
  };

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

  // 로그아웃 후 상태 초기화
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setTrades([]); // 로그아웃 시 DB 목록 비우기 (게스트 기록은 유지)
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  // 게스트 기록 로컬스토리지 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!guestLoaded) return;
    localStorage.setItem(GUEST_TRADES_KEY, JSON.stringify(guestTrades));
  }, [guestTrades, guestLoaded]);

  // 초기 로딩: localStorage 값들 + 로그인 상태 확인 + trades 조회
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 0) 게스트 모드 매매 기록 로드
    const guestRaw = localStorage.getItem(GUEST_TRADES_KEY);
    if (guestRaw) {
      try {
        const parsed = JSON.parse(guestRaw) as Trade[];
        const normalized = parsed.map(t => ({
          ...t,
          tags: t.tags ?? [],
        }));
        setGuestTrades(normalized);
      } catch (err) {
        console.error('Failed to parse guest trades from localStorage', err);
      }
    }

    // 게스트 기록 로딩 완료 플래그
    setGuestLoaded(true);

    // 1) 현재가
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

    // 4) 월별 접기 상태 로드
    try {
      const savedOpenMonths = localStorage.getItem(OPEN_MONTHS_KEY);
      if (savedOpenMonths) {
        const parsed = JSON.parse(savedOpenMonths) as Record<string, boolean>;
        if (parsed && typeof parsed === 'object') {
          setOpenMonths(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to parse openMonths from localStorage', err);
    }

    // 4) 폼 날짜 기본값
    if (!form.date) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(prev => ({ ...prev, date: today }));
    }

    // 5) Supabase Auth 상태 확인
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

  // 월별 접기 상태 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(OPEN_MONTHS_KEY, JSON.stringify(openMonths));
    } catch (err) {
      console.error('Failed to save openMonths to localStorage', err);
    }
  }, [openMonths]);

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

  // 종목 전용 핸들러
  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    // 기존 폼 상태 업데이트 (name="symbol" 그대로 가정)
    setForm(prev => ({
      ...prev,
      symbol: value,
    }));

    // 아무것도 안 적혀있으면 추천 숨김
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setSymbolSuggestions([]);
      setShowSymbolSuggestions(false);
      return;
    }

    // 1) 현재 저장된 매매 기록(로그인/게스트 공통)에서 종목 이름 추출
    const fromTrades = Array.from(
      new Set(
        baseTrades
          .map(t => t.symbol)
          .filter(
            sym =>
              sym &&
              sym.toLowerCase().includes(trimmed),
          ),
      ),
    );

    // 2) 기본 심볼 리스트(STATIC_SYMBOLS)에서 검색
    const fromStatic = STATIC_SYMBOLS.filter(sym =>
      sym.toLowerCase().includes(trimmed),
    );

    // 3) 둘을 합치고, 중복 제거한 뒤 상위 5개만 사용
    const uniq = Array.from(new Set([...fromTrades, ...fromStatic])).slice(0, 5);

    setSymbolSuggestions(uniq);
    setShowSymbolSuggestions(uniq.length > 0);
  };

  // 종목 클릭 핸들러
  const handleSymbolRowClick = (symbol: string) => {
  setSelectedSymbol(prev => {
    const next = prev === symbol ? '' : symbol;

    // 심볼 필터도 같이 맞춰 주기
    setFilterSymbol(current => (current === symbol ? '' : symbol));

    return next;
  });
};

  const showNotify = (type: NotifyType, message: string) => {
    setNotify({ type, message });
    setTimeout(() => setNotify(null), 2500);
  };

  // Supabase / 게스트에 저장하는 제출 로직
  const handleSubmit = async (e: FormEvent) => {
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

    const parsedTags =
      form.tags
        ?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0) ?? [];
    const uniqueTags = Array.from(new Set(parsedTags));

    let imageUrl: string | null = null;

    try {
      setIsSubmitting(true);

      // 1) 이미지가 있다면, 로그인 상태에 따라 처리
      if (chartFile) {
        if (currentUser) {
          // Supabase Storage 업로드
          const fileExt =
            chartFile.name.split('.').pop()?.toLowerCase() || 'png';
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${currentUser.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('trade-images')
            .upload(filePath, chartFile, {
              contentType: chartFile.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Failed to upload image:', uploadError);
            alert(
              '이미지 업로드 중 오류가 발생했습니다. 이미지 없이 기록만 저장합니다.',
            );
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('trade-images')
              .getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
          }
        } else {
          // 게스트 모드: data URL로 localStorage에 저장
          imageUrl = await fileToDataUrl(chartFile);
        }
      }

      // 2) 로그인 안 된 경우 → 게스트 모드 로컬 저장
      if (!currentUser) {
        const newTrade: Trade = {
          id: `guest-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          date: form.date,
          symbol: form.symbol.toUpperCase().trim(),
          side: form.side,
          price,
          quantity,
          memo: form.memo,
          tags: uniqueTags,
          image: imageUrl ?? undefined,
        };

        setGuestTrades(prev => [newTrade, ...prev]);

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

        showNotify(
          'success',
          '매매 기록이 저장되었습니다. (게스트 모드)',
        );
        return;
      }

      // 3) 로그인된 경우 → Supabase DB에 레코드 저장
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

    // 삭제 대상 종목 찾기 (게스트/로그인 공통)
    const baseList = currentUser ? trades : guestTrades;
    const target = baseList.find(t => t.id === id);
    const deletedSymbol = target?.symbol;

    // 🧹 헬퍼: 이 종목 거래가 더 없으면 선택/필터 초기화
    const clearSymbolFilterIfNoTrade = () => {
      if (!deletedSymbol) return;

      const stillExists = baseList.some(
        t => t.id !== id && t.symbol === deletedSymbol,
      );

      if (!stillExists) {
        if (selectedSymbol === deletedSymbol) {
          setSelectedSymbol('');
        }
        if (
          filterSymbol &&
          filterSymbol.toLowerCase() === deletedSymbol.toLowerCase()
        ) {
          setFilterSymbol('');
        }
      }
    };

    // 게스트 모드 삭제
    if (!currentUser) {
      setGuestTrades(prev => prev.filter(t => t.id !== id));
      clearSymbolFilterIfNoTrade();
      showNotify('success', '기록을 삭제했습니다. (게스트 모드)');
      return;
    }

    // 로그인 상태 삭제
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
      clearSymbolFilterIfNoTrade();
      showNotify('success', '기록을 삭제했습니다.');
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
      showNotify('error', '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('모든 매매 기록을 삭제할까요?')) return;

    // 게스트 모드 전체 삭제
    if (!currentUser) {
      setGuestTrades([]);
      localStorage.removeItem(GUEST_TRADES_KEY);
      setSelectedSymbol('');
      showNotify('success', '모든 기록을 삭제했습니다. (게스트 모드)');
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

    if (
      !editForm.date ||
      !editForm.symbol ||
      !editForm.price ||
      !editForm.quantity
    ) {
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

    // 게스트 모드 수정
    if (!currentUser) {
      const updatedTrade: Trade = {
        ...editingTrade,
        date: editForm.date,
        symbol: editForm.symbol.toUpperCase().trim(),
        side: editForm.side,
        price,
        quantity,
        memo: editForm.memo,
        tags: uniqueTags,
      };

      setGuestTrades(prev =>
        prev.map(t => (t.id === editingTrade.id ? updatedTrade : t)),
      );
      handleCancelEdit();
      showNotify('success', '기록이 수정되었습니다. (게스트 모드)');
      return;
    }

    // 로그인 상태 수정
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

  // CSV (현재 기준 데이터: baseTrades)
  const handleExportCsv = () => {
    if (baseTrades.length === 0) {
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

    const rows = baseTrades.map(t => [
      t.id,
      t.date,
      t.symbol,
      t.side,
      t.price,
      t.quantity,
      t.price * t.quantity,
      (t.memo ?? '').replace(/\r?\n/g, ' '),
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
    link.setAttribute(
      'download',
      currentUser ? 'stock-journal.csv' : 'stock-journal-guest.csv',
    );
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

  // 정렬
  const handleSort = (key: SortKey) => {
    setSort(prev => {
      // 같은 컬럼을 다시 클릭 → 방향 토글
      if (prev.key === key) {
        return {
          key,
          dir: prev.dir === 'asc' ? 'desc' : 'asc',
        };
      }
      // 다른 컬럼을 클릭 → 그 컬럼 기준 오름차순부터 시작
      return {
        key,
        dir: 'asc',
      };
    });
  };

  // STATS 탭용 정렬 핸들러
  const handleSymbolStatsSort = (key: SymbolSortKey) => {
    setSymbolSort(prev => {
      if (prev.key === key) {
        return {
          key,
          dir: prev.dir === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        dir: 'asc',
      };
    });
  };

  // STATS 탭용 정렬 핸들러
  const handleTagStatsSort = (key: TagSortKey) => {
    setTagSort(prev => {
      if (prev.key === key) {
        return {
          key,
          dir: prev.dir === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        dir: 'desc', // 태그는 기본을 "많이 쓰인 순"으로 시작
      };
    });
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

  // 백업 (상태 기준: baseTrades)
  const handleExportBackup = () => {
    if (baseTrades.length === 0 && Object.keys(currentPrices).length === 0) {
      alert('백업할 데이터가 없습니다.');
      return;
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trades: baseTrades,
      currentPrices,
      mode: currentUser ? 'account' : 'guest',
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      currentUser
        ? `stock-journal-backup-${dateStr}.json`
        : `stock-journal-guest-backup-${dateStr}.json`,
    );
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
    reader.onload = async ev => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);

        // 형식 체크 부분 그대로 유지
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
            '백업 데이터를 불러오면 현재 화면에 보이는 매매 기록과 현재가 설정이 모두 덮어씌워집니다. 계속 진행할까요?',
          )
        ) {
          return;
        }

        const importedTrades = (data as any).trades as Trade[];
        const normalized = importedTrades.map(t => ({
          ...t,
          tags: t.tags ?? [],
        }));

        // 1) 화면 상태 갱신 (기존 코드)
        if (currentUser) {
          setTrades(normalized);
        } else {
          setGuestTrades(normalized);
        }

        setCurrentPrices(
          (data as any).currentPrices as Record<string, number>,
        );

        // 2) 로그인 상태라면 Supabase DB에도 반영
        if (currentUser) {
          if (
            !confirm(
              '현재 로그인한 계정의 기존 매매 기록을 모두 지워집니다.\n백업 파일 내용을 그대로 계정에 저장할까요?',
            )
          ) {
            setBackupMessage(
              '화면에는 백업 데이터를 불러왔지만, 계정(DB)에는 반영하지 않았어요.'
            );
            showNotify(
              'success',
              '백업 파일은 화면에만 적용됐어요. 계정(DB)에는 저장되지 않았어요.'
            );
            return;
          }

          // (1) 기존 기록 삭제
          const { error: delError } = await supabase
            .from('trades')
            .delete()
            .eq('user_id', currentUser.id);

          if (delError) {
            console.error('Failed to clear trades before restore:', delError);
            alert('계정 기록을 초기화하는 중 오류가 발생했습니다.');
            setBackupMessage(
              '화면에는 백업 데이터를 불러왔지만, 계정 초기화 중 오류가 났어요.',
            );
            return;
          }

          // (2) 백업 데이터 그대로 insert
          const rows = normalized.map(t => ({
            user_id: currentUser.id,
            date: t.date,
            symbol: t.symbol,
            side: t.side,
            price: t.price,
            quantity: t.quantity,
            memo: t.memo,
            tags: t.tags ?? [],
            image: t.image ?? null,
          }));

          const { data: inserted, error: insError } = await supabase
            .from('trades')
            .insert(rows)
            .select();

          if (insError) {
            console.error('Failed to restore trades to DB:', insError);
            alert('백업 데이터를 계정에 저장하는 중 오류가 발생했습니다.');
            setBackupMessage(
              '화면에는 백업 데이터를 불러왔지만, 계정 저장 중 오류가 났어요.',
            );
            return;
          }

          // DB 기준으로 다시 정규화해서 상태 세팅 (id 포함)
          const normalizedFromDb = (inserted as Trade[]).map(t => ({
            ...t,
            tags: t.tags ?? [],
          }));
          setTrades(normalizedFromDb);

          setBackupMessage(
            '백업 데이터를 화면과 계정 모두에 성공적으로 반영했어요.',
          );
          showNotify(
            'success',
            '백업 데이터를 화면과 계정 모두에 성공적으로 반영했어요.'
          );
        } else {
          // 게스트 모드일 때 메시지
          setBackupMessage(
            '백업 데이터를 이 브라우저에 성공적으로 불러왔어요. (게스트 모드)',
          );
        }
      } catch (err) {
        console.error(err);
        alert(
          '백업 파일을 읽는 중 오류가 발생했습니다. 올바른 백업 파일인지 확인해 주세요.',
        );
        setBackupMessage('백업 파일을 불러오는 중 오류가 발생했어요.');
      }
    };

    reader.readAsText(file, 'utf-8');
  };


  // 태그 목록 (현재 모드 기준)
  const allTags: string[] = Array.from(
    new Set(baseTrades.flatMap(t => t.tags ?? [])),
  ).sort((a, b) => a.localeCompare(b));

  // 필터링 (현재 모드 기준)
  const symbolFilteredTrades = baseTrades.filter(t =>
    filterSymbol
      ? t.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
      : true,
  );

  // 태그 입력값을 공백/쉼표 기준으로 나눈 키워드 배열
  const tagKeywords = React.useMemo(
    () =>
      filterTag
        .split(/[,\s]+/)               // 공백 또는 쉼표로 분리
        .map(t => t.trim().toLowerCase())
        .filter(Boolean),
    [filterTag],
  );

  const tagFilteredTrades = symbolFilteredTrades.filter(t => {
    // 태그 키워드가 없으면 필터링 없이 통과
    if (tagKeywords.length === 0) return true;

    const tags = (t.tags ?? []).map(tag => tag.toLowerCase());

    // 태그가 하나도 없는 거래는 제외
    if (tags.length === 0) return false;

    if (tagFilterMode === 'AND') {
      // 입력한 모든 키워드를 다 포함해야 통과
      return tagKeywords.every(kw =>
        tags.some(tag => tag.includes(kw)),
      );
    } else {
      // OR: 키워드 중 하나라도 포함하면 통과
      return tagKeywords.some(kw =>
        tags.some(tag => tag.includes(kw)),
      );
    }
  });

  // 선택된 종목의 거래들 (현재 필터를 모두 통과한 범위 안에서만 계산)
  const selectedSymbolTrades = React.useMemo(
    () =>
      selectedSymbol
        ? tagFilteredTrades.filter(t => t.symbol === selectedSymbol)
        : [],
    [selectedSymbol, tagFilteredTrades],
  );

  const dateFilteredTrades = tagFilteredTrades.filter(t => {
    if (dateFrom && t.date < dateFrom) return false;
    if (dateTo && t.date > dateTo) return false;
    return true;
  });

  // 선택 종목 요약 통계 계산
  const selectedSymbolSummary = React.useMemo(() => {
    if (!selectedSymbol || selectedSymbolTrades.length === 0) return null;

    let tradeCount = 0;
    let buyCount = 0;
    let sellCount = 0;

    let buyQty = 0;
    let sellQty = 0;

    let buyAmount = 0;
    let sellAmount = 0;

    for (const t of selectedSymbolTrades) {
      tradeCount += 1;

      const qty = t.quantity ?? 0;
      const amount = (t.price ?? 0) * qty;

      if (t.side === 'BUY') {
        buyCount += 1;
        buyQty += qty;
        buyAmount += amount;
      } else if (t.side === 'SELL') {
        sellCount += 1;
        sellQty += qty;
        sellAmount += amount;
      }
    }

    const avgBuyPrice = buyQty > 0 ? buyAmount / buyQty : 0;
    const avgSellPrice = sellQty > 0 ? sellAmount / sellQty : 0;

    // 아주 러프한 실현 손익 (수수료/세금 무시)
    const roughRealizedPnL = sellAmount - buyAmount;

    return {
      symbol: selectedSymbol,
      tradeCount,
      buyCount,
      sellCount,
      buyQty,
      sellQty,
      buyAmount,
      sellAmount,
      avgBuyPrice,
      avgSellPrice,
      roughRealizedPnL,
    };
  }, [selectedSymbol, selectedSymbolTrades]);

  const displayedTrades = dateFilteredTrades;

  // 정렬 적용 배열
  const sortedTradesForList = React.useMemo(() => {
    const list = [...displayedTrades];

    list.sort((a, b) => {
      let cmp = 0;

      if (sort.key === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else if (sort.key === 'symbol') {
        cmp = a.symbol.localeCompare(b.symbol);
      } else if (sort.key === 'amount') {
        const amountA = a.price * a.quantity;
        const amountB = b.price * b.quantity;
        if (amountA < amountB) cmp = -1;
        else if (amountA > amountB) cmp = 1;
        else cmp = 0;
      }

      return sort.dir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [displayedTrades, sort.key, sort.dir]);

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

  const realizedPnL =
  (selectedSymbolSummary?.sellAmount ?? 0) -
  (selectedSymbolSummary?.buyAmount ?? 0);

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

  // 종목별 요약 (전체 기준, 현재 모드)
  const symbolSummaries: SymbolSummary[] = (() => {
    if (baseTrades.length === 0) return [];

    const sortedTrades = [...baseTrades].sort((a, b) => {
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
          winCount: 0,
          lossCount: 0,
          evenCount: 0,
          tradeCount: 0,
          winRate: 0,
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
        
        // 승/패/본전 카운트
        s.tradeCount += 1;
        if (realizedThis > 0) s.winCount += 1;
        else if (realizedThis < 0) s.lossCount += 1;
        else s.evenCount += 1;
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

        s.winRate =
          s.tradeCount > 0 ? (s.winCount / s.tradeCount) * 100 : 0;

        result.push(s);
      }

    result.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return result;
  })();

  // 종목별 요약용
  const sortedSymbolSummaries = React.useMemo(() => {
    const list = [...symbolSummaries];

    const getMetric = (s: SymbolSummary): number | string => {
      switch (symbolSort.key) {
        case 'symbol':
          return s.symbol;
        case 'positionQty':
          return s.positionQty;
        case 'avgCost':
          return s.avgCost;
        case 'totalBuyAmount':
          return s.totalBuyAmount;
        case 'totalSellAmount':
          return s.totalSellAmount;
        case 'realizedPnL':
          return s.realizedPnL;
        case 'currentPrice': {
          const price = currentPrices[s.symbol];
          return price ?? 0;
        }
        case 'positionValue': {
          const price = currentPrices[s.symbol];
          if (price === undefined || s.positionQty <= 0) return 0;
          return price * s.positionQty;
        }
        case 'unrealizedPnL': {
          const price = currentPrices[s.symbol];
          if (price === undefined || s.positionQty <= 0) return 0;
          return (price - s.avgCost) * s.positionQty;
        }
        case 'winRate':
          return s.winRate;
        default:
          return s.symbol;
      }
    };

    list.sort((a, b) => {
      const va = getMetric(a);
      const vb = getMetric(b);

      let cmp = 0;

      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        const na = Number(va);
        const nb = Number(vb);
        if (na < nb) cmp = -1;
        else if (na > nb) cmp = 1;
        else cmp = 0;
      }

      return symbolSort.dir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [symbolSummaries, symbolSort.key, symbolSort.dir, currentPrices]);

  // 누계 수치 / 수익률
  const overallStats = (() => {
    let totalBuyAmount = 0;        // 총 매수금액 (정보용)
    let totalSellAmount = 0;       // 총 매도금액 (정보용)
    let totalRealizedPnL = 0;      // 실현손익 누계

    let totalOpenCostBasis = 0;    // 아직 보유 중인 종목들의 원금 합
    let totalOpenMarketValue = 0;  // 아직 보유 중인 종목들의 현재 평가금액 합

    for (const s of symbolSummaries) {
      totalBuyAmount += s.totalBuyAmount;
      totalSellAmount += s.totalSellAmount;
      totalRealizedPnL += s.realizedPnL;

      const price = currentPrices[s.symbol];
      if (s.positionQty > 0 && price !== undefined) {
        const costBasis = s.positionQty * s.avgCost;
        const marketValue = s.positionQty * price;

        totalOpenCostBasis += costBasis;
        totalOpenMarketValue += marketValue;
      }
    }

    const evalPnL = totalOpenMarketValue - totalOpenCostBasis; // 평가손익(보유분)
    const totalPnL = totalRealizedPnL + evalPnL;               // 총 손익

    const holdingReturnRate =
      totalOpenCostBasis > 0 ? (evalPnL / totalOpenCostBasis) * 100 : 0;

    return {
      totalBuyAmount,
      totalSellAmount,
      totalRealizedPnL,
      totalOpenCostBasis,
      totalOpenMarketValue,
      evalPnL,
      totalPnL,
      holdingReturnRate,
    };
  })();

  // 일별 실현손익 (FIFO 기준, baseTrades 전체 기준)
  const dailyRealizedPoints: PnLPoint[] = React.useMemo(() => {
    if (baseTrades.length === 0) return [];

    // 날짜 + id 순으로 정렬
    const sortedTrades = [...baseTrades].sort((a, b) => {
      if (a.date === b.date) return a.id.localeCompare(b.id);
      return a.date.localeCompare(b.date);
    });

    type PosState = {
      positionQty: number;
      costBasis: number;
    };

    const posMap = new Map<string, PosState>(); // 종목별 포지션 상태
    const dayMap = new Map<string, number>();   // 날짜별 실현손익 합계

    for (const t of sortedTrades) {
      const amount = t.price * t.quantity;
      const symbol = t.symbol;

      let pos = posMap.get(symbol);
      if (!pos) {
        pos = { positionQty: 0, costBasis: 0 };
        posMap.set(symbol, pos);
      }

      if (t.side === 'BUY') {
        // 매수: 수량/원금만 쌓는다
        pos.positionQty += t.quantity;
        pos.costBasis += amount;
      } else {
        // 매도: 이전 평단 기준으로 실현손익 계산
        const prevQty = pos.positionQty;
        const prevCostBasis = pos.costBasis;
        const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;

        const sellQty = t.quantity;
        const realizedThis = (t.price - prevAvgCost) * sellQty;

        // 포지션/원금 업데이트
        pos.positionQty = prevQty - sellQty;
        pos.costBasis = prevCostBasis - prevAvgCost * sellQty;

        // 날짜별로 합산
        const prevDay = dayMap.get(t.date) ?? 0;
        dayMap.set(t.date, prevDay + realizedThis);
      }
    }

    return Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // 날짜 오름차순
      .map(([date, value]) => ({
        key: date,
        label: date,
        value: Number.isFinite(value) ? value : 0,
      }));
  }, [baseTrades]);

  // 월별 실현손익: 일별 결과를 YYYY-MM 단위로 합산
  const monthlyRealizedPoints: PnLPoint[] = React.useMemo(() => {
    if (dailyRealizedPoints.length === 0) return [];

    const monthMap = new Map<string, number>();

    for (const pt of dailyRealizedPoints) {
      const monthKey =
        pt.key && pt.key.length >= 7 ? pt.key.slice(0, 7) : '기타';
      const prev = monthMap.get(monthKey) ?? 0;
      monthMap.set(monthKey, prev + pt.value);
    }

    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        key,
        label: formatMonthLabel(key),
        value: Number.isFinite(value) ? value : 0,
      }));
  }, [dailyRealizedPoints]);

  // 현재 모드에 맞는 포인트 & 최대 절대값 (그래프 스케일용)
  const pnlChartPoints =
    pnlChartMode === 'daily' ? dailyRealizedPoints : monthlyRealizedPoints;

  // 실현 손익 그래프용 최대 절대값 (NaN 방지)
  const maxAbsPnLRaw = pnlChartPoints.reduce((max, p) => {
    const v = Number(p.value ?? 0);
    if (!Number.isFinite(v)) return max;
    return Math.max(max, Math.abs(v));
  }, 0);

  const maxAbsPnL = Number.isFinite(maxAbsPnLRaw) ? maxAbsPnLRaw : 0;


  // 태그별 성적 (SELL 거래 기준)
  const tagStats: TagPerf[] = (() => {
    if (baseTrades.length === 0) return [];

    // 날짜 + id 순으로 정렬 (종목 요약과 동일)
    const sortedTrades = [...baseTrades].sort((a, b) => {
      if (a.date === b.date) return a.id.localeCompare(b.id);
      return a.date.localeCompare(b.date);
    });

    type PosState = {
      positionQty: number;
      costBasis: number;
    };

    const posMap = new Map<string, PosState>();
    const tagMap = new Map<string, TagPerf>();

    for (const t of sortedTrades) {
      let pos = posMap.get(t.symbol);
      if (!pos) {
        pos = { positionQty: 0, costBasis: 0 };
        posMap.set(t.symbol, pos);
      }

      const amount = t.price * t.quantity;

      if (t.side === 'BUY') {
        pos.positionQty += t.quantity;
        pos.costBasis += amount;
      } else {
        const prevQty = pos.positionQty;
        const prevCostBasis = pos.costBasis;
        const prevAvgCost = prevQty !== 0 ? prevCostBasis / prevQty : 0;

        const sellQty = t.quantity;
        const realizedThis = (t.price - prevAvgCost) * sellQty;

        // 포지션 업데이트
        pos.positionQty = prevQty - sellQty;
        pos.costBasis = prevCostBasis - prevAvgCost * sellQty;

        // 태그별 실현손익/승률 집계
        const tags = t.tags ?? [];
        for (const tag of tags) {
          let tp = tagMap.get(tag);
          if (!tp) {
            tp = {
              tag,
              tradeCount: 0,
              winCount: 0,
              lossCount: 0,
              evenCount: 0,
              realizedPnL: 0,
              avgPnLPerTrade: 0,
              winRate: 0,
            };
            tagMap.set(tag, tp);
          }

          tp.tradeCount += 1;
          tp.realizedPnL += realizedThis;

          if (realizedThis > 0) tp.winCount += 1;
          else if (realizedThis < 0) tp.lossCount += 1;
          else tp.evenCount += 1;
        }
      }
    }

    const result: TagPerf[] = [];
    for (const tp of tagMap.values()) {
      if (tp.tradeCount > 0) {
        tp.avgPnLPerTrade = tp.realizedPnL / tp.tradeCount;
        tp.winRate = (tp.winCount / tp.tradeCount) * 100;
      }
      result.push(tp);
    }

    // 많이 사용한 태그 순
    result.sort((a, b) => b.tradeCount - a.tradeCount);
    return result;
  })();

  // Stats 탭 태그 정렬용
  const sortedTagStats = React.useMemo(() => {
    const list = [...tagStats];

    const getMetric = (t: TagPerf): number | string => {
      switch (tagSort.key) {
        case 'tag':
          return t.tag;
        case 'tradeCount':
          return t.tradeCount;
        case 'winRate':
          return t.winRate;
        case 'realizedPnL':
          return t.realizedPnL;
        case 'avgPnLPerTrade':
          return t.avgPnLPerTrade;
        default:
          return t.tag;
      }
    };

    list.sort((a, b) => {
      const va = getMetric(a);
      const vb = getMetric(b);

      let cmp = 0;

      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.localeCompare(vb);
      } else {
        const na = Number(va);
        const nb = Number(vb);
        if (na < nb) cmp = -1;
        else if (na > nb) cmp = 1;
        else cmp = 0;
      }

      return tagSort.dir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [tagStats, tagSort.key, tagSort.dir]);

  // 자주 쓰는 태그 목록 (Top N)
  const topTags = tagStats.map(tp => tp.tag);

  // 월별 그룹 (현재 모드 + 필터 결과)
  const monthGroups = (() => {
    if (sortedTradesForList.length === 0) return [];

    const map = new Map<string, Trade[]>();

    for (const t of sortedTradesForList) {
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

  // 활성 필터/선택 상태 요약용
  const activeFilterChips: { label: string; onClear?: () => void }[] = [];

  if (dateFrom || dateTo) {
    const label =
      dateFrom && dateTo
        ? `기간: ${dateFrom} ~ ${dateTo}`
        : dateFrom
        ? `기간: ${dateFrom} 이후`
        : `기간: ${dateTo} 이전`;

    activeFilterChips.push({
      label,
      onClear: () => {
        setDateFrom('');
        setDateTo('');
      },
    });
  }

  if (filterSymbol) {
    activeFilterChips.push({
      label: `종목 필터: ${filterSymbol}`,
      onClear: () => setFilterSymbol(''),
    });
  }

  if (tagKeywords.length > 0) {
    const modeLabel =
      tagFilterMode === 'AND' ? '모두 포함' : '하나 이상 포함';

    activeFilterChips.push({
      label: `태그 필터(${modeLabel}): ${tagKeywords.join(', ')}`,
      onClear: () => setFilterTag(''),
    });
  }

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

  // 게스트 → 계정 마이그레이션
  const handleMigrateGuestToAccount = async () => {
    if (!currentUser) {
      alert('로그인 후에 마이그레이션할 수 있습니다.');
      return;
    }
    if (guestTrades.length === 0) {
      alert('옮길 게스트 기록이 없습니다.');
      return;
    }

    if (
      !confirm(
        `이 브라우저(게스트 모드)에만 저장된 매매 기록 ${guestTrades.length}건을\n현재 로그인한 계정으로 옮길까요? (성공 시 게스트 데이터는 삭제됩니다.)`,
      )
    ) {
      return;
    }

    try {
      setIsMigrating(true);

      const rows = guestTrades.map(t => ({
        user_id: currentUser.id,
        date: t.date,
        symbol: t.symbol,
        side: t.side,
        price: t.price,
        quantity: t.quantity,
        memo: t.memo,
        tags: t.tags ?? [],
        image: t.image ?? null,
      }));

      const { data, error } = await supabase
        .from('trades')
        .insert(rows)
        .select();

      if (error) {
        console.error('Failed to migrate guest trades:', error);
        alert('마이그레이션 중 오류가 발생했습니다.');
        showNotify('error', '마이그레이션 중 오류가 발생했습니다.');
        return;
      }

      const inserted = (data as Trade[]).map(t => ({
        ...t,
        tags: (t as any).tags ?? [],
      }));

      setTrades(prev => [...inserted, ...prev]);
      setGuestTrades([]);
      localStorage.removeItem(GUEST_TRADES_KEY);

      showNotify(
        'success',
        '게스트 모드 기록을 현재 계정으로 모두 옮겼습니다.',
      );
    } catch (err) {
      console.error(err);
      alert('마이그레이션 중 알 수 없는 오류가 발생했습니다.');
      showNotify('error', '마이그레이션 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDropGuestData = () => {
    if (
      !confirm(
        '이 브라우저에 저장된 게스트 모드 매매 기록을 모두 삭제할까요?\n(계정에 저장된 DB 데이터에는 영향을 주지 않습니다.)',
      )
    ) {
      return;
    }
    setGuestTrades([]);
    localStorage.removeItem(GUEST_TRADES_KEY);
    showNotify('success', '게스트 모드 매매 기록을 모두 삭제했습니다.');
  };

  // 🚩 1단계: 로그인 상태 확인
  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-sm text-slate-500">
          로그인 상태를 확인하는 중입니다…
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

      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div
            className={
              'w-full max-w-sm rounded-xl shadow-xl p-4 ' +
              (darkMode
                ? 'bg-slate-900 text-slate-100'
                : 'bg-white text-slate-900')
            }
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">로그인 / 회원가입</h2>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <LoginForm onDone={() => setShowLoginModal(false)} />
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

          {/* 상단 영역: 헤더 + 탭 (모바일에서 sticky) */}
          <div
            className={
              // 모바일에서는 sticky, md 이상(태블릿/데스크톱)에서는 static
              'pb-3 z-20 sticky top-0 ' +
              (darkMode ? 'bg-slate-900' : 'bg-white')
            }
          >
            {/* 헤더 */}
            <header
              className="
                flex flex-col gap-3           // 기본: 세로 배치
                pb-3 border-b border-slate-200/70
                sm:flex-row sm:items-center sm:justify-between  // sm 이상: 가로 배치
              "
            >
              <div>
                <h1 className="text-xl font-bold">나만 보는 주식 매매 일지</h1>
                <p className="text-xs text-slate-500">
                  로그인하면 계정(DB)에 저장되고, 로그인하지 않으면 이
                  브라우저(게스트 모드)에만 저장됩니다.
                </p>
              </div>

              <div
                className="
                  flex flex-col gap-1
                  items-end sm:text-right
                  sm:items-end sm:text-right
                "
              >
                {/* 다크 모드 토글 */}
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

                {/* 로그인 상태 표시 */}
                {currentUser ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-slate-400">
                      로그인 계정:{' '}
                      <span className="font-semibold">
                        {currentUser.email}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-[10px] text-slate-400 underline underline-offset-2 hover:text-slate-600"
                    >
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowLoginModal(true)}
                      className="text-[10px] text-blue-500 underline underline-offset-2"
                    >
                      로그인 / 회원가입
                    </button>
                    <span className="text-[10px] text-slate-400">
                      지금은{' '}
                      <span className="font-semibold">
                        게스트 모드
                      </span>
                      로 사용 중입니다.
                    </span>
                  </>
                )}

                {/* 잠금 상태 문구는 안 쓴다면 여기서 지워도 됨 */}
                {/* <span className="text-[10px] text-slate-400">
                  잠금 상태: {hasPassword ? '비밀번호 설정됨' : '설정 안 됨'}
                </span> */}
              </div>
            </header>

            {/* 탭 */}
            <nav
              className={
                'mt-3 flex text-xs md:text-sm rounded-full overflow-hidden border ' +
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
                      (selected
                        ? darkMode
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : darkMode
                        ? 'text-slate-300'
                        : 'text-slate-700')
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

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
                  <div className="text-slate-500">
                    필터 후 거래 건수
                    {currentUser ? ' (계정)' : ' (게스트)'}
                  </div>
                  <div className="text-lg font-semibold">
                    {tradesLoading && currentUser
                      ? '로딩 중…'
                      : `${displayedTrades.length} 건`}
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
                  <div className="text-slate-500">실현 손익</div>
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

              {/* 로그인 후 + 게스트 데이터가 남아있는 경우 마이그레이션 안내 */}
              {currentUser && guestTrades.length > 0 && (
                <div
                  className={
                    'border rounded-lg p-3 text-xs md:text-sm ' +
                    (darkMode
                      ? 'border-amber-500/60 bg-slate-900'
                      : 'border-amber-400/60 bg-amber-50')
                  }
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      이 브라우저(게스트 모드)에만 저장된 기록이{' '}
                      {guestTrades.length}건 있습니다.
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-2">
                    이전에 로그인 없이 사용하며 저장한 기록입니다. 현재 계정으로
                    옮겨 두면 다른 기기에서도 볼 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isMigrating}
                      onClick={handleMigrateGuestToAccount}
                      className={
                        'px-3 py-1.5 rounded-lg text-xs font-semibold ' +
                        (isMigrating
                          ? 'bg-slate-400 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700')
                      }
                    >
                      {isMigrating ? '옮기는 중...' : '이 계정으로 모두 옮기기'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDropGuestData}
                      className="px-3 py-1.5 rounded-lg text-xs border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      로컬 게스트 기록 삭제
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    마이그레이션 후에는 이 브라우저의 게스트 데이터가 삭제되고,
                    계정(DB)에만 기록이 남습니다.
                  </p>
                </div>
              )}

              {/* 빠른 입력 카드 (게스트/로그인 공통) */}
              <div
                ref={addFormRef}
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
                    {currentUser
                      ? '현재 계정(DB)에 저장됩니다.'
                      : '게스트 모드: 이 브라우저에만 저장됩니다.'}
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
                        onChange={handleSymbolChange}
                        onFocus={() => {
                          // 아무것도 안 적었을 때, 최근 기록 5개 정도 보여주기
                          if (!form.symbol.trim()) {
                            const recent = Array.from(
                              new Set(
                                baseTrades
                                  .slice(0, 50) // 최근 50개만 스캔
                                  .map(t => t.symbol)
                                  .filter(Boolean),
                              ),
                            ).slice(0, 5);

                            setSymbolSuggestions(recent);
                            setShowSymbolSuggestions(recent.length > 0);
                          }
                        }}
                        autoFocus
                        className={
                          'border rounded px-2 py-1 text-xs bg-transparent ' +
                          (darkMode ? 'border-slate-600' : '')
                        }
                      />
                      {showSymbolSuggestions && symbolSuggestions.length > 0 && (
                        <div
                          className={
                            'mt-1 flex flex-wrap gap-1 text-[10px] ' +
                            (darkMode ? 'text-slate-200' : 'text-slate-600')
                          }
                        >
                          {symbolSuggestions.map(sym => (
                            <button
                              key={sym}
                              type="button"
                              onClick={() => {
                                // 선택 시 폼에 반영
                                setForm(prev => ({
                                  ...prev,
                                  symbol: sym,
                                }));
                                setSymbolSuggestions([]);
                                setShowSymbolSuggestions(false);
                              }}
                              className={
                                'px-2 py-0.5 rounded-full border ' +
                                (darkMode
                                  ? 'border-slate-600 hover:bg-slate-800'
                                  : 'border-slate-300 hover:bg-slate-100')
                              }
                            >
                              {sym}
                            </button>
                          ))}
                        </div>
                      )}
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
                        inputMode="numeric"
                        min={0}
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
                        inputMode="numeric"
                        min={0}
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
                        태그 (쉼표로 구분, 예: 단타, 스윙)
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
                      {/* 자주 쓰는 태그 버튼 (입력용) */}
                      {allTags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-400 mr-1">
                            자주 쓰는 태그:
                          </span>
                          {topTags.slice(0, 5).map(tag => {
                            const current = parseTagString(form.tags);
                            const selected = current
                              .map(t => t.toLowerCase())
                              .includes(tag.toLowerCase());

                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleFormTag(tag)}
                                className={
                                  'px-2 py-0.5 rounded-full border text-[10px] ' +
                                  (selected
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : darkMode
                                    ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
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
                        <span className="font-medium">파일 선택하기</span>
                      </button>

                      {chartPreview && (
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={
                              'w-12 h-12 rounded border overflow-hidden flex items-center justify-center ' +
                              (darkMode
                                ? 'border-slate-600 bg-slate-900'
                                : 'border-slate-300')
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
                              {currentUser
                                ? '기록 저장 시 계정(DB)에 업로드됩니다.'
                                : '게스트 모드에서는 이 브라우저에 저장됩니다.'}
                            </span>
                          </div>
                        </div>
                      )}

                      {!chartPreview && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          당시 보던 차트 화면을 캡처해서 올려두면 복기할 때
                          도움이 됩니다. (예: 500KB 이하의 작은 캡처 이미지)
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
                      선택한 기록 수정: {editingTrade.symbol} (
                      {editingTrade.date})
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                    >
                      수정 취소
                    </button>
                  </div>

                  <form
                    onSubmit={handleEditSubmit}
                    className="space-y-3 text-xs md:text-sm"
                  >
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
                        선택한 매매 기록의 기본 정보만 수정합니다. (이미지 변경은
                        추후 지원 예정)
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
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(prev => !prev)}
                    className="flex items-center gap-2"
                  >
                    <span className="font-semibold text-sm">보기 필터</span>
                    <span className="text-[10px] text-slate-400">
                      {filtersOpen ? '접기 ▲' : '펼치기 ▼'}
                    </span>
                  </button>

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

                {filtersOpen && (
                  <>
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
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className="text-slate-500">태그 조건</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setTagFilterMode('AND')}
                            className={
                              'px-2 py-0.5 rounded-full border ' +
                              (tagFilterMode === 'AND'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : darkMode
                                ? 'border-slate-600 text-slate-300'
                                : 'border-slate-300 text-slate-600')
                            }
                          >
                            AND (모두 포함)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTagFilterMode('OR')}
                            className={
                              'px-2 py-0.5 rounded-full border ' +
                              (tagFilterMode === 'OR'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : darkMode
                                ? 'border-slate-600 text-slate-300'
                                : 'border-slate-300 text-slate-600')
                            }
                          >
                            OR (하나 이상)
                          </button>
                        </div>
                        <span className="text-slate-400">
                          여러 태그는 공백이나 쉼표로 구분해 입력할 수 있어요.
                        </span>
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
                        {topTags.slice(0, 5).map(tag => {
                          const lower = tag.toLowerCase();
                          const selected = tagKeywords.includes(lower);

                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                if (selected) {
                                  // 이미 선택된 태그면 제거
                                  const next = tagKeywords.filter(kw => kw !== lower);
                                  setFilterTag(next.join(' '));
                                } else {
                                  // 새 태그 추가
                                  const next = [...tagKeywords, lower];
                                  setFilterTag(next.join(' '));
                                }
                              }}
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
                  </>
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
                  <div
                    className={
                      '' +
                      (darkMode
                        ? 'border-slate-700 bg-slate-900/70'
                        : 'border-slate-200 bg-slate-50')
                    }
                  >
                    {/* 제목 + 선택 해제 */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold md:text-base">
                          선택 종목 요약:{' '}
                          <span className="font-bold">{selectedSymbol}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          현재 필터(날짜 · 태그 · 매수/매도) 기준 요약입니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSymbol('');
                          setFilterSymbol('');
                        }}
                        className="text-[11px] text-slate-500 underline-offset-2 hover:underline"
                      >
                        선택 해제
                      </button>
                    </div>

                    {/* ➊ 위쪽: 금액 3칸 (매수/매도/실현 손익) */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-slate-500">매수 금액</div>
                        <div className="text-sm font-semibold md:text-base">
                          {formatNumber(symbolStats.buy)}{' '}
                          <span className="text-xs font-normal">원</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[11px] text-slate-500">매도 금액</div>
                        <div className="text-sm font-semibold md:text-base">
                          {formatNumber(symbolStats.sell)}{' '}
                          <span className="text-xs font-normal">원</span>
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-[11px] text-slate-500">실현 손익</div>
                        <div
                          className={
                            'text-sm font-semibold md:text-base ' +
                            (symbolNetCash > 0
                              ? 'text-rose-500'
                              : symbolNetCash < 0
                              ? 'text-blue-600'
                              : '')
                          }
                        >
                          {formatNumber(realizedPnL)}{' '}
                          <span className="text-xs font-normal">원</span>
                        </div>
                      </div>
                    </div>

                    {/* 구분선 */}
                    <div className="my-3 h-px bg-slate-200 dark:bg-slate-700" />

                    {/* ➋ 아래쪽: 상세 요약 (selectedSymbolSummary 활용) */}
                    {selectedSymbolSummary && (
                      <div className="grid gap-3 md:grid-cols-4">
                        {/* 거래 수 */}
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-500">
                            거래 수 (매수/매도)
                          </div>
                          <div className="text-xs font-medium md:text-sm">
                            {selectedSymbolSummary.tradeCount}회{' '}
                            <span className="text-[11px] text-slate-500">
                              ({selectedSymbolSummary.buyCount} 매수 /{' '}
                              {selectedSymbolSummary.sellCount} 매도)
                            </span>
                          </div>
                        </div>

                        {/* 매수 수량 / 금액 */}
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-500">매수 수량 / 금액</div>
                          <div className="text-xs font-medium md:text-sm">
                            {selectedSymbolSummary.buyQty}주{' '}
                            <span className="text-[11px] text-slate-500">
                              ({formatNumber(selectedSymbolSummary.buyAmount)}원)
                            </span>
                          </div>
                        </div>

                        {/* 매도 수량 / 금액 */}
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-500">매도 수량 / 금액</div>
                          <div className="text-xs font-medium md:text-sm">
                            {selectedSymbolSummary.sellQty}주{' '}
                            <span className="text-[11px] text-slate-500">
                              ({formatNumber(selectedSymbolSummary.sellAmount)}원)
                            </span>
                          </div>
                        </div>

                        {/* 평단 / 대략 손익 */}
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-500">매수 / 매도 평단</div>
                          <div className="text-xs font-medium md:text-sm">
                            {selectedSymbolSummary.avgBuyPrice > 0 && (
                              <>
                                {formatNumber(selectedSymbolSummary.avgBuyPrice)}원
                              </>
                            )}
                            {selectedSymbolSummary.avgSellPrice > 0 && (
                              <>
                                {' · '}
                                {formatNumber(selectedSymbolSummary.avgSellPrice)}원
                              </>
                            )}
                            <span
                              className={
                                'ml-1 text-[11px] ' +
                                (selectedSymbolSummary.roughRealizedPnL > 0
                                  ? 'text-rose-500'
                                  : selectedSymbolSummary.roughRealizedPnL < 0
                                  ? 'text-blue-600'
                                  : 'text-slate-500')
                              }
                            >
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // 선택 안 되었을 때 안내문 (기존 코드 그대로 두면 됨)
                  <div
                    className={
                      'text-[11px] md:text-xs ' +
                      (darkMode
                        ? 'border-slate-700 bg-slate-900/60 text-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-500')
                    }
                  >
                    종목명을 클릭하면 해당 종목의 매수/매도 금액과 거래 요약을 확인할 수
                    있어요.
                  </div>
                )}
              </div>
              
              {/* 활성 필터/선택 상태 뱃지 줄 */}
              {activeFilterChips.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400">현재 적용된 필터:</span>
                  {activeFilterChips.map(chip => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={chip.onClear}
                      className={
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ' +
                        (darkMode
                          ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-100')
                      }
                    >
                      <span>{chip.label}</span>
                      <span className="text-[10px] text-slate-400">✕</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 기록 목록 (월별 그룹 + 고정 높이 스크롤) */}
              <div
                className={
                  'border rounded-lg ' +
                  (darkMode ? 'border-slate-700' : 'border-slate-200')
                }
              >
                {tradesError && currentUser && (
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
                        <th className="px-2 py-2 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('date')}
                            className="flex items-center gap-1"
                          >
                            <span>날짜</span>
                            <span
                              className={
                                'text-[10px] ' +
                                (sort.key === 'date'
                                  ? 'text-blue-500'
                                  : 'text-slate-400')
                              }
                            >
                              {sort.key === 'date'
                                ? sort.dir === 'asc'
                                  ? '▲'
                                  : '▼'
                                : '↕'}
                            </span>
                          </button>
                        </th>
                        <th className="px-2 py-2 text-left">
                          <button
                            type="button"
                            onClick={() => handleSort('symbol')}
                            className="flex items-center gap-1"
                          >
                            <span>종목</span>
                            <span
                              className={
                                'text-[10px] ' +
                                (sort.key === 'symbol'
                                  ? 'text-blue-500'
                                  : 'text-slate-400')
                              }
                            >
                              {sort.key === 'symbol'
                                ? sort.dir === 'asc'
                                  ? '▲'
                                  : '▼'
                                : '↕'}
                            </span>
                          </button>
                        </th>
                        <th className="px-2 py-2 text-center">구분</th>
                        <th className="px-2 py-2 text-right hidden sm:table-cell">가격</th>
                        <th className="px-2 py-2 text-right hidden sm:table-cell">수량</th>
                        <th className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleSort('amount')}
                            className="inline-flex items-center gap-1"
                          >
                            <span>금액</span>
                            <span
                              className={
                                'text-[10px] ' +
                                (sort.key === 'amount'
                                  ? 'text-blue-500'
                                  : 'text-slate-400')
                              }
                            >
                              {sort.key === 'amount'
                                ? sort.dir === 'asc'
                                  ? '▲'
                                  : '▼'
                                : '↕'}
                            </span>
                          </button>
                        </th>
                        <th className="px-2 py-2 text-left hidden md:table-cell">태그</th>
                        <th className="px-2 py-2 text-left hidden md:table-cell">파일</th>
                        <th className="px-2 py-2 text-left hidden md:table-cell">메모</th>
                        <th className="px-2 py-2 text-center hidden md:table-cell">수정</th>
                        <th className="px-2 py-2 text-center hidden md:table-cell">삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradesLoading && currentUser ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-2 py-6 text-center text-slate-400"
                          >
                            매매 기록을 불러오는 중입니다…
                          </td>
                        </tr>
                      ) : tradesError && currentUser ? (
                        <tr>
                          <td
                            colSpan={11}
                            className="px-2 py-6 text-center text-rose-400"
                          >
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
                                  const amount = trade.price * trade.quantity;
                                  const isSelected = trade.symbol === selectedSymbol;
                                  const tags = trade.tags ?? [];

                                  const baseRowClass =
                                    'border-t text-[11px] md:text-xs transition-colors ' +
                                    (darkMode
                                      ? 'border-slate-700 hover:bg-slate-800/70'
                                      : 'border-slate-200 hover:bg-slate-50');

                                  const selectedRowClass = isSelected
                                    ? darkMode
                                      ? ' bg-slate-900/60'
                                      : ' bg-blue-50'
                                    : '';

                                  return (
                                    <tr key={trade.id} className={baseRowClass + selectedRowClass}>
                                      {/* 날짜 */}
                                      <td className="px-2 py-1.5 whitespace-nowrap">
                                        {trade.date}
                                      </td>

                                      {/* 종목: 클릭 가능 + 너무 길면 ... 처리 */}
                                      <td className="px-2 py-1.5 max-w-[120px]">
                                        <button
                                          type="button"
                                          onClick={() => handleSymbolClick(trade.symbol)}
                                          title={trade.symbol}
                                          className={
                                            'block text-left truncate underline-offset-2 ' +
                                            (isSelected
                                              ? 'font-semibold underline text-blue-400'
                                              : 'text-blue-500 hover:underline')
                                          }
                                        >
                                          {trade.symbol}
                                        </button>
                                      </td>

                                      {/* 구분(BUY/SELL) */}
                                      <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                        <span
                                          className={
                                            'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ' +
                                            (trade.side === 'BUY'
                                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                              : 'bg-rose-50 text-rose-600 border-rose-200')
                                          }
                                        >
                                          {trade.side === 'BUY' ? '매수' : '매도'}
                                        </span>
                                      </td>

                                      {/* 가격: 모바일에서는 숨김 */}
                                      <td className="px-2 py-2 text-right hidden sm:table-cell">
                                        {formatNumber(trade.price)}
                                      </td>

                                      {/* 수량: 모바일에서는 숨김 */}
                                      <td className="px-2 py-2 text-right hidden sm:table-cell">
                                        {formatNumber(trade.quantity)}
                                      </td>

                                      {/* 금액: 항상 표시 */}
                                      <td className="px-2 py-2 text-right whitespace-nowrap">
                                        {formatNumber(amount)}
                                      </td>

                                      {/* 태그: md 이상에서만 보이게 + 많으면 +N */}
                                      <td className="px-2 py-1.5 max-w-[160px] hidden md:table-cell">
                                        {tags.length === 0 ? (
                                          <span className="text-[11px] text-slate-400">-</span>
                                        ) : (
                                          <div className="flex gap-1 overflow-hidden">
                                            <div className="flex gap-1 truncate">
                                              {tags.slice(0, 3).map(tag => (
                                                <button
                                                  key={tag}
                                                  type="button"
                                                  onClick={() => setFilterTag(tag)}
                                                  className={
                                                    'px-2 py-0.5 rounded-full border text-[10px] ' +
                                                    (darkMode
                                                      ? 'border-slate-600 text-slate-200 hover:bg-slate-800'
                                                      : 'border-slate-300 text-slate-600 hover:bg-slate-100')
                                                  }
                                                >
                                                  #{tag}
                                                </button>
                                              ))}
                                            </div>
                                            {tags.length > 3 && (
                                              <span className="text-[10px] text-slate-400">
                                                +{tags.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </td>

                                      {/* 파일: md 이상에서만 보이게 */}
                                      <td className="px-2 py-2 text-left hidden md:table-cell">
                                        {trade.image ? (
                                          <button
                                            type="button"
                                            onClick={() => setPreviewImage(trade.image!)}
                                            className="text-[11px] text-blue-500 underline underline-offset-2"
                                          >
                                            보기
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-400">-</span>
                                        )}
                                      </td>

                                      {/* 메모 */}
                                      <td className="px-2 py-1.5 max-w-[220px] hidden md:table-cell">
                                        <span
                                          className="block text-[11px] leading-snug line-clamp-2 break-words"
                                          title={trade.memo || undefined}
                                        >
                                          {trade.memo}
                                        </span>
                                      </td>

                                      {/* 수정 버튼 */}
                                      <td className="px-2 py-1.5 text-center hidden md:table-cell">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEdit(trade)}
                                          className="text-[11px] text-blue-500 hover:underline"
                                        >
                                          수정
                                        </button>
                                      </td>

                                      {/* 삭제 버튼 */}
                                      <td className="px-2 py-1.5 text-center hidden md:table-cell">
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
                  몇 개 입력해 보세요. (현재 모드:{' '}
                  {currentUser ? '계정' : '게스트'})
                </p>
              ) : (
                <>
                  {/* 실현손익 그래프 */}
                  {pnlChartPoints.length > 0 && (
                    <div
                      className={
                        'border rounded-lg p-3 md:p-4 mb-3 ' +
                        (darkMode
                          ? 'border-slate-700 bg-slate-900/70'
                          : 'border-slate-200 bg-white')
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold md:text-base">
                            실현 손익 그래프
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {pnlChartMode === 'daily'
                              ? '일별 실현 손익 (매도 거래 기준, FIFO 계산)'
                              : '월별 실현 손익 (매도 거래 기준, FIFO 계산)'}
                          </p>
                        </div>
                        <div className="flex gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setPnlChartMode('daily')}
                            className={
                              'px-2 py-0.5 rounded-full border ' +
                              (pnlChartMode === 'daily'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : darkMode
                                ? 'border-slate-600 text-slate-200'
                                : 'border-slate-300 text-slate-600')
                            }
                          >
                            일별
                          </button>
                          <button
                            type="button"
                            onClick={() => setPnlChartMode('monthly')}
                            className={
                              'px-2 py-0.5 rounded-full border ' +
                              (pnlChartMode === 'monthly'
                                ? 'bg-blue-600 text-white border-blue-600'
                                : darkMode
                                ? 'border-slate-600 text-slate-200'
                                : 'border-slate-300 text-slate-600')
                            }
                          >
                            월별
                          </button>
                        </div>
                      </div>

                      {/* 막대 그래프 */}
                      {maxAbsPnL === 0 ? (
                        <p className="mt-3 text-[11px] text-slate-500">
                          실현 손익이 없거나 계산할 수 없는 거래만 있습니다.
                          <br />
                          ※ 매도(SELL) 거래를 입력해야 실현 손익 막대가 생깁니다.
                        </p>
                      ) : (
                        <div className="mt-3 h-40 md:h-48 flex items-end gap-[6px] overflow-x-auto px-1">
                          {pnlChartPoints.map(point => {
                            const v = Number(point.value ?? 0);
                            const ratio = Math.abs(v) / maxAbsPnL;
                            const heightPct = Math.max(5, ratio * 100);

                            return (
                              <div
                                key={point.key}
                                className="flex h-full min-w-[20px] flex-1 flex-col items-center justify-end"
                              >
                                <div
                                  className={
                                    'w-full rounded-t-sm ' +
                                    (v > 0
                                      ? 'bg-rose-400'
                                      : v < 0
                                      ? 'bg-blue-500'
                                      : 'bg-slate-300')
                                  }
                                  style={{ height: `${heightPct}%` }}
                                  title={`${point.label}: ${formatNumber(v)}원`}
                                />
                                <div className="mt-1 text-[9px] text-slate-500 whitespace-nowrap">
                                  {pnlChartMode === 'daily'
                                    ? point.label.slice(5)
                                    : point.label.replace(' ', '')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {/* 계좌 요약 */}
                  <div
                    className={
                      'border rounded-lg p-3 mb-2 ' +
                      (darkMode
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-200 bg-slate-50')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">전체 계좌 누적 요약</span>
                      <span className="text-[11px] text-slate-400">
                        현재 모드: {currentUser ? '계정' : '게스트'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs">
                      <div>
                        <div className="text-slate-500 mb-0.5">총 매수금액</div>
                        <div className="font-semibold">
                          {formatNumber(overallStats.totalBuyAmount)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">총 매도금액</div>
                        <div className="font-semibold">
                          {formatNumber(overallStats.totalSellAmount)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">실현손익 누계</div>
                        <div
                          className={
                            'font-semibold ' +
                            (overallStats.totalRealizedPnL > 0
                              ? 'text-emerald-500'
                              : overallStats.totalRealizedPnL < 0
                              ? 'text-rose-400'
                              : '')
                          }
                        >
                          {formatNumber(overallStats.totalRealizedPnL)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">보유분 평가손익</div>
                        <div
                          className={
                            'font-semibold ' +
                            (overallStats.evalPnL > 0
                              ? 'text-emerald-500'
                              : overallStats.evalPnL < 0
                              ? 'text-rose-400'
                              : '')
                          }
                        >
                          {formatNumber(overallStats.evalPnL)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">총 손익(실현+평가)</div>
                        <div
                          className={
                            'font-semibold ' +
                            (overallStats.totalPnL > 0
                              ? 'text-emerald-500'
                              : overallStats.totalPnL < 0
                              ? 'text-rose-400'
                              : '')
                          }
                        >
                          {formatNumber(overallStats.totalPnL)} 원
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-0.5">
                          보유분 수익률
                          <span className="text-[10px] text-slate-400 ml-1">
                            (현재 들고 있는 종목 기준)
                          </span>
                        </div>
                        <div
                          className={
                            'font-semibold ' +
                            (overallStats.holdingReturnRate > 0
                              ? 'text-emerald-500'
                              : overallStats.holdingReturnRate < 0
                              ? 'text-rose-400'
                              : '')
                          }
                        >
                          {overallStats.holdingReturnRate.toFixed(2)} %
                        </div>
                      </div>
                    </div>
                  </div>
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
                            {/* 종목 */}
                            <th className="px-2 py-2 text-left">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('symbol')}
                                className="flex items-center gap-1"
                              >
                                <span>종목</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'symbol'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'symbol'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 수량 */}
                            <th className="px-2 py-2 text-right min-w-[40px]">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('positionQty')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>수량</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'positionQty'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'positionQty'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 평단가 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('avgCost')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>평단가</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'avgCost'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'avgCost'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 총 매수 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('totalBuyAmount')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>총 매수</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'totalBuyAmount'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'totalBuyAmount'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 총 매도 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('totalSellAmount')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>총 매도</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'totalSellAmount'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'totalSellAmount'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 실현손익 */}
                            <th className="px-2 py-2 text-right min-w-[60px]">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('realizedPnL')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>실현손익</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'realizedPnL'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'realizedPnL'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 현재가 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('currentPrice')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>현재가</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'currentPrice'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'currentPrice'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 평가금액 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('positionValue')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>평가금액</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'positionValue'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'positionValue'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 평가손익 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('unrealizedPnL')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>평가손익</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'unrealizedPnL'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'unrealizedPnL'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>

                            {/* 승률 */}
                            <th className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleSymbolStatsSort('winRate')}
                                className="inline-flex items-center gap-1 justify-end w-full"
                              >
                                <span>승률</span>
                                <span
                                  className={
                                    'text-[10px] ' +
                                    (symbolSort.key === 'winRate'
                                      ? 'text-blue-500'
                                      : 'text-slate-400')
                                  }
                                >
                                  {symbolSort.key === 'winRate'
                                    ? symbolSort.dir === 'asc'
                                      ? '▲'
                                      : '▼'
                                    : '↕'}
                                </span>
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSymbolSummaries.map(s => {
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
                                <td className="px-2 py-1.5">{s.symbol}</td>
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
                                <td className="px-2 py-2 text-right">
                                  {s.tradeCount > 0
                                    ? `${s.winRate.toFixed(1)}%`
                                    : '-'}
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
                      <div
                        className={
                          'border rounded-lg overflow-x-auto ' +
                          (darkMode
                            ? 'border-slate-700'
                            : 'border-slate-200')
                        }
                      >
                        <table className="w-full text-[11px] md:text-xs min-w-[640px]">
                          <thead className={tableHeaderBg}>
                            <tr>
                              {/* 태그 */}
                              <th className="px-2 py-1.5 text-left">
                                <button
                                  type="button"
                                  onClick={() => handleTagStatsSort('tag')}
                                  className="flex items-center gap-1 text-[14px]"
                                >
                                  <span>태그</span>
                                  <span
                                    className={
                                      'text-[10px] ' +
                                      (tagSort.key === 'tag'
                                        ? 'text-blue-500'
                                        : 'text-slate-400')
                                    }
                                  >
                                    {tagSort.key === 'tag'
                                      ? tagSort.dir === 'asc'
                                        ? '▲'
                                        : '▼'
                                      : '↕'}
                                  </span>
                                </button>
                              </th>

                              {/* 거래 수 */}
                              <th className="px-2 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleTagStatsSort('tradeCount')}
                                  className="inline-flex items-center gap-1 text-[14px] justify-end w-full"
                                >
                                  <span>거래 수</span>
                                  <span
                                    className={
                                      'text-[10px] ' +
                                      (tagSort.key === 'tradeCount'
                                        ? 'text-blue-500'
                                        : 'text-slate-400')
                                    }
                                  >
                                    {tagSort.key === 'tradeCount'
                                      ? tagSort.dir === 'asc'
                                        ? '▲'
                                        : '▼'
                                      : '↕'}
                                  </span>
                                </button>
                              </th>

                              {/* 승/패/무 → 정렬은 승률로만 따로 있음 */}
                              <th className="px-2 py-1.5 text-right">
                                승/패/무
                              </th>

                              {/* 승률 */}
                              <th className="px-2 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleTagStatsSort('winRate')}
                                  className="inline-flex items-center gap-1 text-[14px] justify-end w-full"
                                >
                                  <span>승률</span>
                                  <span
                                    className={
                                      'text-[10px] ' +
                                      (tagSort.key === 'winRate'
                                        ? 'text-blue-500'
                                        : 'text-slate-400')
                                    }
                                  >
                                    {tagSort.key === 'winRate'
                                      ? tagSort.dir === 'asc'
                                        ? '▲'
                                        : '▼'
                                      : '↕'}
                                  </span>
                                </button>
                              </th>

                              {/* 실현손익 합계 */}
                              <th className="px-2 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleTagStatsSort('realizedPnL')}
                                  className="inline-flex items-center gap-1 text-[14px] justify-end w-full"
                                >
                                  <span>실현손익 합계</span>
                                  <span
                                    className={
                                      'text-[10px] ' +
                                      (tagSort.key === 'realizedPnL'
                                        ? 'text-blue-500'
                                        : 'text-slate-400')
                                    }
                                  >
                                    {tagSort.key === 'realizedPnL'
                                      ? tagSort.dir === 'asc'
                                        ? '▲'
                                        : '▼'
                                      : '↕'}
                                  </span>
                                </button>
                              </th>

                              {/* 거래당 평균 손익 */}
                              <th className="px-2 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleTagStatsSort('avgPnLPerTrade')}
                                  className="inline-flex items-center gap-1 text-[14px] justify-end w-full"
                                >
                                  <span>거래당 평균 손익</span>
                                  <span
                                    className={
                                      'text-[10px] ' +
                                      (tagSort.key === 'avgPnLPerTrade'
                                        ? 'text-blue-500'
                                        : 'text-slate-400')
                                    }
                                  >
                                    {tagSort.key === 'avgPnLPerTrade'
                                      ? tagSort.dir === 'asc'
                                        ? '▲'
                                        : '▼'
                                      : '↕'}
                                  </span>
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedTagStats.map(tp => (
                              <tr
                                key={tp.tag}
                                className={
                                  'border-t ' +
                                  (darkMode
                                    ? 'border-slate-700'
                                    : 'border-slate-200')
                                }
                              >
                                <td className="px-2 py-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterTag(tp.tag);
                                      setActiveTab('journal');
                                    }}
                                    className="underline underline-offset-2 decoration-dotted"
                                  >
                                    #{tp.tag}
                                  </button>
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {tp.tradeCount}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {tp.winCount}/{tp.lossCount}/
                                  {tp.evenCount}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {tp.tradeCount > 0
                                    ? `${tp.winRate.toFixed(1)}%`
                                    : '-'}
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  <span
                                    className={
                                      tp.realizedPnL > 0
                                        ? 'text-emerald-500 font-semibold'
                                        : tp.realizedPnL < 0
                                        ? 'text-rose-400 font-semibold'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {formatNumber(tp.realizedPnL)} 원
                                  </span>
                                </td>
                                <td className="px-2 py-1.5 text-right">
                                  {tp.tradeCount > 0 ? (
                                    <span
                                      className={
                                        tp.avgPnLPerTrade > 0
                                          ? 'text-emerald-500'
                                          : tp.avgPnLPerTrade < 0
                                          ? 'text-rose-400'
                                          : 'text-slate-500'
                                      }
                                    >
                                      {formatNumber(tp.avgPnLPerTrade)} 원
                                    </span>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                <p className="text-[11px] text-slate-500 mb-1">
                  현재 모드: {currentUser ? '로그인 계정(DB 기반)' : '게스트 모드(이 브라우저 저장)'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 border rounded-lg text-xs text-slate-600 bg-white"
                  >
                    CSV 다운로드 (현재 모드 기준)
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
                    모든 기록 삭제
                    {currentUser ? ' (로그인 데이터)' : ' (게스트 데이터)'}
                  </button>
                </div>
                {backupMessage && (
                  <p className="text-[11px] text-slate-400">
                    {backupMessage}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  JSON 백업에는 현재 화면에 표시된 매매 기록과 종목별 현재가가
                  함께 저장됩니다. 이 기능은 로컬 상태 복원용이며, 계정(DB)
                  데이터와는 별도로 동작합니다.
                </p>
              </div>

              <p className="text-[10px] text-slate-400">
                로그인 계정을 사용하면 계정(DB)에 기록이 저장되어
                여러 기기에서 동일한 매매 일지를 볼 수 있습니다. 로그인하지 않으면
                이 브라우저(게스트 모드)에만 기록이 저장됩니다.
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
        
        {/* 화면 어디서든 기록 추가 폼으로 점프하는 Floating 버튼 */}
        <button
          type="button"
          onClick={() => {
            addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={
            'fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full shadow-lg px-4 py-2 text-xs font-semibold transition ' +
            'md:hidden ' + // 👈 데스크톱에서는 숨기고, 모바일/태블릿에서만 보이게
            (darkMode
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-blue-600 text-white hover:bg-blue-700')
          }
        >
          <span className="text-base leading-none">＋</span>
          <span>기록 추가</span>
        </button>

      </main>
    </>
  );
}

/** 이메일 + 비밀번호 로그인/회원가입 폼 */
interface LoginFormProps {
  onDone?: () => void;
}

/** 이메일 + 비밀번호 로그인/회원가입 폼 */
function LoginForm({ onDone }: LoginFormProps) {
  type Mode = 'login' | 'signup' | 'resetPassword';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // ✅ 비밀번호 확인
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'error' | 'success' | null>(null);

  const resetMsg = () => {
    setMsg(null);
    setMsgType(null);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    resetMsg();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetMsg();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    // 공통: 이메일 형식 체크 (resetPassword 포함)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setMsgType('error');
      setMsg('올바른 이메일 주소 형식이 아닙니다. 예: name@example.com');
      return;
    }

    // 비밀번호 재설정 모드일 때는 비밀번호 검사를 건너뜀
    if (mode !== 'resetPassword') {
      // Supabase 기본 정책: 최소 6자
      if (!trimmedPassword || trimmedPassword.length < 6) {
        setMsgType('error');
        setMsg('비밀번호는 최소 6자 이상이어야 합니다.');
        return;
      }

      // 회원가입일 때 비밀번호 확인 일치 여부 검사
      if (mode === 'signup' && trimmedPassword !== trimmedConfirm) {
        setMsgType('error');
        setMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }

    try {
      setSending(true);

      /** 🔐 로그인 */
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          console.warn('login error:', error);
          setMsgType('error');

          if (
            error.message.toLowerCase().includes('invalid login credentials')
          ) {
            setMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
          } else {
            setMsg(`로그인 중 오류가 발생했습니다. (${error.message})`);
          }
          return;
        }

        console.log('login data:', data);
        setMsgType('success');
        setMsg('로그인 되었습니다.');

        // 부모에서 넘겨준 콜백 → 모달 닫기
        onDone?.();
        return;
      }

      /** 🆕 회원가입 */
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          console.warn('signup error:', error);
          setMsgType('error');

          if (
            error.message
              .toLowerCase()
              .includes('password should be at least 6 characters')
          ) {
            setMsg('비밀번호는 최소 6자 이상이어야 합니다.');
          } else if (
            error.message.toLowerCase().includes('email address') &&
            error.message.toLowerCase().includes('is invalid')
          ) {
            setMsg('이메일 주소 형식이 올바르지 않습니다.');
          } else if (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('user already registered')
          ) {
            setMsg('이미 가입된 이메일입니다. 로그인으로 시도해 주세요.');
          } else {
            setMsg(`회원가입 중 오류가 발생했습니다. (${error.message})`);
          }
          return;
        }

        console.log('signup data:', data);
        setMsgType('success');

        if (data?.session) {
          // 이메일 인증 옵션 OFF 인 경우: 바로 로그인
          setMsg('회원가입이 완료되었고 자동으로 로그인되었습니다.');
          onDone?.();
        } else {
          // 이메일 인증 옵션 ON 인 경우
          setMsg(
            '회원가입이 완료되었습니다. 이메일로 전송된 인증 링크를 눌러야 로그인할 수 있습니다.',
          );
          setMode('login');
        }

        // 폼 클리어
        setPassword('');
        setConfirmPassword('');
        return;
      }

      /** 🔑 비밀번호 재설정(찾기) */
      if (mode === 'resetPassword') {
        // Supabase Auth 설정에서 지정한 리다이렉트 URL로 메일 발송
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/reset-password`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo,
        });

        if (error) {
          console.warn('reset password error:', error);
          setMsgType('error');
          setMsg(
            `비밀번호 재설정 메일을 보내는 중 오류가 발생했습니다. (${error.message})`,
          );
          return;
        }

        setMsgType('success');
        setMsg(
          '비밀번호 재설정 안내 메일을 보냈습니다. 메일함(스팸함 포함)을 확인해 주세요.',
        );
        return;
      }
    } catch (err) {
      console.warn('auth unknown error:', err);
      setMsgType('error');
      setMsg('처리 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* 로그인 / 회원가입 탭 */}
      <div className="flex mb-1 text-[11px] border rounded-full overflow-hidden">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            resetForm();
          }}
          className={
            'flex-1 py-1.5 text-center ' +
            (mode === 'login'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600')
          }
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            resetForm();
          }}
          className={
            'flex-1 py-1.5 text-center ' +
            (mode === 'signup'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-600')
          }
        >
          회원가입
        </button>
      </div>

      {/* 현재 모드 표시 (비밀번호 찾기일 때) */}
      {mode === 'resetPassword' && (
        <div className="text-[11px] text-blue-600 font-semibold mb-1">
          비밀번호 찾기 (재설정 메일 발송)
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-slate-600">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="border rounded px-2 py-1 text-xs"
          />
        </div>

        {/* 로그인/회원가입에서만 비밀번호 입력 */}
        {mode !== 'resetPassword' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-600">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="6자 이상 입력"
                className="border rounded px-2 py-1 text-xs"
              />
            </div>

            {/* 회원가입 모드일 때 비밀번호 확인 */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-600">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 한 번 더 입력"
                  className="border rounded px-2 py-1 text-xs"
                />
              </div>
            )}
          </>
        )}

        {/* 안내 메시지 (에러/성공) */}
        {msg && (
          <div
            className={
              'mt-1 rounded-md border px-3 py-2 text-[11px] leading-snug ' +
              (msgType === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700')
            }
          >
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={
            sending ||
            !email ||
            (mode !== 'resetPassword' && !password) ||
            (mode === 'signup' && !confirmPassword)
          }
          className={
            'w-full rounded-lg py-2 text-xs font-semibold mt-1 ' +
            (sending
              ? 'bg-slate-400 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700')
          }
        >
          {sending
            ? mode === 'login'
              ? '로그인 중...'
              : mode === 'signup'
              ? '회원가입 중...'
              : '메일 발송 중...'
            : mode === 'login'
            ? '로그인'
            : mode === 'signup'
            ? '회원가입'
            : '비밀번호 재설정 메일 보내기'}
        </button>
      </form>

      {/* 아이디/비밀번호 찾기 영역 */}
      <div className="flex flex-col gap-1 mt-2">
        <button
          type="button"
          onClick={() => {
            setMode('resetPassword');
            setPassword('');
            setConfirmPassword('');
            resetMsg();
          }}
          className="text-[11px] text-blue-500 underline underline-offset-2 self-start"
        >
          비밀번호를 잊으셨나요? (비밀번호 찾기)
        </button>
        <p className="text-[10px] text-slate-500">
          <span className="font-semibold">회원가입할 때 사용한 이메일 주소</span>
          가 기억나지 않는 경우, 사용 중인 메일함에서 &quot;Confirm your signup&quot; 관련 메일을 검색해 보세요.
        </p>
      </div>

      <p className="text-[10px] text-slate-400 mt-1">
        이 서비스는 한 번 로그인하면 세션이 유지되어, 다음 접속 시
        자동으로 로그인 상태를 복원합니다.
      </p>
    </div>
  );
}