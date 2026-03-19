'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: '매매일지', href: '/trade' },
  { label: '뉴스', href: '/news' },
  { label: '도구', href: '/tools' },
]

export function AppNavTabs() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center gap-1">
      {TABS.map(({ label, href }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
