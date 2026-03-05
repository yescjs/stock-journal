import { Footer } from '@/app/components/Footer'

export const metadata = {
  title: '환불정책 - StockJournal',
}

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">환불·취소·교환 정책</h1>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">1. 디지털 상품 특성</h2>
            <p>
              StockJournal에서 판매하는 &quot;코인&quot;은 서비스 내 AI 분석 기능을 이용하기 위한 디지털 재화입니다.
              디지털 상품의 특성상 배송이 필요하지 않으며, 구매 즉시 계정에 충전됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">2. 환불 규정</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white/80">환불 불가:</strong> 구매한 상품은 환불이 불가합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">3. 취소 규정</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>결제 완료 후 코인이 즉시 충전되므로, 결제 취소는 환불 절차를 통해 진행됩니다.</li>
              <li>결제 오류 또는 이중 결제가 발생한 경우, 확인 후 즉시 전액 환불 처리합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">4. 교환 규정</h2>
            <p>
              디지털 재화의 특성상 교환은 적용되지 않습니다. 서비스 장애로 인해 코인이 정상적으로 사용되지 않은 경우, 해당 코인을 복구해 드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">5. 환불 신청 방법</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>아래 연락처로 환불 요청 (주문번호, 사유 포함)</li>
              <li>확인 후 영업일 기준 3일 이내 환불 처리</li>
              <li>환불 금액은 원래 결제 수단으로 반환</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">6. 연락처</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>담당자: 최진순</li>
              <li>연락처: 010-4123-2753</li>
            </ul>
          </section>

          <section className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h2 className="text-sm font-bold text-white/80 mb-2">관련 법규</h2>
            <p className="text-xs text-white/40">
              본 환불 정책은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 「콘텐츠산업 진흥법」에 따라 디지털 콘텐츠의 청약철회 제한 규정을 반영합니다.
              디지털 콘텐츠는 이용이 시작된 경우 청약철회가 제한될 수 있으며, 이에 대해 구매 전 고지합니다.
            </p>
          </section>

          <p className="text-white/30 pt-4">시행일: 2025년 3월 1일</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
