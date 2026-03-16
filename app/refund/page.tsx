import { Footer } from '@/app/components/Footer'

export const metadata = {
  title: '코인 안내 - StockJournal',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">코인 안내</h1>
        <div className="space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">코인 지급 방식</h2>
            <p>
              StockJournal의 코인은 매일 자정 자동으로 10코인이 지급됩니다.
              코인은 누적되지 않으며 매일 잔액이 10코인으로 갱신됩니다.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">코인 구매 및 환불</h2>
            <p>
              현재 코인은 무료로 제공되며 별도 구매 또는 환불은 지원하지 않습니다.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
