import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  robots: 'index, follow',
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070a12] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-white/8 bg-[#070a12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="font-logo text-lg tracking-wider text-white/90">
            Stock Journal
          </Link>
          <Link
            href="/trade"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-toss-sm transition-colors hover:bg-primary/90"
          >
            매매일지 시작하기
          </Link>
        </div>
      </nav>
      <main className="pt-14">{children}</main>
    </div>
  );
}
