'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Coins, CalendarClock, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import type { CoinTransaction } from '@/app/types/coins'
import { COIN_COSTS } from '@/app/types/coins'

interface CoinShopModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  transactions: CoinTransaction[]
}

const TX_PAGE_SIZE = 10

export function CoinShopModal({ isOpen, onClose, balance, transactions }: CoinShopModalProps) {
  const [txPage, setTxPage] = useState(1)
  const t = useTranslations('coins')
  const locale = useLocale()

  const totalTxPages = Math.max(1, Math.ceil(transactions.length / TX_PAGE_SIZE))
  const pagedTx = useMemo(
    () => transactions.slice((txPage - 1) * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE),
    [transactions, txPage]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl p-6 max-w-lg mx-auto max-h-[90vh] overflow-y-auto"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{t('title')}</h2>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 현재 잔액 */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">{t('currentBalance', { balance })}</span>
            </div>

            {/* 일일 지급 안내 */}
            <div className="flex items-start gap-3 mb-6 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <CalendarClock className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-blue-300 font-semibold text-sm">{t('dailyBonusTitle')}</p>
                <p className="text-blue-400/70 text-xs mt-0.5">{t('dailyBonusDesc')}</p>
              </div>
            </div>

            {/* 코인 사용 안내 */}
            <div className="mb-6 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-2 font-medium">{t('usageGuide')}</p>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{t('weeklyReport')}</span>
                <span className="text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />{COIN_COSTS.weekly_report}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{t('tradeReview')}</span>
                <span className="text-yellow-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" />{COIN_COSTS.trade_review}
                </span>
              </div>
            </div>

            {/* 거래 내역 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 font-medium">{t('recentHistory')}</p>
                {transactions.length > 0 && (
                  <p className="text-xs text-gray-600">
                    {(txPage - 1) * TX_PAGE_SIZE + 1}–{Math.min(txPage * TX_PAGE_SIZE, transactions.length)} / {transactions.length}
                  </p>
                )}
              </div>
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">{t('noHistory')}</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {pagedTx.map((tx) => (
                      <li key={tx.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-gray-300">{t(`transactionTypes.${tx.type}`)}</span>
                          <span className="text-gray-500 text-xs ml-2">
                            {new Date(tx.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                          </span>
                          <span className="text-gray-500 text-xs ml-2">{t('balance')} {tx.balance_after}</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {totalTxPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-white/5">
                      <button
                        onClick={() => setTxPage(p => Math.max(1, p - 1))}
                        disabled={txPage === 1}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs text-gray-400">{txPage} / {totalTxPages}</span>
                      <button
                        onClick={() => setTxPage(p => Math.min(totalTxPages, p + 1))}
                        disabled={txPage === totalTxPages}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
