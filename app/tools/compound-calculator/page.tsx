import type { Metadata } from 'next';
import { CompoundCalculator } from '@/app/components/tools/CompoundCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export const metadata: Metadata = {
  title: '투자 복리 계산기 - 자산 성장 시뮬레이터 | Stock Journal',
  description:
    '초기 투자금과 월 적립금, 연 수익률을 입력하면 복리 효과로 자산이 어떻게 성장하는지 차트로 확인할 수 있습니다.',
  openGraph: {
    title: '투자 복리 계산기 - Stock Journal',
    description: '복리 효과로 자산이 어떻게 성장하는지 시뮬레이션합니다.',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '투자 복리 계산기',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0' },
};

const relatedTools = [
  { href: '/tools/risk-reward', title: '리스크리워드 계산기', description: '손절/목표가 기반 리스크 분석' },
  { href: '/tools/position-size', title: '적정 매수량 계산기', description: '리스크 기반 적정 매수 수량 산출' },
];

export default function CompoundCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLayout
        title="투자 복리 계산기"
        description="초기 투자금, 월 적립금, 연 수익률을 입력하고 복리의 힘을 확인하세요."
        relatedTools={relatedTools}
      >
        <CompoundCalculator />
      </ToolLayout>
    </>
  );
}
