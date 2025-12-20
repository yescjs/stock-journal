// Korean stock symbol mapping for local search
// This allows searching by Korean names (e.g., "삼성전자" -> "005930.KS")

export interface KoreanStockMapping {
    symbol: string;
    name: string;
    nameEn: string;
    exchange: 'KOSPI' | 'KOSDAQ';
}

// KOSPI & KOSDAQ Top 300+ stocks by market cap
export const KOREAN_STOCK_MAPPINGS: KoreanStockMapping[] = [
    // ========== KOSPI - 시가총액 상위 종목 ==========

    // 대형주 (Large Cap)
    { symbol: '005930.KS', name: '삼성전자', nameEn: 'Samsung Electronics', exchange: 'KOSPI' },
    { symbol: '005935.KS', name: '삼성전자우', nameEn: 'Samsung Electronics Pref', exchange: 'KOSPI' },
    { symbol: '000660.KS', name: 'SK하이닉스', nameEn: 'SK Hynix', exchange: 'KOSPI' },
    { symbol: '373220.KS', name: 'LG에너지솔루션', nameEn: 'LG Energy Solution', exchange: 'KOSPI' },
    { symbol: '207940.KS', name: '삼성바이오로직스', nameEn: 'Samsung Biologics', exchange: 'KOSPI' },
    { symbol: '005380.KS', name: '현대차', nameEn: 'Hyundai Motor', exchange: 'KOSPI' },
    { symbol: '005385.KS', name: '현대차우', nameEn: 'Hyundai Motor Pref', exchange: 'KOSPI' },
    { symbol: '005387.KS', name: '현대차2우B', nameEn: 'Hyundai Motor 2nd Pref B', exchange: 'KOSPI' },
    { symbol: '068270.KS', name: '셀트리온', nameEn: 'Celltrion', exchange: 'KOSPI' },
    { symbol: '000270.KS', name: '기아', nameEn: 'Kia Corp.', exchange: 'KOSPI' },
    { symbol: '105560.KS', name: 'KB금융', nameEn: 'KB Financial Group', exchange: 'KOSPI' },
    { symbol: '035420.KS', name: 'NAVER', nameEn: 'NAVER Corp.', exchange: 'KOSPI' },
    { symbol: '055550.KS', name: '신한지주', nameEn: 'Shinhan Financial Group', exchange: 'KOSPI' },
    { symbol: '322000.KS', name: 'HD현대중공업', nameEn: 'HD Hyundai Heavy Industries', exchange: 'KOSPI' },
    { symbol: '051910.KS', name: 'LG화학', nameEn: 'LG Chem', exchange: 'KOSPI' },
    { symbol: '051915.KS', name: 'LG화학우', nameEn: 'LG Chem Pref', exchange: 'KOSPI' },
    { symbol: '006400.KS', name: '삼성SDI', nameEn: 'Samsung SDI', exchange: 'KOSPI' },
    { symbol: '006405.KS', name: '삼성SDI우', nameEn: 'Samsung SDI Pref', exchange: 'KOSPI' },
    { symbol: '035720.KS', name: '카카오', nameEn: 'Kakao Corp.', exchange: 'KOSPI' },
    { symbol: '003550.KS', name: 'LG', nameEn: 'LG Corp.', exchange: 'KOSPI' },
    { symbol: '086790.KS', name: '하나금융지주', nameEn: 'Hana Financial Group', exchange: 'KOSPI' },
    { symbol: '005490.KS', name: 'POSCO홀딩스', nameEn: 'POSCO Holdings', exchange: 'KOSPI' },
    { symbol: '012330.KS', name: '현대모비스', nameEn: 'Hyundai Mobis', exchange: 'KOSPI' },
    { symbol: '028260.KS', name: '삼성물산', nameEn: 'Samsung C&T', exchange: 'KOSPI' },
    { symbol: '066570.KS', name: 'LG전자', nameEn: 'LG Electronics', exchange: 'KOSPI' },
    { symbol: '066575.KS', name: 'LG전자우', nameEn: 'LG Electronics Pref', exchange: 'KOSPI' },
    { symbol: '032830.KS', name: '삼성생명', nameEn: 'Samsung Life Insurance', exchange: 'KOSPI' },
    { symbol: '034730.KS', name: 'SK', nameEn: 'SK Inc.', exchange: 'KOSPI' },
    { symbol: '017670.KS', name: 'SK텔레콤', nameEn: 'SK Telecom', exchange: 'KOSPI' },
    { symbol: '096770.KS', name: 'SK이노베이션', nameEn: 'SK Innovation', exchange: 'KOSPI' },

    // 금융 (Financial)
    { symbol: '138930.KS', name: 'BNK금융지주', nameEn: 'BNK Financial Group', exchange: 'KOSPI' },
    { symbol: '175330.KS', name: 'JB금융지주', nameEn: 'JB Financial Group', exchange: 'KOSPI' },
    { symbol: '139130.KS', name: 'DGB금융지주', nameEn: 'DGB Financial Group', exchange: 'KOSPI' },
    { symbol: '024110.KS', name: '기업은행', nameEn: 'Industrial Bank of Korea', exchange: 'KOSPI' },
    { symbol: '316140.KS', name: '우리금융지주', nameEn: 'Woori Financial Group', exchange: 'KOSPI' },
    { symbol: '000810.KS', name: '삼성화재', nameEn: 'Samsung Fire & Marine Insurance', exchange: 'KOSPI' },
    { symbol: '001450.KS', name: '현대해상', nameEn: 'Hyundai Marine & Fire Insurance', exchange: 'KOSPI' },
    { symbol: '000370.KS', name: '한화손해보험', nameEn: 'Hanwha General Insurance', exchange: 'KOSPI' },
    { symbol: '005830.KS', name: 'DB손해보험', nameEn: 'DB Insurance', exchange: 'KOSPI' },
    { symbol: '088350.KS', name: '한화생명', nameEn: 'Hanwha Life Insurance', exchange: 'KOSPI' },
    { symbol: '032640.KS', name: 'LG유플러스', nameEn: 'LG Uplus', exchange: 'KOSPI' },
    { symbol: '030200.KS', name: 'KT', nameEn: 'KT Corp.', exchange: 'KOSPI' },
    { symbol: '036460.KS', name: '한국가스공사', nameEn: 'Korea Gas Corp.', exchange: 'KOSPI' },
    { symbol: '015760.KS', name: '한국전력', nameEn: 'Korea Electric Power', exchange: 'KOSPI' },

    // 자동차/부품 (Auto)
    { symbol: '161390.KS', name: '한국타이어앤테크놀로지', nameEn: 'Hankook Tire & Technology', exchange: 'KOSPI' },
    { symbol: '011210.KS', name: '현대위아', nameEn: 'Hyundai Wia', exchange: 'KOSPI' },
    { symbol: '204320.KS', name: '만도', nameEn: 'Mando Corp.', exchange: 'KOSPI' },
    { symbol: '012800.KS', name: '대창', nameEn: 'Daechang', exchange: 'KOSPI' },
    { symbol: '018880.KS', name: '한온시스템', nameEn: 'Hanon Systems', exchange: 'KOSPI' },

    // 조선/중공업 (Shipbuilding/Heavy Industry)
    { symbol: '329180.KS', name: '현대중공업', nameEn: 'Hyundai Heavy Industries', exchange: 'KOSPI' },
    { symbol: '009540.KS', name: 'HD한국조선해양', nameEn: 'HD Korea Shipbuilding', exchange: 'KOSPI' },
    { symbol: '010140.KS', name: '삼성중공업', nameEn: 'Samsung Heavy Industries', exchange: 'KOSPI' },
    { symbol: '042660.KS', name: '한화오션', nameEn: 'Hanwha Ocean', exchange: 'KOSPI' },
    { symbol: '267250.KS', name: 'HD현대', nameEn: 'HD Hyundai', exchange: 'KOSPI' },
    { symbol: '042700.KS', name: '한미반도체', nameEn: 'Hanmi Semiconductor', exchange: 'KOSPI' },

    // 철강/소재 (Steel/Materials)
    { symbol: '004020.KS', name: '현대제철', nameEn: 'Hyundai Steel', exchange: 'KOSPI' },
    { symbol: '010130.KS', name: '고려아연', nameEn: 'Korea Zinc', exchange: 'KOSPI' },
    { symbol: '000240.KS', name: '한국앤컴퍼니', nameEn: 'Hankook & Company', exchange: 'KOSPI' },
    { symbol: '005010.KS', name: '휴스틸', nameEn: 'Husteel', exchange: 'KOSPI' },
    { symbol: '001230.KS', name: '동국홀딩스', nameEn: 'Dongkuk Holdings', exchange: 'KOSPI' },
    { symbol: '103140.KS', name: '풍산', nameEn: 'Poongsan Corp.', exchange: 'KOSPI' },

    // 화학 (Chemicals)
    { symbol: '009830.KS', name: '한화솔루션', nameEn: 'Hanwha Solutions', exchange: 'KOSPI' },
    { symbol: '011170.KS', name: '롯데케미칼', nameEn: 'Lotte Chemical', exchange: 'KOSPI' },
    { symbol: '010950.KS', name: 'S-Oil', nameEn: 'S-Oil Corp.', exchange: 'KOSPI' },
    { symbol: '007690.KS', name: '국도화학', nameEn: 'Kukdo Chemical', exchange: 'KOSPI' },
    { symbol: '003670.KS', name: '포스코퓨처엠', nameEn: 'POSCO Future M', exchange: 'KOSPI' },
    { symbol: '006120.KS', name: 'SK디스커버리', nameEn: 'SK Discovery', exchange: 'KOSPI' },
    { symbol: '011780.KS', name: '금호석유', nameEn: 'Kumho Petrochemical', exchange: 'KOSPI' },
    { symbol: '090350.KS', name: '노루페인트', nameEn: 'Noroo Paint', exchange: 'KOSPI' },
    { symbol: '025860.KS', name: '남해화학', nameEn: 'Namhae Chemical', exchange: 'KOSPI' },
    { symbol: '004000.KS', name: '롯데정밀화학', nameEn: 'Lotte Fine Chemical', exchange: 'KOSPI' },
    { symbol: '014830.KS', name: '유니드', nameEn: 'Unid', exchange: 'KOSPI' },
    { symbol: '002790.KS', name: '아모레G', nameEn: 'Amore G', exchange: 'KOSPI' },

    // 전자/반도체 (Electronics/Semiconductor)
    { symbol: '009150.KS', name: '삼성전기', nameEn: 'Samsung Electro-Mechanics', exchange: 'KOSPI' },
    { symbol: '018260.KS', name: '삼성에스디에스', nameEn: 'Samsung SDS', exchange: 'KOSPI' },
    { symbol: '000990.KS', name: 'DB하이텍', nameEn: 'DB HiTek', exchange: 'KOSPI' },
    { symbol: '000100.KS', name: '유한양행', nameEn: 'Yuhan Corp.', exchange: 'KOSPI' },
    { symbol: '009450.KS', name: '경동나비엔', nameEn: 'KD Navien', exchange: 'KOSPI' },

    // 방산/항공 (Defense/Aerospace)
    { symbol: '047810.KS', name: '한국항공우주', nameEn: 'Korea Aerospace Industries', exchange: 'KOSPI' },
    { symbol: '012450.KS', name: '한화에어로스페이스', nameEn: 'Hanwha Aerospace', exchange: 'KOSPI' },
    { symbol: '003490.KS', name: '대한항공', nameEn: 'Korean Air', exchange: 'KOSPI' },
    { symbol: '020560.KS', name: '아시아나항공', nameEn: 'Asiana Airlines', exchange: 'KOSPI' },
    { symbol: '047040.KS', name: '대우건설', nameEn: 'Daewoo Engineering & Construction', exchange: 'KOSPI' },

    // 건설 (Construction)
    { symbol: '000720.KS', name: '현대건설', nameEn: 'Hyundai Engineering & Construction', exchange: 'KOSPI' },
    { symbol: '034020.KS', name: '두산에너빌리티', nameEn: 'Doosan Enerbility', exchange: 'KOSPI' },
    { symbol: '028050.KS', name: '삼성엔지니어링', nameEn: 'Samsung Engineering', exchange: 'KOSPI' },
    { symbol: '010060.KS', name: 'OCI홀딩스', nameEn: 'OCI Holdings', exchange: 'KOSPI' },
    { symbol: '006360.KS', name: 'GS건설', nameEn: 'GS Engineering & Construction', exchange: 'KOSPI' },
    { symbol: '000150.KS', name: '두산', nameEn: 'Doosan Corp.', exchange: 'KOSPI' },
    { symbol: '001040.KS', name: 'CJ', nameEn: 'CJ Corp.', exchange: 'KOSPI' },

    // 식음료 (Food & Beverage)
    { symbol: '004370.KS', name: '농심', nameEn: 'Nongshim', exchange: 'KOSPI' },
    { symbol: '033780.KS', name: 'KT&G', nameEn: 'KT&G Corp.', exchange: 'KOSPI' },
    { symbol: '271560.KS', name: '오리온', nameEn: 'Orion Corp.', exchange: 'KOSPI' },
    { symbol: '005300.KS', name: '롯데칠성', nameEn: 'Lotte Chilsung Beverage', exchange: 'KOSPI' },
    { symbol: '097950.KS', name: 'CJ제일제당', nameEn: 'CJ CheilJedang', exchange: 'KOSPI' },
    { symbol: '004990.KS', name: '롯데지주', nameEn: 'Lotte Corp.', exchange: 'KOSPI' },
    { symbol: '005180.KS', name: '빙그레', nameEn: 'Binggrae', exchange: 'KOSPI' },
    { symbol: '004150.KS', name: '한솔페이퍼', nameEn: 'Hansol Paper', exchange: 'KOSPI' },
    { symbol: '001680.KS', name: '대상', nameEn: 'Daesang Corp.', exchange: 'KOSPI' },
    { symbol: '003410.KS', name: '쌍용C&E', nameEn: 'Ssangyong C&E', exchange: 'KOSPI' },
    { symbol: '002270.KS', name: '롯데푸드', nameEn: 'Lotte Food', exchange: 'KOSPI' },
    { symbol: '117930.KS', name: '한진', nameEn: 'Hanjin', exchange: 'KOSPI' },

    // 유통/운송 (Retail/Transportation)
    { symbol: '069960.KS', name: '현대백화점', nameEn: 'Hyundai Department Store', exchange: 'KOSPI' },
    { symbol: '007070.KS', name: 'GS리테일', nameEn: 'GS Retail', exchange: 'KOSPI' },
    { symbol: '004170.KS', name: '신세계', nameEn: 'Shinsegae', exchange: 'KOSPI' },
    { symbol: '139480.KS', name: '이마트', nameEn: 'E-Mart', exchange: 'KOSPI' },
    { symbol: '028670.KS', name: '팬오션', nameEn: 'Pan Ocean', exchange: 'KOSPI' },
    { symbol: '011200.KS', name: 'HMM', nameEn: 'HMM Co.', exchange: 'KOSPI' },
    { symbol: '000120.KS', name: 'CJ대한통운', nameEn: 'CJ Logistics', exchange: 'KOSPI' },
    { symbol: '027740.KS', name: '마니커', nameEn: 'Maniker', exchange: 'KOSPI' },

    // 화장품/생활용품 (Cosmetics/Consumer)
    { symbol: '051900.KS', name: 'LG생활건강', nameEn: 'LG Household & Health Care', exchange: 'KOSPI' },
    { symbol: '090430.KS', name: '아모레퍼시픽', nameEn: 'Amorepacific', exchange: 'KOSPI' },
    { symbol: '090435.KS', name: '아모레퍼시픽우', nameEn: 'Amorepacific Pref', exchange: 'KOSPI' },
    { symbol: '002795.KS', name: '아모레G우', nameEn: 'Amore G Pref', exchange: 'KOSPI' },

    // 제약/바이오 (Pharma/Bio)
    { symbol: '128940.KS', name: '한미약품', nameEn: 'Hanmi Pharm', exchange: 'KOSPI' },
    { symbol: '006280.KS', name: '녹십자', nameEn: 'Green Cross', exchange: 'KOSPI' },
    { symbol: '185750.KS', name: '종근당', nameEn: 'Chong Kun Dang Pharm', exchange: 'KOSPI' },
    { symbol: '000020.KS', name: '동화약품', nameEn: 'Dong Wha Pharm', exchange: 'KOSPI' },
    { symbol: '002390.KS', name: '한독', nameEn: 'Handok', exchange: 'KOSPI' },
    { symbol: '003000.KS', name: '부광약품', nameEn: 'Bukwang Pharm', exchange: 'KOSPI' },
    { symbol: '004180.KS', name: '태영건설', nameEn: 'Taeyoung Engineering', exchange: 'KOSPI' },

    // IT/소프트웨어 (IT/Software)
    { symbol: '035760.KS', name: 'CJ ENM', nameEn: 'CJ ENM', exchange: 'KOSPI' },
    { symbol: '016360.KS', name: '삼성증권', nameEn: 'Samsung Securities', exchange: 'KOSPI' },
    { symbol: '006800.KS', name: '미래에셋증권', nameEn: 'Mirae Asset Securities', exchange: 'KOSPI' },
    { symbol: '016610.KS', name: 'DB금융투자', nameEn: 'DB Financial Investment', exchange: 'KOSPI' },
    { symbol: '005940.KS', name: 'NH투자증권', nameEn: 'NH Investment & Securities', exchange: 'KOSPI' },
    { symbol: '039490.KS', name: '키움증권', nameEn: 'Kiwoom Securities', exchange: 'KOSPI' },
    { symbol: '030610.KS', name: '교보증권', nameEn: 'Kyobo Securities', exchange: 'KOSPI' },

    // 기타 KOSPI
    { symbol: '078930.KS', name: 'GS', nameEn: 'GS Holdings', exchange: 'KOSPI' },
    { symbol: '180640.KS', name: '한진칼', nameEn: 'Hanjin Kal', exchange: 'KOSPI' },
    { symbol: '000880.KS', name: '한화', nameEn: 'Hanwha Corp.', exchange: 'KOSPI' },
    { symbol: '009240.KS', name: '한샘', nameEn: 'Hanssem', exchange: 'KOSPI' },
    { symbol: '002380.KS', name: 'KCC', nameEn: 'KCC Corp.', exchange: 'KOSPI' },
    { symbol: '003230.KS', name: '삼양식품', nameEn: 'Samyang Foods', exchange: 'KOSPI' },
    { symbol: '005070.KS', name: '코스모신소재', nameEn: 'Cosmo Advanced Materials', exchange: 'KOSPI' },
    { symbol: '000210.KS', name: '대림산업', nameEn: 'DL E&C', exchange: 'KOSPI' },
    { symbol: '000080.KS', name: '하이트진로', nameEn: 'HiteJinro', exchange: 'KOSPI' },
    { symbol: '000070.KS', name: '삼양홀딩스', nameEn: 'Samyang Holdings', exchange: 'KOSPI' },
    { symbol: '000040.KS', name: 'KR모터스', nameEn: 'KR Motors', exchange: 'KOSPI' },
    { symbol: '012510.KS', name: '더존비즈온', nameEn: 'Douzone Bizon', exchange: 'KOSPI' },
    { symbol: '036530.KS', name: 'S&T홀딩스', nameEn: 'S&T Holdings', exchange: 'KOSPI' },
    { symbol: '004800.KS', name: '효성', nameEn: 'Hyosung Corp.', exchange: 'KOSPI' },
    { symbol: '298050.KS', name: '효성첨단소재', nameEn: 'Hyosung Advanced Materials', exchange: 'KOSPI' },
    { symbol: '010620.KS', name: '현대미포조선', nameEn: 'Hyundai Mipo Dockyard', exchange: 'KOSPI' },
    { symbol: '071050.KS', name: '한국금융지주', nameEn: 'Korea Financial Holdings', exchange: 'KOSPI' },

    // ========== KOSDAQ - 시가총액 상위 종목 ==========

    // 2차전지/에너지 (Secondary Battery/Energy)
    { symbol: '247540.KQ', name: '에코프로비엠', nameEn: 'EcoPro BM', exchange: 'KOSDAQ' },
    { symbol: '086520.KQ', name: '에코프로', nameEn: 'EcoPro', exchange: 'KOSDAQ' },
    { symbol: '066970.KQ', name: '엘앤에프', nameEn: 'L&F Co.', exchange: 'KOSDAQ' },
    { symbol: '064550.KQ', name: '바이오니아', nameEn: 'Bioneer Corp.', exchange: 'KOSDAQ' },
    { symbol: '299030.KQ', name: '하나기술', nameEn: 'Hana Technology', exchange: 'KOSDAQ' },

    // 바이오/헬스케어 (Bio/Healthcare)
    { symbol: '196170.KQ', name: '알테오젠', nameEn: 'Alteogen', exchange: 'KOSDAQ' },
    { symbol: '141080.KQ', name: '리가켐바이오', nameEn: 'Legochem Biosciences', exchange: 'KOSDAQ' },
    { symbol: '214450.KQ', name: '파마리서치', nameEn: 'PharmaResearch', exchange: 'KOSDAQ' },
    { symbol: '233000.KQ', name: '휴젤', nameEn: 'Hugel', exchange: 'KOSDAQ' },
    { symbol: '068760.KQ', name: '셀트리온제약', nameEn: 'Celltrion Pharm', exchange: 'KOSDAQ' },
    { symbol: '091990.KQ', name: '셀트리온헬스케어', nameEn: 'Celltrion Healthcare', exchange: 'KOSDAQ' },
    { symbol: '145020.KQ', name: '휴젤', nameEn: 'Hugel', exchange: 'KOSDAQ' },
    { symbol: '950130.KQ', name: '펩트론', nameEn: 'Peptron', exchange: 'KOSDAQ' },
    { symbol: '086900.KQ', name: '메디톡스', nameEn: 'Medytox', exchange: 'KOSDAQ' },
    { symbol: '323410.KQ', name: '카카오뱅크', nameEn: 'KakaoBank', exchange: 'KOSDAQ' },
    { symbol: '039200.KQ', name: '오스코텍', nameEn: 'Oscotec', exchange: 'KOSDAQ' },
    { symbol: '060850.KQ', name: '영림원소프트랩', nameEn: 'Youngrim Won Soft Lab', exchange: 'KOSDAQ' },

    // 반도체/장비 (Semiconductor/Equipment)
    { symbol: '058470.KQ', name: '리노공업', nameEn: 'LEENO Industrial', exchange: 'KOSDAQ' },
    { symbol: '039030.KQ', name: '이오테크닉스', nameEn: 'EO Technics', exchange: 'KOSDAQ' },
    { symbol: '240810.KQ', name: '원익IPS', nameEn: 'Wonik IPS', exchange: 'KOSDAQ' },
    { symbol: '214150.KQ', name: '클래시스', nameEn: 'Classis', exchange: 'KOSDAQ' },
    { symbol: '036930.KQ', name: '주성엔지니어링', nameEn: 'Jusung Engineering', exchange: 'KOSDAQ' },
    { symbol: '357780.KQ', name: '솔브레인', nameEn: 'Soulbrain', exchange: 'KOSDAQ' },
    { symbol: '348210.KQ', name: '넥스틴', nameEn: 'Nextin', exchange: 'KOSDAQ' },
    { symbol: '095340.KQ', name: 'ISC', nameEn: 'ISC Co.', exchange: 'KOSDAQ' },
    { symbol: '098460.KQ', name: '고영', nameEn: 'Koh Young Technology', exchange: 'KOSDAQ' },
    { symbol: '122870.KQ', name: 'YG PLUS', nameEn: 'YG PLUS', exchange: 'KOSDAQ' },
    { symbol: '036540.KQ', name: 'SFA반도체', nameEn: 'SFA Semiconductor', exchange: 'KOSDAQ' },
    { symbol: '078600.KQ', name: '대주전자재료', nameEn: 'Daejoo Electronic Materials', exchange: 'KOSDAQ' },
    { symbol: '166090.KQ', name: '하나머티리얼즈', nameEn: 'Hana Materials', exchange: 'KOSDAQ' },
    { symbol: '131970.KQ', name: '테스나', nameEn: 'Tesna', exchange: 'KOSDAQ' },
    { symbol: '089030.KQ', name: '테크윙', nameEn: 'Techwing', exchange: 'KOSDAQ' },
    { symbol: '083310.KQ', name: '엘오티베큠', nameEn: 'LOT Vacuum', exchange: 'KOSDAQ' },

    // 게임/엔터테인먼트 (Game/Entertainment)
    { symbol: '251270.KQ', name: '넷마블', nameEn: 'Netmarble', exchange: 'KOSDAQ' },
    { symbol: '293490.KQ', name: '카카오게임즈', nameEn: 'Kakao Games', exchange: 'KOSDAQ' },
    { symbol: '041510.KQ', name: '에스엠', nameEn: 'SM Entertainment', exchange: 'KOSDAQ' },
    { symbol: '035900.KQ', name: 'JYP Ent.', nameEn: 'JYP Entertainment', exchange: 'KOSDAQ' },
    { symbol: '352820.KQ', name: '하이브', nameEn: 'HYBE', exchange: 'KOSDAQ' },
    { symbol: '036570.KQ', name: '엔씨소프트', nameEn: 'NCSOFT', exchange: 'KOSDAQ' },
    { symbol: '263750.KQ', name: '펄어비스', nameEn: 'Pearl Abyss', exchange: 'KOSDAQ' },
    { symbol: '112040.KQ', name: '위메이드', nameEn: 'Wemade', exchange: 'KOSDAQ' },
    { symbol: '194480.KQ', name: '데브시스터즈', nameEn: 'Devsisters', exchange: 'KOSDAQ' },
    { symbol: '078340.KQ', name: '컴투스', nameEn: 'Com2uS', exchange: 'KOSDAQ' },
    { symbol: '225570.KQ', name: '넥슨게임즈', nameEn: 'Nexon Games', exchange: 'KOSDAQ' },
    { symbol: '069080.KQ', name: '웹젠', nameEn: 'Webzen', exchange: 'KOSDAQ' },
    { symbol: '192080.KQ', name: '더블유게임즈', nameEn: 'DoubleU Games', exchange: 'KOSDAQ' },

    // 로봇/자동화 (Robotics/Automation)
    { symbol: '277810.KQ', name: '레인보우로보틱스', nameEn: 'Rainbow Robotics', exchange: 'KOSDAQ' },
    { symbol: '336370.KQ', name: '솔트룩스', nameEn: 'Saltlux', exchange: 'KOSDAQ' },
    { symbol: '039440.KQ', name: '에스티아이', nameEn: 'STI', exchange: 'KOSDAQ' },

    // IT/인터넷 (IT/Internet)  
    { symbol: '035760.KQ', name: '카카오페이', nameEn: 'Kakao Pay', exchange: 'KOSDAQ' },
    { symbol: '377300.KQ', name: '카카오페이', nameEn: 'Kakao Pay', exchange: 'KOSDAQ' },
    { symbol: '053800.KQ', name: '안랩', nameEn: 'AhnLab', exchange: 'KOSDAQ' },
    { symbol: '067160.KQ', name: '아프리카TV', nameEn: 'AfreecaTV', exchange: 'KOSDAQ' },
    { symbol: '035420.KQ', name: 'NAVER', nameEn: 'NAVER Corp.', exchange: 'KOSDAQ' },
    { symbol: '036570.KQ', name: 'NCSoft', nameEn: 'NCSOFT', exchange: 'KOSDAQ' },
    { symbol: '042000.KQ', name: '카페24', nameEn: 'Cafe24', exchange: 'KOSDAQ' },
    { symbol: '078070.KQ', name: '유비쿼스홀딩스', nameEn: 'Ubiquoss Holdings', exchange: 'KOSDAQ' },

    // 디스플레이/소재 (Display/Materials)
    { symbol: '117730.KQ', name: '티로보틱스', nameEn: 'T-Robotics', exchange: 'KOSDAQ' },
    { symbol: '041920.KQ', name: '메디아나', nameEn: 'Mediana', exchange: 'KOSDAQ' },
    { symbol: '053030.KQ', name: '바이넥스', nameEn: 'Binex', exchange: 'KOSDAQ' },
    { symbol: '060280.KQ', name: '큐렉소', nameEn: 'Curexo', exchange: 'KOSDAQ' },
    { symbol: '083790.KQ', name: '크리스탈지노믹스', nameEn: 'Crystal Genomics', exchange: 'KOSDAQ' },
    { symbol: '052020.KQ', name: '에스티큐브', nameEn: 'STCube', exchange: 'KOSDAQ' },

    // 기타 KOSDAQ
    { symbol: '090460.KQ', name: '비에이치', nameEn: 'BH', exchange: 'KOSDAQ' },
    { symbol: '102120.KQ', name: '어보브반도체', nameEn: 'ABOV Semiconductor', exchange: 'KOSDAQ' },
    { symbol: '222800.KQ', name: '심텍', nameEn: 'Simmtech', exchange: 'KOSDAQ' },
    { symbol: '086980.KQ', name: '쇼박스', nameEn: 'Showbox', exchange: 'KOSDAQ' },
    { symbol: '101490.KQ', name: '에스앤에스텍', nameEn: 'S&S Tech', exchange: 'KOSDAQ' },
    { symbol: '236810.KQ', name: '엔비티', nameEn: 'NBT', exchange: 'KOSDAQ' },
    { symbol: '175250.KQ', name: '아이큐어', nameEn: 'ICURE', exchange: 'KOSDAQ' },
    { symbol: '049520.KQ', name: '유아이엘', nameEn: 'UIL', exchange: 'KOSDAQ' },
    { symbol: '047310.KQ', name: '파워로직스', nameEn: 'Powerlogics', exchange: 'KOSDAQ' },
    { symbol: '950140.KQ', name: '잉글우드랩', nameEn: 'Inglewood Lab', exchange: 'KOSDAQ' },
    { symbol: '035610.KQ', name: '솔본', nameEn: 'Solborn', exchange: 'KOSDAQ' },
    { symbol: '048410.KQ', name: '현대바이오', nameEn: 'Hyundai Bio', exchange: 'KOSDAQ' },
    { symbol: '140410.KQ', name: '메지온', nameEn: 'Mezzion Pharma', exchange: 'KOSDAQ' },
    { symbol: '054620.KQ', name: 'APS홀딩스', nameEn: 'APS Holdings', exchange: 'KOSDAQ' },
    { symbol: '041190.KQ', name: '우리기술투자', nameEn: 'Woori Technology Investment', exchange: 'KOSDAQ' },
    { symbol: '094360.KQ', name: '칩스앤미디어', nameEn: 'Chips&Media', exchange: 'KOSDAQ' },
    { symbol: '086220.KQ', name: '광동헬스바이오', nameEn: 'Kwangdong HealthBio', exchange: 'KOSDAQ' },
    { symbol: '215200.KQ', name: '메가스터디교육', nameEn: 'Megastudy Education', exchange: 'KOSDAQ' },
    { symbol: '064260.KQ', name: '다날', nameEn: 'Danal', exchange: 'KOSDAQ' },
    { symbol: '053610.KQ', name: '프로텍', nameEn: 'Protec', exchange: 'KOSDAQ' },
    { symbol: '115310.KQ', name: '파이버프로', nameEn: 'FiberPro', exchange: 'KOSDAQ' },
    { symbol: '065350.KQ', name: '신성델타테크', nameEn: 'Shinsung Delta Tech', exchange: 'KOSDAQ' },
    { symbol: '096530.KQ', name: '씨젠', nameEn: 'Seegene', exchange: 'KOSDAQ' },
    { symbol: '137400.KQ', name: '피엔티', nameEn: 'PNT', exchange: 'KOSDAQ' },
    { symbol: '043650.KQ', name: '국순당', nameEn: 'Kooksoondang', exchange: 'KOSDAQ' },
    { symbol: '322510.KQ', name: '제이엘케이', nameEn: 'JLK', exchange: 'KOSDAQ' },
    { symbol: '217190.KQ', name: '제너셈', nameEn: 'Genersem', exchange: 'KOSDAQ' },
    { symbol: '064350.KQ', name: '현대로템', nameEn: 'Hyundai Rotem', exchange: 'KOSDAQ' },
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
            stock.symbol.toLowerCase().includes(lowerQuery) ||
            stock.symbol.replace(/\.(KS|KQ)$/, '').includes(lowerQuery)
        )
        .slice(0, limit);
}

/**
 * Get stock name by symbol
 */
export function getKoreanStockName(symbol: string): string | null {
    const stock = KOREAN_STOCK_MAPPINGS.find(s =>
        s.symbol === symbol ||
        s.symbol.replace(/\.(KS|KQ)$/, '') === symbol.replace(/\.(KS|KQ)$/, '')
    );
    return stock?.name || null;
}
