import { GAME_CONFIG, BUILDINGS, FACTORY_LEVELS } from '../core/GameConfig.js';

/**
 * 碳費計算系統
 * 完整實現 GDD 第 7 節的碳費公式
 */
export class CarbonFeeSystem {
    constructor(gameState, landSystem) {
        this.gameState = gameState;
        this.landSystem = landSystem;
    }

    /**
     * 計算年度總排放量
     * 公式：TotalEmission = Σ(直接排放 × 地塊係數 × 工廠等級係數) + 間接排放
     * 
     * @param {string} owner - 玩家標識 ('P', 'A', 'B', 'C')
     * @returns {number} 總排放量（噸）
     */
    calculateTotalEmission(owner = 'P') {
        let totalEmission = 0;
        const buildings = owner === 'P' 
            ? this.gameState.getPlayerBuildings()
            : this.gameState.buildings.filter(b => b.owner === owner);

        buildings.forEach(building => {
            const buildingData = BUILDINGS[building.type];
            if (!buildingData) return;

            // 獲取地塊屬性
            const land = this.landSystem.getLand(building.tileIndex);
            const landCoeff = land ? land.emissionCoeff : 1.0;

            // 獲取工廠等級係數
            const level = building.level || 'Lv1';
            const levelData = FACTORY_LEVELS[level];
            const levelCoeff = levelData ? levelData.levelCoeff : 1.0;

            // 直接排放 × 地塊係數 × 工廠等級係數
            const directEmission = buildingData.directEmission || buildingData.emission;
            const adjustedDirect = directEmission * landCoeff * levelCoeff;

            // 間接排放（不受地塊和等級影響，但受綠電網區影響）
            let indirectEmission = buildingData.indirectEmission || 0;
            if (land && land.type === 'greenGrid') {
                indirectEmission *= 0.5; // 綠電網區間接排放減少 50%
            }

            totalEmission += adjustedDirect + indirectEmission;
        });

        return Math.round(totalEmission);
    }

    /**
     * 計算收費排放量
     * 公式：Chargeable = (TotalEmission − 25,000) × 行業係數
     * 
     * @param {string} owner - 玩家標識
     * @returns {number} 收費排放量（噸）
     */
    calculateChargeableEmission(owner = 'P') {
        const totalEmission = this.calculateTotalEmission(owner);
        
        // 扣除免徵額度
        const afterFree = Math.max(0, totalEmission - GAME_CONFIG.freeEmission);
        
        // 計算行業係數加權平均
        const buildings = owner === 'P' 
            ? this.gameState.getPlayerBuildings()
            : this.gameState.buildings.filter(b => b.owner === owner);
        
        if (buildings.length === 0) return 0;

        // 按排放量加權計算行業係數
        let totalWeightedCoeff = 0;
        let totalEmissionForWeight = 0;

        buildings.forEach(building => {
            const buildingData = BUILDINGS[building.type];
            if (!buildingData) return;

            const buildingEmission = this.calculateBuildingEmission(building);
            totalWeightedCoeff += buildingEmission * buildingData.industryCoeff;
            totalEmissionForWeight += buildingEmission;
        });

        const avgIndustryCoeff = totalEmissionForWeight > 0 
            ? totalWeightedCoeff / totalEmissionForWeight 
            : 1.0;

        // 套用行業係數
        const chargeable = Math.round(afterFree * avgIndustryCoeff);
        
        return chargeable;
    }

    /**
     * 計算單個建築的排放量（考慮地塊和等級）
     */
    calculateBuildingEmission(building) {
        const buildingData = BUILDINGS[building.type];
        if (!buildingData) return 0;

        const land = this.landSystem.getLand(building.tileIndex);
        const landCoeff = land ? land.emissionCoeff : 1.0;

        const level = building.level || 'Lv1';
        const levelData = FACTORY_LEVELS[level];
        const levelCoeff = levelData ? levelData.levelCoeff : 1.0;

        const directEmission = buildingData.directEmission || buildingData.emission;
        const adjustedDirect = directEmission * landCoeff * levelCoeff;

        let indirectEmission = buildingData.indirectEmission || 0;
        if (land && land.type === 'greenGrid') {
            indirectEmission *= 0.5;
        }

        return adjustedDirect + indirectEmission;
    }

