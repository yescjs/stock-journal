'use client'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export function AppNavTabs() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const TABS = [
    { label: t('tradeJournal'), href: '/trade' as const },
    { label: t('news'), href: '/news' as const },
    { label: t('tools'), href: '/tools' as const },
  ]

  return (
    <nav className="hidden md:flex items-center gap-1">
      {TABS.map(({ label, href }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link key={href} href={href}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive ? 'text-primary' : 'text-white/60 hover:text-white'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
