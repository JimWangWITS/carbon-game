/**
 * 遊戲配置常數
 * 對應 GDD 中的各項設定
 */
export const GAME_CONFIG = {
    maxYears: 10,
    freeEmission: 10000, // 降低免徵額度：10,000 噸（更符合現實壓力）
    monsterThreshold: 80000, // 降低全球總排放上限，增加緊迫感
    initialMoney: 40000, // 降低初始資金，增加資源壓力
    domesticCreditMultiplier: 1.2, // 國內額度扣減係數 (1 → 1.2)
    intlCreditMultiplier: 1.0, // 國際碳權扣減係數 (1 → 1.0)
    domesticCreditMaxPercent: 0.10, // 國內額度最多扣減 10%
    intlCreditMaxPercent: 0.05, // 國際碳權最多扣減 5%
    auditInterval: 3, // 每 3 回合查核一次
    cbamStartTurn: 6, // 第 6 回合起套用 CBAM
    monsterGrowthDivisor: 1800, // 怪獸成長除數（進一步降低，原 2500）
    initialMonsterAnger: 30, // 初始怪獸怒氣提高（原 25）
    maxBuildingsPerTurn: 2, // 每回合最多建造數量（限制擴張速度）
    monsterBaseGrowth: 2, // 怪獸基礎成長（即使零排放也會成長，模擬背景污染）
    earlyExpansionPenalty: true, // 早期擴張懲罰（前3回合）
    earlyExpansionPenaltyRate: 1.5 // 早期擴張碳費倍率
};

/**
 * 工廠類型配置
 * 對應 GDD 第 6 節
 */
export const BUILDINGS = {
    coal: { 
        id: 'coal', 
        name: '燃煤電廠', 
        emoji: '🏭', 
        cost: 3000, // 提高成本
        income: 7000, // 稍微提高收入，但利潤率降低
        emission: 3500, // 大幅提高排放（原 2000）
        directEmission: 3500, // 直接排放
        indirectEmission: 0, // 間接排放
        desc: '便宜、賺得多，但是怪獸最愛吃這個。',
        type: 'high_pollute',
        industryCoeff: 1.0, // 行業係數
        canUpgrade: true
    },
    gas: { 
        id: 'gas', 
        name: '燃氣電廠', 
        emoji: '⛽', 
        cost: 5000, // 提高成本
        income: 6000, // 提高收入
        emission: 1500, // 提高排放（原 800）
        directEmission: 1500,
        indirectEmission: 0,
        desc: '比燃煤乾淨一點，不錯的平衡選擇。',
        type: 'mid_pollute',
        industryCoeff: 0.8,
        canUpgrade: true
    },
    solar: { 
        id: 'solar', 
        name: '太陽能場', 
        emoji: '☀️', 
        cost: 8000, 
        income: 3000, 
        emission: 0,
        directEmission: 0,
        indirectEmission: 0,
        desc: '超乾淨！完全沒有碳費，但賺得慢。',
        type: 'clean',
        industryCoeff: 0.2,
        canUpgrade: false
    },
    tech: { 
        id: 'tech', 
        name: '高科技工廠', 
        emoji: '🦾', 
        cost: 10000, 
        income: 7000, 
        emission: 500,
        directEmission: 300,
        indirectEmission: 200,
        desc: '高成本高回報，排放很低。',
        type: 'advanced',
        industryCoeff: 0.3,
        canUpgrade: true
    },
    manufacturing: {
        id: 'manufacturing',
        name: '製造業',
        emoji: '🏗️',
        cost: 6000,
        income: 6500,
        emission: 2000, // 提高排放（原 1200）
        directEmission: 1400,
        indirectEmission: 600,
        desc: '產量可調，中等排放。',
        type: 'mid_pollute',
        industryCoeff: 0.6,
        canUpgrade: true
    },
    gasSupply: {
        id: 'gasSupply',
        name: '燃氣供應業',
        emoji: '🔌',
        cost: 7000,
        income: 7000,
        emission: 1800, // 提高排放（原 1000）
        directEmission: 1100,
        indirectEmission: 700,
        desc: '出口需求高（受 CBAM 影響）。',
        type: 'mid_pollute',
        industryCoeff: 0.7,
        canUpgrade: true
    }
};

/**
 * 工廠等級配置
 * 對應 GDD 第 6 節
 */
export const FACTORY_LEVELS = {
    Lv1: {
        name: '一般',
        rate: 500, // 提高費率（原 300），增加碳費壓力
        emissionReduction: 0, // 排放減少 0%
        levelCoeff: 1.0
    },
    Lv2: {
        name: '技術標竿',
        rate: 200, // 提高費率（原 100），但仍有減免
        emissionReduction: 0.2, // 排放 -20%
        levelCoeff: 0.8
    },
    Lv3: {
        name: '行業削減',
        rate: 100, // 提高費率（原 50），但仍有大幅減免
        emissionReduction: 0.4, // 排放 -40%
        levelCoeff: 0.6
    }
};

/**
 * 玩家配置
 */
export const OWNER_CONFIG = {
    P: { name: '你', label: '你', color: 'border-yellow-400', badgeBg: 'bg-yellow-500', badgeText: 'P', tooltip: '你的地塊' },
    A: { name: '暴發戶阿金', label: '暴發戶阿金', color: 'border-rose-400', badgeBg: 'bg-rose-500', badgeText: 'A', tooltip: '暴發戶阿金的地塊' },
    B: { name: '博士', label: '博士', color: 'border-sky-400', badgeBg: 'bg-sky-500', badgeText: 'B', tooltip: '博士的地塊' },
    C: { name: '成本魔人小李', label: '成本魔人小李', color: 'border-amber-400', badgeBg: 'bg-amber-500', badgeText: 'C', tooltip: '成本魔人小李的地塊' }
};

