'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Coins, Zap, Crown, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { User } from '@supabase/supabase-js'
import { COIN_COSTS, COIN_PACKAGES } from '@/app/types/coins'
import type { CustomerInfo } from '@/app/hooks/useCoins'

interface CoinShopModalProps {
  isOpen: boolean
  onClose: () => void
  balance: number
  user: User | null
  onPurchase: (packageIndex: number, customer: CustomerInfo) => void
  purchasing: boolean
  error: string | null
}

const PHONE_STORAGE_KEY = 'stock-journal-customer-phone'

function getUserName(user: User | null): string {
  if (!user) return ''
  const meta = user.user_metadata
  return meta?.full_name || meta?.name || meta?.user_name || ''
}

export function CoinShopModal({
  isOpen, onClose, balance, user, onPurchase, purchasing, error
}: CoinShopModalProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [phoneNumber, setPhoneNumber] = useState(() => {
    try {
      return localStorage.getItem(PHONE_STORAGE_KEY) ?? ''
    } catch { return '' }
  })
  const [hasSavedPhone, setHasSavedPhone] = useState(() => {
    try {
      return localStorage.getItem(PHONE_STORAGE_KEY) !== null
    } catch { return false }
  })

  const fullName = useMemo(() => getUserName(user), [user])

  const handleClose = () => {
    setAgreedToTerms(false)
    setSelectedIndex(null)
    onClose()
  }

  const phoneClean = phoneNumber.replace(/-/g, '')
  const isPhoneValid = /^01[0-9]{8,9}$/.test(phoneClean)
  const needsPhone = !hasSavedPhone

  // 이메일 가입 등 OAuth 이름이 없는 경우 이메일 앞부분을 이름으로 사용
  const effectiveName = fullName || user?.email?.split('@')[0] || '사용자'

  const handlePurchase = () => {
    if (selectedIndex === null || !isPhoneValid) return
    localStorage.setItem(PHONE_STORAGE_KEY, phoneClean)
    setHasSavedPhone(true)
    onPurchase(selectedIndex, { fullName: effectiveName, phoneNumber: phoneClean })
  }

  const badgeIcon = (badge: string | null) => {
    if (badge === '인기') return <Crown className="w-3 h-3" />
    if (badge === '할인') return <Sparkles className="w-3 h-3" />
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-2xl p-6 max-w-lg mx-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">코인 충전</h2>
              <button onClick={handleClose}>
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

            {/* 충전 패키지 카드 */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {COIN_PACKAGES.map((pkg, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  disabled={purchasing}
                  className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all disabled:opacity-50 ${
                    selectedIndex === index
                      ? 'border-blue-500 bg-blue-600/15'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                  }`}
                >
                  {pkg.badge && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pkg.badge === '인기'
                        ? 'bg-blue-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}>
                      {badgeIcon(pkg.badge)} {pkg.badge}
                    </span>
                  )}
                  <Zap className={`w-6 h-6 mb-2 ${
                    selectedIndex === index ? 'text-yellow-300' : 'text-yellow-400/60'
                  }`} />
                  <span className="text-white font-bold text-base">{pkg.coins}</span>
                  <span className="text-white/40 text-[11px] mb-2">코인</span>
                  <span className="text-white font-semibold text-sm">{pkg.price.toLocaleString()}원</span>
                  {pkg.coins === 100 && (
                    <span className="text-emerald-400 text-[10px] font-semibold mt-0.5">코인당 90원</span>
                  )}
                </button>
              ))}
            </div>

            {/* 전화번호 입력 — 최초 1회만 표시 */}
            {needsPhone && (
              <div className="mb-5">
                <p className="text-xs text-gray-400 mb-2">결제를 위해 휴대폰 번호를 입력해주세요 (최초 1회)</p>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                  className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            )}

            {/* 약관 동의 */}
            <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className="text-xs text-gray-400 leading-relaxed">
                <Link href="/terms" target="_blank" className="text-blue-400 underline hover:text-blue-300">이용약관</Link>,{' '}
                <Link href="/privacy" target="_blank" className="text-blue-400 underline hover:text-blue-300">개인정보처리방침</Link>,{' '}
                <Link href="/refund" target="_blank" className="text-blue-400 underline hover:text-blue-300">환불정책</Link>에 동의합니다.
              </span>
            </label>

            {/* 결제 버튼 */}
            <button
              onClick={handlePurchase}
              disabled={purchasing || selectedIndex === null || !agreedToTerms || !isPhoneValid}
              className="w-full flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors font-bold text-white"
            >
              {purchasing ? (
                '결제 처리 중...'
              ) : selectedIndex !== null ? (
                `${COIN_PACKAGES[selectedIndex].price.toLocaleString()}원 결제하기`
              ) : (
                '패키지를 선택해주세요'
              )}
            </button>

            {error && (
              <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
