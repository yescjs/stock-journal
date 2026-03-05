'use client'

import Link from 'next/link'
import { LineChart } from 'lucide-react'

export function Footer() {
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
            <Link href="/terms" className="hover:text-white/70 transition-colors">이용약관</Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">개인정보처리방침</Link>
            <Link href="/refund" className="hover:text-white/70 transition-colors">환불정책</Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="text-[11px] text-white/25 leading-relaxed space-y-0.5">
          <p>상호명: 오정구 | 대표: 최진순 | 사업자등록번호: 573-19-02658</p>
          <p>주소: 경기도 군포시 송부로49번길 10, 303동 305호 | 연락처: 010-4123-2753</p>
          <p>간이과세자 | 통신판매업신고: 준비중</p>
          <p className="pt-2">© {new Date().getFullYear()} StockJournal · 투자 권유 아님 · 시뮬레이션 데이터 포함</p>
        </div>
      </div>
    </footer>
  )
}
