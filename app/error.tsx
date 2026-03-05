'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            문제가 발생했습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            일시적인 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    </div>
  )
}
