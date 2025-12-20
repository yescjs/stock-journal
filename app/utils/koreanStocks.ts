// Korean stock symbol mapping for local search
// This allows searching by Korean names (e.g., "삼성전자" -> "005930.KS")

export interface KoreanStockMapping {
    symbol: string;
    name: string;
    nameEn: string;
    exchange: 'KOSPI' | 'KOSDAQ';
}

// Top 100+ Korean stocks by market cap and trading volume
export const KOREAN_STOCK_MAPPINGS: KoreanStockMapping[] = [
    // KOSPI - Top stocks
    { symbol: '005930.KS', name: '삼성전자', nameEn: 'Samsung Electronics', exchange: 'KOSPI' },
    { symbol: '000660.KS', name: 'SK하이닉스', nameEn: 'SK Hynix', exchange: 'KOSPI' },
    { symbol: '035420.KS', name: 'NAVER', nameEn: 'NAVER Corp.', exchange: 'KOSPI' },
    { symbol: '051910.KS', name: 'LG화학', nameEn: 'LG Chem', exchange: 'KOSPI' },
    { symbol: '006400.KS', name: '삼성SDI', nameEn: 'Samsung SDI', exchange: 'KOSPI' },
    { symbol: '035720.KS', name: '카카오', nameEn: 'Kakao Corp.', exchange: 'KOSPI' },
    { symbol: '207940.KS', name: '삼성바이오로직스', nameEn: 'Samsung Biologics', exchange: 'KOSPI' },
    { symbol: '005380.KS', name: '현대차', nameEn: 'Hyundai Motor', exchange: 'KOSPI' },
    { symbol: '000270.KS', name: '기아', nameEn: 'Kia Corp.', exchange: 'KOSPI' },
    { symbol: '068270.KS', name: '셀트리온', nameEn: 'Celltrion', exchange: 'KOSPI' },
    { symbol: '105560.KS', name: 'KB금융', nameEn: 'KB Financial Group', exchange: 'KOSPI' },
    { symbol: '055550.KS', name: '신한지주', nameEn: 'Shinhan Financial Group', exchange: 'KOSPI' },
    { symbol: '012330.KS', name: '현대모비스', nameEn: 'Hyundai Mobis', exchange: 'KOSPI' },
    { symbol: '028260.KS', name: '삼성물산', nameEn: 'Samsung C&T', exchange: 'KOSPI' },
    { symbol: '066570.KS', name: 'LG전자', nameEn: 'LG Electronics', exchange: 'KOSPI' },
    { symbol: '003550.KS', name: 'LG', nameEn: 'LG Corp.', exchange: 'KOSPI' },
    { symbol: '017670.KS', name: 'SK텔레콤', nameEn: 'SK Telecom', exchange: 'KOSPI' },
    { symbol: '096770.KS', name: 'SK이노베이션', nameEn: 'SK Innovation', exchange: 'KOSPI' },
    { symbol: '009150.KS', name: '삼성전기', nameEn: 'Samsung Electro-Mechanics', exchange: 'KOSPI' },
    { symbol: '018260.KS', name: '삼성에스디에스', nameEn: 'Samsung SDS', exchange: 'KOSPI' },
    { symbol: '086790.KS', name: '하나금융지주', nameEn: 'Hana Financial Group', exchange: 'KOSPI' },
    { symbol: '032830.KS', name: '삼성생명', nameEn: 'Samsung Life Insurance', exchange: 'KOSPI' },
    { symbol: '033780.KS', name: 'KT&G', nameEn: 'KT&G Corp.', exchange: 'KOSPI' },
    { symbol: '030200.KS', name: 'KT', nameEn: 'KT Corp.', exchange: 'KOSPI' },
    { symbol: '003490.KS', name: '대한항공', nameEn: 'Korean Air', exchange: 'KOSPI' },
    { symbol: '015760.KS', name: '한국전력', nameEn: 'Korea Electric Power', exchange: 'KOSPI' },
    { symbol: '010130.KS', name: '고려아연', nameEn: 'Korea Zinc', exchange: 'KOSPI' },
    { symbol: '034730.KS', name: 'SK', nameEn: 'SK Inc.', exchange: 'KOSPI' },
    { symbol: '011170.KS', name: '롯데케미칼', nameEn: 'Lotte Chemical', exchange: 'KOSPI' },
    { symbol: '010950.KS', name: 'S-Oil', nameEn: 'S-Oil Corp.', exchange: 'KOSPI' },

    // KOSDAQ - Top stocks
    { symbol: '247540.KQ', name: '에코프로비엠', nameEn: 'EcoPro BM', exchange: 'KOSDAQ' },
    { symbol: '086520.KQ', name: '에코프로', nameEn: 'EcoPro', exchange: 'KOSDAQ' },
    { symbol: '091990.KQ', name: '셀트리온헬스케어', nameEn: 'Celltrion Healthcare', exchange: 'KOSDAQ' },
    { symbol: '196170.KQ', name: '알테오젠', nameEn: 'Alteogen', exchange: 'KOSDAQ' },
    { symbol: '058470.KQ', name: '리노공업', nameEn: 'Reno Industrial', exchange: 'KOSDAQ' },
    { symbol: '039030.KQ', name: '이오테크닉스', nameEn: 'IOtechnics', exchange: 'KOSDAQ' },
    { symbol: '036930.KQ', name: '주성엔지니어링', nameEn: 'Jusung Engineering', exchange: 'KOSDAQ' },
    { symbol: '277810.KQ', name: '레인보우로보틱스', nameEn: 'Rainbow Robotics', exchange: 'KOSDAQ' },
    { symbol: '112040.KQ', name: '위메이드', nameEn: 'Wemade', exchange: 'KOSDAQ' },
    { symbol: '251270.KQ', name: '넷마블', nameEn: 'Netmarble', exchange: 'KOSDAQ' },
    { symbol: '293490.KQ', name: '카카오게임즈', nameEn: 'Kakao Games', exchange: 'KOSDAQ' },
    { symbol: '041510.KQ', name: '에스엠', nameEn: 'SM Entertainment', exchange: 'KOSDAQ' },
    { symbol: '035900.KQ', name: 'JYP Ent.', nameEn: 'JYP Entertainment', exchange: 'KOSDAQ' },
    { symbol: '122870.KQ', name: 'YG PLUS', nameEn: 'YG PLUS', exchange: 'KOSDAQ' },
    { symbol: '036570.KQ', name: '엔씨소프트', nameEn: 'NCSOFT', exchange: 'KOSDAQ' },
    { symbol: '263750.KQ', name: '펄어비스', nameEn: 'Pearl Abyss', exchange: 'KOSDAQ' },
    { symbol: '095340.KQ', name: 'ISC', nameEn: 'ISC Co.', exchange: 'KOSDAQ' },
    { symbol: '066970.KQ', name: '엘앤에프', nameEn: 'L&F Co.', exchange: 'KOSDAQ' },
    { symbol: '348210.KQ', name: '넥스틴', nameEn: 'Nextin', exchange: 'KOSDAQ' },
    { symbol: '357780.KQ', name: '솔브레인', nameEn: 'Soulbrain', exchange: 'KOSDAQ' },
];

/**
 * Search Korean stocks locally by Korean name
 */
export function searchKoreanStocks(query: string, limit: number = 10): KoreanStockMapping[] {
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return [];

    return KOREAN_STOCK_MAPPINGS
        .filter(stock =>
            stock.name.toLowerCase().includes(lowerQuery) ||
            stock.nameEn.toLowerCase().includes(lowerQuery) ||
            stock.symbol.toLowerCase().includes(lowerQuery)
        )
        .slice(0, limit);
}
