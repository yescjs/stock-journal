// Hook for AI conversational Q&A about trading data
// Maintains session-scoped chat history (up to 3 context messages)
// Tracks daily free quota: localStorage cache + server sync
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeAnalysis } from '@/app/types/analysis';
import { CHAT_QA_FREE_DAILY } from '@/app/types/coins';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const MAX_HISTORY = 3; // Keep last 3 exchanges for context
const DAILY_USED_STORAGE_KEY = 'stock-journal-chat-qa-daily';
const CHAT_MESSAGES_SESSION_KEY = 'stock-journal-chat-messages';

// ─── sessionStorage helpers for chat message persistence ──────────────────

function readSessionMessages(userId: string): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(CHAT_MESSAGES_SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.userId === userId && Array.isArray(parsed.messages)) {
      return parsed.messages;
    }
  } catch { /* ignore */ }
  return [];
}

function writeSessionMessages(userId: string, messages: ChatMessage[]): void {
  try {
    sessionStorage.setItem(CHAT_MESSAGES_SESSION_KEY, JSON.stringify({
      userId,
      messages,
    }));
  } catch { /* ignore */ }
}

function clearSessionMessages(): void {
  try {
    sessionStorage.removeItem(CHAT_MESSAGES_SESSION_KEY);
  } catch { /* ignore */ }
}

// ─── localStorage helpers for daily usage cache ───────────────────────────

function getUTCDateString(): string {
  return new Date().toISOString().slice(0, 10); // "2026-03-23"
}

function readCachedDailyUsed(userId: string): number {
  try {
    const raw = localStorage.getItem(DAILY_USED_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    // Only return cached value if it's from today AND same user
    if (parsed.date === getUTCDateString() && parsed.userId === userId) {
      return parsed.count ?? 0;
    }
  } catch { /* ignore */ }
  return 0;
}

function writeCachedDailyUsed(userId: string, count: number): void {
  try {
    localStorage.setItem(DAILY_USED_STORAGE_KEY, JSON.stringify({
      date: getUTCDateString(),
      userId,
      count,
    }));
  } catch { /* ignore */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useAIChat(user: User | null, onCoinsConsumed?: () => void) {
  // Initialize messages from sessionStorage (persists across page nav / locale switch)
  const [messages, setMessagesRaw] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined' || !user) return [];
    return readSessionMessages(user.id);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrapper: update messages state (sessionStorage sync is handled by useEffect below)
  const setMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesRaw(updater);
  }, []);

  // Sync messages to sessionStorage whenever they change
  useEffect(() => {
    if (user) writeSessionMessages(user.id, messages);
  }, [user, messages]);

  // Restore messages from sessionStorage when user becomes available
  useEffect(() => {
    if (!user) {
      setMessagesRaw([]);
      return;
    }
    const cached = readSessionMessages(user.id);
    if (cached.length > 0) {
      setMessagesRaw(cached);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally keyed on user.id to avoid re-runs from object reference changes

  // Initialize dailyUsed from localStorage cache (instant, no fetch needed)
  const [dailyUsed, setDailyUsed] = useState<number>(() => {
    if (typeof window === 'undefined' || !user) return 0;
    return readCachedDailyUsed(user.id);
  });

  const dailyLimit = CHAT_QA_FREE_DAILY;
  const locale = useLocale();
  const fetchedRef = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const freeRemaining = Math.max(0, dailyLimit - dailyUsed);
  const isFree = freeRemaining > 0;

  // Sync dailyUsed to localStorage whenever it changes
  useEffect(() => {
    if (user && dailyUsed > 0) {
      writeCachedDailyUsed(user.id, dailyUsed);
    }
  }, [user, dailyUsed]);

  // When user changes (login/logout/page mount), read cached value immediately
  // and schedule a background server sync
  useEffect(() => {
    if (!user) {
      setDailyUsed(0);
      fetchedRef.current = false;
      return;
    }

    // Read localStorage immediately (synchronous, no flicker)
    const cached = readCachedDailyUsed(user.id);
    setDailyUsed(cached);

    // Background sync: fetch actual usage from server
    // Only once per user to avoid race conditions
    if (fetchedRef.current && lastFetchedUserId.current === user.id) return;
    fetchedRef.current = true;
    lastFetchedUserId.current = user.id;

    let cancelled = false;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch('/api/ai-analysis', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok && !cancelled) {
          const data = await res.json();
          if (typeof data.chatQaDailyUsed === 'number') {
            setDailyUsed(data.chatQaDailyUsed);
            writeCachedDailyUsed(user.id, data.chatQaDailyUsed);
          }
        }
      } catch {
        // localStorage cache serves as fallback
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally keyed on user.id to avoid re-runs from object reference changes

  const sendMessage = useCallback(async (
    question: string,
    analysis: TradeAnalysis,
  ) => {
    if (!user) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Build history from recent messages (last MAX_HISTORY pairs)
      const recentMessages = [...messages, userMsg];
      const history = recentMessages
        .slice(-MAX_HISTORY * 2)
        .map(m => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: 'chat_qa',
          analysis,
          question,
          history,
          locale,
        }),
      });

      if (res.status === 402) {
        setError('COIN_SHORTAGE');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'AI_FAILED');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.report,
        timestamp: data.generatedAt,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Update daily usage from server response + persist to localStorage
      if (typeof data.chatQaDailyUsed === 'number') {
        setDailyUsed(data.chatQaDailyUsed);
        writeCachedDailyUsed(user.id, data.chatQaDailyUsed);
      }

      // Only trigger coin refresh if this was a paid question (server authoritative)
      if (data.wasFree === false) {
        onCoinsConsumed?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UNKNOWN_ERROR');
    } finally {
      setLoading(false);
    }
  }, [user, messages, setMessages, onCoinsConsumed, locale]);

  const clearChat = useCallback(() => {
    setMessages([]);
    clearSessionMessages();
    setError(null);
  }, [setMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat,
    freeRemaining,
    dailyUsed,
    dailyLimit,
    isFree,
  };
}
