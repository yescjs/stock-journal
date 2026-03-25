'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, AlertCircle, Gem, Trash2, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  // Streaming props
  isStreaming?: boolean;
  onStopStreaming?: () => void;
}

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
  isStreaming = false,
  onStopStreaming,
}: AIChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('trade.chat');

  const SUGGESTED_QUESTIONS = useMemo(() => [
    t('suggestBestStrategy'),
    t('suggestMonthlyWinRate'),
    t('suggestEmotionReturn'),
  ], [t]);

  // Auto-scroll to bottom on new messages or streaming updates
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
        <p className="text-sm text-white/30">{t('loginRequired')}</p>
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
            <h4 className="text-sm font-bold text-white">{t('title')}</h4>
            <p className="text-xs text-white/30">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs ${isFree ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
            {isFree ? t('freeCount', { count: freeRemaining }) : <><Gem size={10} /> {t('coinPerQuestion')}</>}
          </span>
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-white/20 hover:text-white/50 transition-colors"
              title={t('clearChat')}
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
            <p className="text-sm text-white/30 mb-4">{t('emptyPrompt')}</p>
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
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                    )}
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

        {/* Loading indicator (when loading but not yet streaming) */}
        {loading && !isStreaming && !messages.some(m => m.isStreaming) && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-none">
              <Bot size={14} className="text-indigo-400" />
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-indigo-400 animate-spin" />
                <span className="text-xs text-white/30">{t('analyzing')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle size={14} className="text-red-400 flex-none" />
            <span className="text-xs text-red-300 flex-1">
              {error === 'COIN_SHORTAGE' ? t('coinShortage') : error === 'AI_FAILED' ? t('aiFailed') : error === 'UNKNOWN_ERROR' ? t('unknownError') : error}
            </span>
            {error === 'COIN_SHORTAGE' && onChargeCoins && (
              <button onClick={onChargeCoins} className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300">
                <Gem size={12} /> {t('charge')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/8">
        <div className="flex items-center gap-2">
          {/* Stop button during streaming */}
          {isStreaming && onStopStreaming && (
            <button
              type="button"
              onClick={onStopStreaming}
              className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors flex-none"
              title={t('stop')}
            >
              <Square size={14} className="fill-current" />
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isFree ? t('placeholderFree', { count: freeRemaining }) : t('placeholderPaid')}
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
            {t('freeRemaining', { count: freeRemaining })}
          </p>
        ) : coinBalance < 1 ? (
          <p className="text-xs text-amber-400/60 mt-1.5 text-center">
            {t('freeExhaustedNoCoins')}{' '}
            {onChargeCoins && (
              <button onClick={onChargeCoins} className="underline hover:text-amber-300">{t('freeExhaustedCharge')}</button>
            )}
          </p>
        ) : (
          <p className="text-xs text-white/20 mt-1.5 text-center">
            {t('freeExhaustedPaid')}
          </p>
        )}
      </form>
    </div>
  );
}
