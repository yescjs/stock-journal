'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LineChart } from 'lucide-react'
import { AppNavTabs } from './AppNavTabs'

const APP_ROUTES = ['/trade', '/news', '/tools']

export function SharedTopNav() {
  const pathname = usePathname()
  if (!APP_ROUTES.some(r => pathname.startsWith(r))) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/5 bg-[#070a12]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <LineChart size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-logo font-extrabold text-base tracking-tight">
            <span className="text-blue-400">Stock</span>Journal
          </span>
        </Link>
        <AppNavTabs />
      </div>
    </nav>
  )
}
