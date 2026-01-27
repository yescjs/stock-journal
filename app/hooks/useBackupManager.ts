import { useState, useRef, useEffect } from 'react';
import { Trade } from '@/app/types/trade';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';

const GUEST_TRADES_KEY = 'stock-journal-guest-trades-v1';

interface UseBackupManagerProps {
  trades: Trade[];
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>;
  currentUser: User | null;
  currentPrices: Record<string, number>;
  setCurrentPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function useBackupManager({
  trades,
  setTrades,
  currentUser,
  currentPrices,
  setCurrentPrices,
  onNotify
}: UseBackupManagerProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [hasGuestData, setHasGuestData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for Guest Data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for actual guest trade data
      const guestData = localStorage.getItem(GUEST_TRADES_KEY);
      if (guestData) {
        try {
          const parsed = JSON.parse(guestData);
          if (Array.isArray(parsed)) {
            // If user is logged in, only show alert if there's actual data
            // If user is not logged in, empty array also counts (for guest mode)
            if (currentUser) {
              setHasGuestData(parsed.length > 0);
            } else {
              setHasGuestData(true);
            }
          } else {
            setHasGuestData(false);
          }
        } catch {
          setHasGuestData(false);
        }
      } else {
        setHasGuestData(false);
      }
    }
  }, [currentUser]);

  const handleExportCsv = () => {
    if (trades.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }
    const headers = [
      'ID', 'Date', 'Symbol', 'Side', 'Price', 'Quantity', 'Memo', 'Tags', 'Image', 'Created_At'
    ];
    const csvContent = [
      headers.join(','),
      ...trades.map(t => [
        t.id, t.date, t.symbol, t.side, t.price, t.quantity,
        `"${(t.memo || '').replace(/"/g, '""')}"`,
        `"${(t.tags || []).join(' ')}"`,
        t.image || '',
        (t as Trade & { created_at?: string }).created_at || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trades,
      currentPrices
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupClick = () => {
    fileInputRef.current?.click();
  };

  const handleBackupFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (!json.trades || !Array.isArray(json.trades)) throw new Error('Invalid format');

        if (currentUser) {
          if (!confirm('현재 계정의 데이터를 모두 지우고 백업 데이터로 덮어쓰시겠습니까?')) return;

          // 1. Delete all
          await supabase.from('trades').delete().eq('user_id', currentUser.id);

          // 2. Insert all
          const rows = json.trades.map((t: Trade) => ({
            user_id: currentUser.id,
            date: t.date,
            symbol: t.symbol,
            side: t.side,
            price: t.price,
            quantity: t.quantity,
            memo: t.memo,
            tags: t.tags ?? [],
            image: t.image ?? null
          }));

          const { error } = await supabase.from('trades').insert(rows);
          if (error) throw error;

          setTrades(json.trades);
          // Reload to ensure consistency
          window.location.reload();
        } else {
          setTrades(json.trades);
          setCurrentPrices(json.currentPrices || {});
          onNotify('success', '백업을 불러왔습니다.');
          e.target.value = '';
        }
      } catch (err) {
        alert('백업 파일 로드 실패');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleMigrateGuestToAccount = async () => {
    if (!currentUser) return;
    const guestDataStr = localStorage.getItem(GUEST_TRADES_KEY);
    if (!guestDataStr) return;

    try {
      setIsMigrating(true);
      const guestTrades: Trade[] = JSON.parse(guestDataStr);
      if (guestTrades.length === 0) return;

      const rows = guestTrades.map(t => ({
        user_id: currentUser.id,
        date: t.date,
        symbol: t.symbol,
        symbol_name: t.symbol_name ?? null,
        side: t.side,
        price: t.price,
        quantity: t.quantity,
        memo: t.memo,
        tags: t.tags ?? [],
        image: t.image ?? null,
        strategy_id: (t.strategy_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.strategy_id)) ? t.strategy_id : null,
        entry_reason: t.entry_reason ?? null,
        exit_reason: t.exit_reason ?? null,
        emotion_tag: t.emotion_tag ?? null
      }));

      const { error } = await supabase.from('trades').insert(rows);
      if (error) throw error;

      // Remove both guest data and guest started flag
      localStorage.removeItem(GUEST_TRADES_KEY);
      localStorage.removeItem('stock-journal-guest-started');
      setHasGuestData(false);

      alert('마이그레이션이 완료되었습니다. 페이지를 새로고침합니다.');
      window.location.reload();

    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류';
      alert(`마이그레이션 실패: ${errorMessage}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDropGuestData = () => {
    if (confirm('게스트 데이터를 모두 삭제하시겠습니까?')) {
      localStorage.removeItem(GUEST_TRADES_KEY);
      localStorage.removeItem('stock-journal-guest-started');
      setHasGuestData(false);
      if (!currentUser) setTrades([]);
      onNotify('success', '게스트 데이터가 삭제되었습니다.');
    }
  };

  return {
    handleExportCsv,
    handleExportBackup,
    handleImportBackupClick,
    handleBackupFileChange,
    handleMigrateGuestToAccount,
    handleDropGuestData,
    fileInputRef,
    isMigrating,
    hasGuestData,
    setHasGuestData // Needed for UI close button
  };
}