    /**
     * 計算碳權扣減
     * 公式：
     * DomesticDeduction = min(DomesticCredit × 1.2, Chargeable × 10%)
     * InternationalDeduction = min(IntlCredit × 1.0, Chargeable × 5%)
     * 
     * @param {number} chargeable - 收費排放量
     * @param {number} domesticCredits - 國內額度
     * @param {number} intlCredits - 國際碳權
     * @returns {Object} { domestic, international, total }
     */
    calculateCreditDeduction(chargeable, domesticCredits, intlCredits) {
        // 國內額度扣減
        const domesticMax = chargeable * GAME_CONFIG.domesticCreditMaxPercent;
        const domesticDeduction = Math.min(
            domesticCredits * GAME_CONFIG.domesticCreditMultiplier,
            domesticMax
        );

        // 國際碳權扣減
        const intlMax = chargeable * GAME_CONFIG.intlCreditMaxPercent;
        const intlDeduction = Math.min(
            intlCredits * GAME_CONFIG.intlCreditMultiplier,
            intlMax
        );

        return {
            domestic: Math.round(domesticDeduction),
            international: Math.round(intlDeduction),
            total: Math.round(domesticDeduction + intlDeduction)
        };
    }

    /**
     * 計算最終碳費
     * 公式：CarbonFee = (Chargeable − DomesticDeduction − IntlDeduction) × FactoryRate
     * 
     * @param {string} owner - 玩家標識
     * @returns {Object} 詳細的碳費計算結果
     */
    calculateCarbonFee(owner = 'P') {
        const chargeable = this.calculateChargeableEmission(owner);
        
        // 獲取碳權
        const domesticCredits = owner === 'P' 
            ? this.gameState.domesticCredits 
            : 0; // NPC 的碳權簡化處理
        const intlCredits = owner === 'P' 
            ? this.gameState.intlCredits 
            : 0;

        // 計算扣減
        const deduction = this.calculateCreditDeduction(
            chargeable, 
            domesticCredits, 
            intlCredits
        );

        // 計算應繳排放量
        const taxableEmission = Math.max(0, chargeable - deduction.total);

        // 計算工廠等級費率（加權平均）
        const buildings = owner === 'P' 
            ? this.gameState.getPlayerBuildings()
            : this.gameState.buildings.filter(b => b.owner === owner);

        let avgRate = FACTORY_LEVELS.Lv1.rate; // 預設 Lv1 費率
        if (buildings.length > 0) {
            let totalWeightedRate = 0;
            let totalEmissionForWeight = 0;

            buildings.forEach(building => {
                const buildingEmission = this.calculateBuildingEmission(building);
                const level = building.level || 'Lv1';
                const levelData = FACTORY_LEVELS[level];
                const rate = levelData ? levelData.rate : FACTORY_LEVELS.Lv1.rate;

                totalWeightedRate += buildingEmission * rate;
                totalEmissionForWeight += buildingEmission;
            });

            avgRate = totalEmissionForWeight > 0 
                ? totalWeightedRate / totalEmissionForWeight 
                : FACTORY_LEVELS.Lv1.rate;
        }

        // 最終碳費（費率單位：每噸，直接乘以排放量）
        // 例如：費率 500 表示每噸 500 元
        let carbonFee = Math.round(taxableEmission * (avgRate / 100));
        
        // 早期擴張懲罰（前3回合，碳費增加 50%）
        if (GAME_CONFIG.earlyExpansionPenalty && this.gameState.turn <= 3 && owner === 'P') {
            const penaltyMultiplier = GAME_CONFIG.earlyExpansionPenaltyRate || 1.5;
            carbonFee = Math.round(carbonFee * penaltyMultiplier);
        }

        return {
            totalEmission: this.calculateTotalEmission(owner),
            chargeable,
            deduction,
            taxableEmission,
            averageRate: avgRate,
            carbonFee,
            breakdown: {
                freeEmission: GAME_CONFIG.freeEmission,
                afterFree: Math.max(0, this.calculateTotalEmission(owner) - GAME_CONFIG.freeEmission),
                industryCoeff: chargeable / Math.max(1, Math.max(0, this.calculateTotalEmission(owner) - GAME_CONFIG.freeEmission))
            }
        };
    }

    /**
     * 計算 CBAM 境外稅（第 6 回合起）
     * 
     * @param {string} owner - 玩家標識
     * @param {number} turn - 當前回合數
     * @returns {number} CBAM 稅額
     */
    calculateCBAMTax(owner = 'P', turn) {
        if (turn < GAME_CONFIG.cbamStartTurn) {
            return 0;
        }

        const buildings = owner === 'P' 
            ? this.gameState.getPlayerBuildings()
            : this.gameState.buildings.filter(b => b.owner === owner);

        // 只對出口相關產業徵收（燃氣供應業等）
        let exportEmission = 0;
        buildings.forEach(building => {
            const buildingData = BUILDINGS[building.type];
            if (buildingData && (buildingData.id === 'gasSupply' || buildingData.id === 'manufacturing')) {
                exportEmission += this.calculateBuildingEmission(building);
            }
        });

        // CBAM 稅率：每噸 $50（簡化）
        const cbamRate = 50;
        return Math.round(exportEmission * cbamRate);
    }
}

