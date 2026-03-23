'use client'

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { NewsCard } from './NewsCard'
import type { NewsArticle, NewsCategory } from '@/app/types/news'

type FilterCategory = NewsCategory | 'all'

const TAB_VALUES: { value: FilterCategory; emoji?: string }[] = [
  { value: 'all' },
  { value: 'stock', emoji: '📈' },
  { value: 'forex', emoji: '💱' },
  { value: 'realestate', emoji: '🏢' },
  { value: 'crypto', emoji: '₿' },
  { value: 'indicator', emoji: '📊' },
  { value: 'global', emoji: '🌐' },
]

const PAGE_SIZE = 10

export function CategoryTabs({ allArticles }: { allArticles: NewsArticle[] }) {
  const [selected, setSelected] = useState<FilterCategory>('all')
  const [page, setPage] = useState(1)
  const t = useTranslations('news')

  const filtered = useMemo(
    () => selected === 'all'
      ? allArticles
      : allArticles.filter(a => a.category === selected),
    [allArticles, selected]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleCategoryChange(cat: FilterCategory) {
    setSelected(cat)
    setPage(1)
  }

  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1]
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto overflow-y-hidden pb-2 mb-6 scrollbar-none">
        {TAB_VALUES.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleCategoryChange(tab.value)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selected === tab.value
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.emoji ? `${tab.emoji} ` : ''}{t(`categories.${tab.value}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-16">{t('noArticles')}</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">
            {t('totalCount', { total: filtered.length, from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, filtered.length) })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paged.map(article => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers().map((n, i) =>
                n === '...' ? (
                  <span key={`dot-${i}`} className="px-2 text-gray-600 text-sm">...</span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === n
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
