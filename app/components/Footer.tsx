'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { LineChart } from 'lucide-react'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="w-full border-t border-white/5 bg-[#070a12] py-8">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        {/* 상단: 로고 + 약관 링크 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center">
              <LineChart size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white/60">
              <span className="text-blue-400/60">Stock</span>Journal
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/40">
            <Link href="/terms" className="hover:text-white/70 transition-colors">{t('terms')}</Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">{t('privacy')}</Link>
            <Link href="/refund" className="hover:text-white/70 transition-colors">{t('refund')}</Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="text-[11px] text-white/25 leading-relaxed space-y-0.5">
          <p>{t('companyInfo1')}</p>
          <p>{t('companyInfo2')}</p>
          <p>{t('companyInfo3')}</p>
          <p className="pt-2">{t('copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  )
}
