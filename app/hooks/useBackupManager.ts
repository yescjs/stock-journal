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
      const guestData = localStorage.getItem(GUEST_TRADES_KEY);
      if (guestData && guestData !== '[]') {
        try {
          const parsed = JSON.parse(guestData);
          setHasGuestData(Array.isArray(parsed) && parsed.length > 0);
        } catch {
          setHasGuestData(false);
        }
      } else {
        setHasGuestData(false);
      }
    }
  }, []);

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
        (t as any).created_at || ''
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
          const rows = json.trades.map((t: any) => ({
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
        side: t.side,
        price: t.price,
        quantity: t.quantity,
        memo: t.memo,
        tags: t.tags ?? [],
        image: t.image ?? null
      }));

      const { error } = await supabase.from('trades').insert(rows);
      if (error) throw error;

      localStorage.removeItem(GUEST_TRADES_KEY);
      setHasGuestData(false);

      alert('마이그레이션이 완료되었습니다. 페이지를 새로고침합니다.');
      window.location.reload();

    } catch (e: any) {
      console.error(e);
      alert(`마이그레이션 실패: ${e.message || '알 수 없는 오류'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDropGuestData = () => {
    if (confirm('게스트 데이터를 모두 삭제하시겠습니까?')) {
      localStorage.removeItem(GUEST_TRADES_KEY);
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
