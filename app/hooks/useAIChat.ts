// Hook for AI conversational Q&A about trading data
// Maintains session-scoped chat history (up to 3 context messages)
import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabaseClient';
import { TradeAnalysis } from '@/app/types/analysis';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const MAX_HISTORY = 3; // Keep last 3 exchanges for context

export function useAIChat(user: User | null, onCoinsConsumed?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });

      if (res.status === 402) {
        setError('코인이 부족합니다. 코인을 충전해주세요.');
        return;
      }

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg || 'AI 응답 생성에 실패했습니다.');
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.report,
        timestamp: data.generatedAt,
      };

      setMessages(prev => [...prev, assistantMsg]);
      onCoinsConsumed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user, messages, onCoinsConsumed]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat,
  };
}
