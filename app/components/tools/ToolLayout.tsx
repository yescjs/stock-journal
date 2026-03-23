'use client';

import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface ToolLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  relatedTools?: { href: string; title: string; description: string }[];
}

export function ToolLayout({ title, description, children, relatedTools }: ToolLayoutProps) {
  const t = useTranslations('tools');

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 md:px-10">
      <Link
        href="/tools"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToTools')}
      </Link>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mb-8 text-sm text-white/40">{description}</p>

      {children}

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
        <p className="mb-3 text-sm text-white/50">{t('recordPrompt')}</p>
        <Link
          href="/trade"
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-toss-sm transition-colors hover:bg-primary/90"
        >
          {t('startJournal')}
        </Link>
      </div>

      {/* Related tools */}
      {relatedTools && relatedTools.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold text-white/50">{t('relatedTools')}</h2>
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
