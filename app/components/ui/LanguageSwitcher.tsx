'use client'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/config'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex items-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => switchLocale('ko')}
        className={`px-2 py-1 text-xs font-bold transition-colors ${
          locale === 'ko'
            ? 'bg-blue-600 text-white'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        KO
      </button>
      <button
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 text-xs font-bold transition-colors ${
          locale === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        EN
      </button>
    </div>
  )
}
