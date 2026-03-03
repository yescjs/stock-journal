'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, Coins, Zap } from 'lucide-react'
import { COIN_COSTS, COIN_PACKAGES } from '@/app/types/coins'

interface CoinShopModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  onPurchase: (packageIndex: number) => void
  purchasing: boolean
  error: string | null
}

export function CoinShopModal({
  isOpen, onClose, balance, onPurchase, purchasing, error
}: CoinShopModalProps) {
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl p-6 max-w-lg mx-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">코인 충전</h2>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 현재 잔액 */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">현재 잔액: {balance}코인</span>
            </div>

            {/* 코인 사용 안내 */}
            <div className="mb-6 p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">코인 사용 안내</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">주간 AI 리포트</span>
                <span className="text-yellow-400">{COIN_COSTS.weekly_report}코인</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-300">거래 AI 리뷰</span>
                <span className="text-yellow-400">{COIN_COSTS.trade_review}코인</span>
              </div>
            </div>

            {/* 충전 패키지 */}
            {COIN_PACKAGES.map((pkg, index) => (
              <button
                key={index}
                onClick={() => onPurchase(index)}
                disabled={purchasing}
                className="w-full flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl transition-colors mb-3"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-300" />
                  <span className="text-white font-semibold">{pkg.label} 충전</span>
                </div>
                <span className="text-white font-bold">{pkg.price.toLocaleString()}원</span>
              </button>
            ))}

            {error && (
              <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
