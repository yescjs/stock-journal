'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface ToolLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  relatedTools?: { href: string; title: string; description: string }[];
}

export function ToolLayout({ title, description, children, relatedTools }: ToolLayoutProps) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:px-10">
      <Link
        href="/tools"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="h-4 w-4" />
        도구 모음
      </Link>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mb-8 text-sm text-white/40">{description}</p>

      {children}

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
        <p className="mb-3 text-sm text-white/50">이 계산 결과를 매매일지에 기록해보세요</p>
        <Link
          href="/trade"
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-toss-sm transition-colors hover:bg-primary/90"
        >
          무료로 매매일지 시작하기
        </Link>
      </div>

      {/* Related tools */}
      {relatedTools && relatedTools.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold text-white/50">관련 도구</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-xl border border-white/8 bg-white/3 p-4 transition-colors hover:bg-white/5"
              >
                <div className="text-sm font-semibold">{tool.title}</div>
                <div className="mt-1 text-xs text-white/40">{tool.description}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
