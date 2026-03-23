'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, AlertCircle, Gem, Trash2 } from 'lucide-react';
import { markdownComponents } from '@/app/components/AIReportHistory';
import type { ChatMessage } from '@/app/hooks/useAIChat';

interface AIChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSend: (question: string) => void;
  onClear: () => void;
  isLoggedIn: boolean;
  coinBalance?: number;
  onChargeCoins?: () => void;
  hideHeader?: boolean;
  freeRemaining?: number;
  isFree?: boolean;
}

const SUGGESTED_QUESTIONS = [
  '내 최고 전략은?',
  '이번 달 승률은?',
  '감정별 수익률 비교',
];

export function AIChatPanel({
  messages,
  loading,
  error,
  onSend,
  onClear,
  isLoggedIn,
  coinBalance = 0,
  onChargeCoins,
  hideHeader = false,
  freeRemaining = 0,
  isFree = false,
}: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    onSend(q);
    setInput('');
  };

  const handleSuggestion = (q: string) => {
    if (loading) return;
    onSend(q);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Bot size={28} className="text-white/20" />
        </div>
        <p className="text-sm text-white/30">로그인 후 AI Q&A를 이용할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-[400px] overflow-hidden ${
      hideHeader ? '' : 'max-h-[calc(100vh-8rem)] rounded-2xl border border-white/8 bg-white/3'
    }`}>
      {/* Header — hidden when rendered inside side panel (panel has its own header) */}
      {!hideHeader && <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <Bot size={16} className="text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">AI Q&A</h4>
            <p className="text-xs text-white/30">매매 데이터에 대해 질문하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs ${isFree ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
            {isFree ? `무료 ${freeRemaining}회` : <><Gem size={10} /> 1코인/질문</>}
          </span>
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-white/20 hover:text-white/50 transition-colors"
              title="대화 초기화"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot size={32} className="text-white/10 mb-3" />
            <p className="text-sm text-white/30 mb-4">매매 데이터를 기반으로 질문에 답변합니다.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(q)}
                  className="px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-none mt-0.5">
                  <Bot size={14} className="text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600/20 border border-blue-500/20 text-white'
                  : 'bg-white/5 border border-white/8 text-white/80'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-sm">{msg.text}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none text-white/70">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-none mt-0.5">
                  <User size={14} className="text-blue-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-none">
              <Bot size={14} className="text-indigo-400" />
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-indigo-400 animate-spin" />
                <span className="text-xs text-white/30">분석 중...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 flex-none" />
            <span className="text-xs text-red-300 flex-1">{error}</span>
            {error.includes('코인') && onChargeCoins && (
              <button onClick={onChargeCoins} className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300">
                <Gem size={12} /> 충전
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/8">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFree ? `무료 ${freeRemaining}회 남음 — 질문하세요...` : '1코인/질문 — 질문하세요...'}
            disabled={loading || (!isFree && coinBalance < 1)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/20 outline-none focus:border-indigo-500/30 transition-colors disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || (!isFree && coinBalance < 1)}
            className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 hover:bg-indigo-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
        {isFree ? (
          <p className="text-xs text-emerald-400/60 mt-1.5 text-center">
            오늘 무료 {freeRemaining}회 남음
          </p>
        ) : coinBalance < 1 ? (
          <p className="text-xs text-amber-400/60 mt-1.5 text-center">
            무료 소진 — 코인이 부족합니다.{' '}
            {onChargeCoins && (
              <button onClick={onChargeCoins} className="underline hover:text-amber-300">충전하기</button>
            )}
          </p>
        ) : (
          <p className="text-xs text-white/20 mt-1.5 text-center">
            무료 소진 — 질문당 1코인
          </p>
        )}
      </form>
    </div>
  );
}
