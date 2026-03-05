import type { Metadata } from 'next';
import { RiskRewardCalculator } from '@/app/components/tools/RiskRewardCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export const metadata: Metadata = {
  title: '손절/목표가 리스크리워드 계산기 - Stock Journal',
  description:
    '매수가, 매도가, 수수료를 입력하면 수익률과 실현 수익금을 바로 계산합니다. 무료 주식 투자 도구.',
  openGraph: {
    title: '손절/목표가 리스크리워드 계산기 - Stock Journal',
    description:
      '매수가, 손절가, 목표가를 입력하면 리스크리워드 비율과 추천 매수량을 계산합니다.',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '손절/목표가 리스크리워드 계산기',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0' },
};

const relatedTools = [
  { href: '/tools/position-size', title: '적정 매수량 계산기', description: '리스크 기반 적정 매수 수량 산출' },
  { href: '/tools/average-down', title: '물타기 역산 계산기', description: '목표 평단가까지 필요한 추가 매수량' },
];

export default function RiskRewardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolLayout
        title="손절/목표가 리스크리워드 계산기"
        description="매수 전 손절가와 목표가를 설정하고, 리스크 대비 기대 수익 비율을 확인하세요."
        relatedTools={relatedTools}
      >
        <RiskRewardCalculator />
      </ToolLayout>
    </>
  );
}
