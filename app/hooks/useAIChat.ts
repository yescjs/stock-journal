// Hook for AI conversational Q&A about trading data
// Maintains session-scoped chat history (up to 3 context messages)
// Tracks daily free quota: localStorage cache + server sync
// Supports streaming responses
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { readSSEStream } from '@/app/lib/sseReader';
import { TradeAnalysis } from '@/app/types/analysis';
import { CHAT_QA_FREE_DAILY } from '@/app/types/coins';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
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
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

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

    const assistantMsgId = `assistant-${Date.now()}`;

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setIsStreaming(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (res.status === 402) {
        setError('COIN_SHORTAGE');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'AI_FAILED');
      }

      const contentType = res.headers.get('Content-Type') || '';

      if (contentType.includes('text/event-stream')) {
        // Add a placeholder streaming message
        const streamingMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          timestamp: new Date().toISOString(),
          isStreaming: true,
        };
        setMessages(prev => [...prev, streamingMsg]);

        let metaProcessed = false;

        const fullText = await readSSEStream(
          res,
          (text) => {
            setMessages(prev =>
              prev.map(m => m.id === assistantMsgId ? { ...m, text } : m)
            );
          },
          (meta) => {
            if (metaProcessed) return;
            metaProcessed = true;
            if (typeof meta.chatQaDailyUsed === 'number') {
              setDailyUsed(meta.chatQaDailyUsed as number);
              if (user) writeCachedDailyUsed(user.id, meta.chatQaDailyUsed as number);
            }
            if (meta.wasFree === false) {
              onCoinsConsumed?.();
            }
          },
          abortController.signal,
        );

        // Finalize the message (remove streaming flag)
        setMessages(prev =>
          prev.map(m => m.id === assistantMsgId
            ? { ...m, text: fullText, isStreaming: false, timestamp: new Date().toISOString() }
            : m
          )
        );
      } else {
        // JSON fallback (mock mode)
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          text: data.report,
          timestamp: data.generatedAt,
        };

        setMessages(prev => [...prev, assistantMsg]);

        if (typeof data.chatQaDailyUsed === 'number') {
          setDailyUsed(data.chatQaDailyUsed);
          writeCachedDailyUsed(user.id, data.chatQaDailyUsed);
        }

        if (data.wasFree === false) {
          onCoinsConsumed?.();
        }
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        // User cancelled — finalize partial message
        setMessages(prev =>
          prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m)
        );
      } else {
        setError(err instanceof Error ? err.message : 'UNKNOWN_ERROR');
        // Remove the empty streaming message on error
        setMessages(prev => prev.filter(m => m.id !== assistantMsgId || m.text));
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
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
    isStreaming,
    stopStreaming,
  };
}

