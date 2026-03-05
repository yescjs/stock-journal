import type { Metadata } from 'next';
import { ShieldAlert, Calculator, TrendingUp, Target } from 'lucide-react';
import { ToolCard } from '@/app/components/tools/ToolCard';

export const metadata: Metadata = {
  title: '무료 주식 투자 도구 모음 - Stock Journal',
  description:
    '초보 투자자를 위한 무료 주식 투자 도구. 리스크리워드 계산기, 물타기 역산 계산기, 복리 계산기, 적정 매수량 계산기를 무료로 사용하세요.',
  openGraph: {
    title: '무료 주식 투자 도구 모음 - Stock Journal',
    description: '초보 투자자를 위한 무료 주식 투자 도구 4종.',
    type: 'website',
  },
};

const tools = [
  {
    href: '/tools/risk-reward',
    title: '리스크리워드 계산기',
    description: '매수가, 손절가, 목표가로 리스크 대비 기대 수익 비율을 분석합니다.',
    icon: ShieldAlert,
  },
  {
    href: '/tools/average-down',
    title: '물타기 역산 계산기',
    description: '목표 평단가에서 역산하여 필요한 추가 매수량과 투자금을 계산합니다.',
    icon: Calculator,
  },
  {
    href: '/tools/compound-calculator',
    title: '투자 복리 계산기',
    description: '월 적립식 투자의 복리 효과를 연도별 차트로 확인합니다.',
    icon: TrendingUp,
  },
  {
    href: '/tools/position-size',
    title: '적정 매수량 계산기',
    description: '계좌 리스크 비율에 따라 한 종목에 투자할 적정 수량을 산출합니다.',
    icon: Target,
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 md:px-10">
      <div className="mb-10 text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-400/70">
          Free Tools
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">
          초보 투자자를 위한 무료 투자 도구
        </h1>
        <p className="text-sm text-white/40">
          로그인 없이 바로 사용할 수 있습니다
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl border border-white/8 bg-white/3 p-8 text-center">
        <h2 className="mb-2 text-lg font-bold">매매일지로 투자 실력을 키워보세요</h2>
        <p className="mb-5 text-sm text-white/40">
          거래를 기록하고, AI 분석으로 매매 패턴을 파악하세요
        </p>
        <a
          href="/trade"
          className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-toss-sm transition-colors hover:bg-primary/90"
        >
          무료로 시작하기
        </a>
      </div>
    </div>
  );
}
