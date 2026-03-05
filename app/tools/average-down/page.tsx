import type { Metadata } from 'next';
import { AverageDownCalculator } from '@/app/components/tools/AverageDownCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export const metadata: Metadata = {
  title: '물타기 역산 계산기 - 목표 평단가 계산 | Stock Journal',
  description:
    '목표 평균 매수가를 입력하면 필요한 추가 매수량과 투자금을 역산합니다. 기존 물타기 계산기와 달리 목표에서 역산하는 스마트 계산기.',
  openGraph: {
    title: '물타기 역산 계산기 - Stock Journal',
    description: '목표 평균 매수가에서 역산하여 필요한 추가 매수량을 계산합니다.',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '물타기 역산 계산기',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0' },
};

const relatedTools = [
  { href: '/tools/risk-reward', title: '리스크리워드 계산기', description: '손절/목표가 기반 리스크 분석' },
  { href: '/tools/position-size', title: '적정 매수량 계산기', description: '리스크 기반 적정 매수 수량 산출' },
];

export default function AverageDownPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLayout
        title="물타기 역산 계산기"
        description="목표 평단가를 설정하면 필요한 추가 매수량과 투자금을 역산합니다. 순방향 계산도 지원합니다."
        relatedTools={relatedTools}
      >
        <AverageDownCalculator />
      </ToolLayout>
    </>
  );
}
