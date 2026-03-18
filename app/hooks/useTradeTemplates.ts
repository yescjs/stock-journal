import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeSide } from '@/app/types/trade';

const GUEST_TEMPLATES_KEY = 'stock-journal-guest-templates-v1';
export const MAX_TEMPLATES = 10;

export interface TradeTemplate {
  id: string;
  name: string;
  symbol: string;
  symbol_name?: string;
  side: TradeSide;
  quantity: number;
}

export function useTradeTemplates(user: User | null) {
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (user) {
        const { data } = await supabase
          .from('trade_templates')
          .select('id, name, symbol, symbol_name, side, quantity')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (mounted && data) setTemplates(data as TradeTemplate[]);
      } else {
        const saved = localStorage.getItem(GUEST_TEMPLATES_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (mounted) setTemplates(parsed);
          } catch { /* ignore */ }
        }
      }
    }

    load();
    return () => { mounted = false; };
  }, [user]);

  const persist = (updated: TradeTemplate[]) => {
    setTemplates(updated);
    if (!user) localStorage.setItem(GUEST_TEMPLATES_KEY, JSON.stringify(updated));
  };

  const saveTemplate = async (template: Omit<TradeTemplate, 'id'>): Promise<boolean> => {
    if (templates.length >= MAX_TEMPLATES) return false;

    if (user) {
      const { data, error } = await supabase
        .from('trade_templates')
        .insert({ ...template, user_id: user.id })
        .select('id, name, symbol, symbol_name, side, quantity')
        .single();
      if (!error && data) {
        setTemplates(prev => [data as TradeTemplate, ...prev]);
        return true;
      }
      return false;
    } else {
      const newTemplate: TradeTemplate = { id: `tpl-${Date.now()}`, ...template };
      persist([newTemplate, ...templates]);
      return true;
    }
  };

  const deleteTemplate = async (id: string) => {
    if (user) {
      await supabase.from('trade_templates').delete().eq('id', id);
    }
    persist(templates.filter(t => t.id !== id));
  };

  return { templates, saveTemplate, deleteTemplate };
}
