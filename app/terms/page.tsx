import { Footer } from '@/app/components/Footer'

export const metadata = {
  title: '이용약관 - StockJournal',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">이용약관</h1>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 오정구(이하 &quot;회사&quot;)가 제공하는 StockJournal 서비스(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제2조 (정의)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>&quot;서비스&quot;란 회사가 제공하는 주식 매매 일지 기록 및 분석 웹 서비스를 말합니다.</li>
              <li>&quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 자를 말합니다.</li>
              <li>&quot;코인&quot;이란 서비스 내에서 AI 분석 등 유료 기능을 이용하기 위해 구매하는 디지털 재화를 말합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위 내에서 약관을 변경할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제4조 (서비스의 내용)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>주식 매매 기록 등록, 조회, 수정, 삭제</li>
              <li>매매 분석 및 통계 제공</li>
              <li>AI 기반 매매 리포트 생성 (코인 소비)</li>
              <li>클라우드 동기화 (회원 전용)</li>
              <li>게스트 모드 (브라우저 로컬 저장)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제5조 (이용자의 의무)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>이용자는 서비스 이용 시 관련 법령 및 본 약관의 규정을 준수해야 합니다.</li>
              <li>이용자는 타인의 정보를 도용하거나 서비스를 부정하게 이용해서는 안 됩니다.</li>
              <li>이용자가 입력하는 매매 기록의 정확성에 대한 책임은 이용자에게 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제6조 (면책)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>서비스에서 제공하는 정보는 투자 권유가 아니며, 투자 판단의 책임은 이용자에게 있습니다.</li>
              <li>AI 분석 결과는 참고 자료이며, 이에 기반한 투자 손실에 대해 회사는 책임을 지지 않습니다.</li>
              <li>천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제7조 (코인 및 결제)</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>코인은 회사가 정한 가격에 따라 구매할 수 있습니다.</li>
              <li>구매한 코인은 서비스 내 유료 기능 이용에 사용됩니다.</li>
              <li>코인의 환불은 환불정책에 따릅니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">제8조 (분쟁 해결)</h2>
            <p>서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 이용자는 상호 협의하여 해결하며, 협의가 이루어지지 않을 경우 관할 법원에 소를 제기할 수 있습니다.</p>
          </section>

          <p className="text-white/30 pt-4">시행일: 2025년 3월 1일</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
