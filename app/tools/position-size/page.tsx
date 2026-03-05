import type { Metadata } from 'next';
import { PositionSizeCalculator } from '@/app/components/tools/PositionSizeCalculator';
import { ToolLayout } from '@/app/components/tools/ToolLayout';

export const metadata: Metadata = {
  title: '적정 매수량 계산기 - 포지션 사이즈 계산 | Stock Journal',
  description:
    '총 자산, 리스크 비율, 매수가, 손절가를 입력하면 리스크 관리 원칙에 따른 적정 매수 수량을 계산합니다.',
  openGraph: {
    title: '적정 매수량 계산기 - Stock Journal',
    description: '리스크 관리 원칙에 따른 적정 매수 수량을 계산합니다.',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '적정 매수량 계산기',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0' },
};

const relatedTools = [
  { href: '/tools/risk-reward', title: '리스크리워드 계산기', description: '손절/목표가 기반 리스크 분석' },
  { href: '/tools/average-down', title: '물타기 역산 계산기', description: '목표 평단가까지 필요한 추가 매수량' },
];

export default function PositionSizePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolLayout
        title="적정 매수량 계산기"
        description="리스크 관리 원칙(계좌 리스크 %)에 따라 한 종목에 얼마나 투자할지 계산합니다."
        relatedTools={relatedTools}
      >
        <PositionSizeCalculator />
      </ToolLayout>
    </>
  );
}
