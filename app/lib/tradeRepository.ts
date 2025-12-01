import { supabase } from './supabaseClient';
import type { TradeLog } from '@/app/types/trade';

export async function fetchTradeLogs(): Promise<TradeLog[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch trade logs:', error);
    throw error;
  }

  return data as TradeLog[];
}

export async function addTradeLog(log: Omit<TradeLog, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('trades')
    .insert({
      date: log.date,
      symbol: log.symbol,
      side: log.side,
      price: log.price,
      quantity: log.quantity,
      memo: log.memo ?? null,
      image_url: log.image_url ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to insert trade log:', error);
    throw error;
  }

  return data as TradeLog;
}