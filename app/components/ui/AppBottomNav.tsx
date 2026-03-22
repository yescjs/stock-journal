'use client'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { BookOpen, Newspaper, Wrench } from 'lucide-react'

const APP_ROUTES = ['/trade', '/news', '/tools']

export function AppBottomNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const show = APP_ROUTES.some(r => pathname.startsWith(r))
  if (!show) return null

  const TABS = [
    { label: t('tradeJournal'), href: '/trade' as const, Icon: BookOpen },
    { label: t('news'), href: '/news' as const, Icon: Newspaper },
    { label: t('tools'), href: '/tools' as const, Icon: Wrench },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-white/8 bg-[#070a12]/90 backdrop-blur-xl">
      <div className="flex h-full items-stretch">
        {TABS.map(({ label, href, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
            >
              <Icon size={20} className={isActive ? 'text-primary' : 'text-white/40'} />
              <span className={`text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-white/40'}`}>
                {label}
              </span>
              {isActive && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
