import { Footer } from '@/app/components/Footer'

export const metadata = {
  title: '개인정보처리방침 - StockJournal',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070a12] text-white">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold mb-8">개인정보처리방침</h1>

        <div className="space-y-8 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">1. 개인정보의 수집 및 이용 목적</h2>
            <p>오정구(이하 &quot;회사&quot;)는 다음의 목적을 위해 개인정보를 수집 및 이용합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>회원 가입 및 관리: 회원 식별, 서비스 제공</li>
              <li>서비스 제공: 매매 기록 저장, AI 분석 리포트 생성</li>
              <li>결제 처리: 코인 구매 및 결제 내역 관리</li>
              <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">2. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>필수: 이메일 주소 (소셜 로그인 시 제공)</li>
              <li>자동 수집: 서비스 이용 기록, 접속 로그</li>
              <li>결제 시: 결제 수단 정보 (PG사를 통해 처리, 회사는 카드번호 등을 직접 저장하지 않음)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p>
              회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>전자상거래 등에서의 소비자 보호에 관한 법률: 계약 또는 청약철회에 관한 기록 5년, 대금결제 및 재화 등의 공급에 관한 기록 5년</li>
              <li>통신비밀보호법: 접속 로그 기록 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">4. 개인정보의 제3자 제공</h2>
            <p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가 동의한 경우 또는 법령에 의해 요구되는 경우에는 예외로 합니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">5. 개인정보의 파기</h2>
            <p>
              보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다. 전자적 파일 형태의 정보는 복구 불가능한 방법으로 삭제합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">6. 이용자의 권리</h2>
            <p>이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제, 처리 정지를 요구할 수 있습니다. 요청은 아래 연락처로 문의해 주세요.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white/90 mb-3">7. 개인정보 보호책임자</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>이름: 최진순</li>
              <li>연락처: 010-4123-2753</li>
            </ul>
          </section>

          <p className="text-white/30 pt-4">시행일: 2025년 3월 1일</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
