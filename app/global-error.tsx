'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ko">
      <body className="antialiased bg-zinc-950 text-zinc-100 min-h-screen">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                심각한 오류가 발생했습니다
              </h2>
              <p className="text-sm text-zinc-400">
                앱에 문제가 생겼습니다. 다시 시도해 주세요.
              </p>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
