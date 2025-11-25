import { GAME_CONFIG } from '../core/GameConfig.js';

/**
 * 回合系統
 * 實現 GDD 第 4 節的回合流程，包括查核事件和 CBAM
 */
export class TurnSystem {
    constructor(gameState, carbonFeeSystem) {
        this.gameState = gameState;
        this.carbonFeeSystem = carbonFeeSystem;
        this.auditHistory = []; // 查核歷史記錄
    }

    /**
     * 執行年度結算
     * 對應 GDD 第 4 節「階段三：年度結算」
     * 
     * @returns {Object} 結算結果
     */
    executeYearEndSettlement() {
        const result = {
            income: 0,
            carbonFee: 0,
            cbamTax: 0,
            totalTax: 0,
            netIncome: 0,
            auditEvent: null,
            cbamApplied: false
        };

        // 1. 計算收入
        result.income = this.gameState.projectedIncome || 0;

        // 2. 計算碳費
        const carbonFeeResult = this.carbonFeeSystem.calculateCarbonFee('P');
        result.carbonFee = carbonFeeResult.carbonFee;

        // 3. 計算 CBAM 稅（第 6 回合起）
        if (this.gameState.turn >= GAME_CONFIG.cbamStartTurn) {
            result.cbamTax = this.carbonFeeSystem.calculateCBAMTax('P', this.gameState.turn);
            result.cbamApplied = true;
        }

        result.totalTax = result.carbonFee + result.cbamTax;
        result.netIncome = result.income - result.totalTax;

        // 4. 扣除使用的碳權
        this.gameState.setDomesticCredits(
            Math.max(0, this.gameState.domesticCredits - Math.floor(carbonFeeResult.deduction.domestic / GAME_CONFIG.domesticCreditMultiplier))
        );
        this.gameState.setIntlCredits(
            Math.max(0, this.gameState.intlCredits - Math.floor(carbonFeeResult.deduction.international / GAME_CONFIG.intlCreditMultiplier))
        );

        // 5. 結算財務
        this.gameState.addMoney(result.income);
        this.gameState.subtractMoney(result.totalTax);

        // 6. 檢查查核事件（每 3 回合）
        if (this.gameState.turn % GAME_CONFIG.auditInterval === 0) {
            result.auditEvent = this.executeAuditEvent();
        }

        return result;
    }

    /**
     * 執行查核事件
     * 每 3 回合觸發一次
     * 
     * @returns {Object} 查核事件結果
     */
    executeAuditEvent() {
        const auditResult = {
            triggered: true,
            turn: this.gameState.turn,
            penalties: [],
            bonuses: [],
            message: ''
        };

        // 計算玩家排放
        const playerEmission = this.carbonFeeSystem.calculateTotalEmission('P');
        const chargeable = this.carbonFeeSystem.calculateChargeableEmission('P');

        // 查核邏輯：根據排放量決定結果（調整閾值以符合新的免徵額度）
        if (chargeable > 30000) {
            // 超高排放：罰款（降低閾值，提高罰款比例）
            const penalty = Math.floor(chargeable * 0.15); // 提高罰款比例到 15%
            this.gameState.subtractMoney(penalty);
            auditResult.penalties.push({
                type: 'high_emission',
                amount: penalty,
                message: `因排放過高被罰款 $${penalty.toLocaleString()}`
            });
            auditResult.message = `⚠️ 查核結果：排放過高，罰款 $${penalty.toLocaleString()}`;
        } else if (chargeable > 15000) {
            // 高排放：警告（降低閾值）
            auditResult.message = `⚠️ 查核結果：排放偏高，請注意減碳`;
        } else if (chargeable < 5000 && playerEmission > 0) {
            // 低排放：獎勵（需要有一定排放量，不能是 0）
            const bonus = Math.floor(this.gameState.money * 0.05); // 獎勵為資金的 5%
            this.gameState.addMoney(bonus);
            auditResult.bonuses.push({
                type: 'low_emission',
                amount: bonus,
                message: `因減碳成效良好獲得獎勵 $${bonus.toLocaleString()}`
            });
            auditResult.message = `✅ 查核結果：減碳成效良好，獲得獎勵 $${bonus.toLocaleString()}`;
        } else {
            auditResult.message = `✓ 查核結果：一切正常`;
        }

        // 記錄查核歷史
        this.auditHistory.push({
            turn: this.gameState.turn,
            emission: playerEmission,
            chargeable,
            result: auditResult
        });

        return auditResult;
    }

    /**
     * 計算全球排放並更新怪獸
     * 
     * @returns {Object} 怪獸成長資訊
     */
    updateMonsterFromGlobalEmission() {
        // 計算全球總排放
        const playerEmission = this.carbonFeeSystem.calculateTotalEmission('P');
        const npcTotalEmission = Object.keys(this.gameState.competitors).reduce((s, k) => {
            return s + this.carbonFeeSystem.calculateTotalEmission(k);
        }, 0);
        const totalWorldEmission = playerEmission + npcTotalEmission;

        // 計算成長率（使用配置的除數，越小成長越快）
        const divisor = this.gameState.monsterGrowthDivisor || GAME_CONFIG.monsterGrowthDivisor || 1800;
        let growth = Math.floor(totalWorldEmission / divisor);

        // 基礎成長（即使零排放也會成長，模擬背景污染和累積效應）
        const baseGrowth = GAME_CONFIG.monsterBaseGrowth || 2;
        growth += baseGrowth;

        // 回合累積效應：回合數越多，基礎成長越快
        const turnMultiplier = 1 + (this.gameState.turn * 0.1); // 每回合增加 10%
        growth = Math.floor(growth * turnMultiplier);

        // 70% 時怪獸狂暴，排放加成 ×1.5（提高倍率）
        if (this.gameState.monsterAnger > 70) {
            growth = Math.floor(growth * 1.5); // 狂暴狀態成長更快
        }

        // 90% 時查核加倍、CBAM 恐慌（額外成長）
        if (this.gameState.monsterAnger > 90) {
            growth = Math.floor(growth * 2.0); // 恐慌狀態成長更快（提高倍率）
        }

        // 50% 時開始加速（增加中段壓力）
        if (this.gameState.monsterAnger > 50 && this.gameState.monsterAnger <= 70) {
            growth = Math.floor(growth * 1.2); // 中等壓力
        }

        this.gameState.addMonsterAnger(growth);

        return {
            playerEmission,
            npcTotalEmission,
            totalWorldEmission,
            growth,
            monsterAnger: this.gameState.monsterAnger
        };
    }

    /**
     * 更新市場價格
     * 
     * @returns {Object} 價格變動資訊
     */
    updateMarketPrices() {
        const oldDomesticPrice = this.gameState.domesticPrice;
        const oldIntlPrice = this.gameState.intlPrice;

        // 市場波動：根據排放量和回合數調整
        const totalEmission = this.carbonFeeSystem.calculateTotalEmission('P') +
            Object.keys(this.gameState.competitors).reduce((s, k) => {
                return s + this.carbonFeeSystem.calculateTotalEmission(k);
            }, 0);

        // 排放越高，價格上漲
        const emissionFactor = Math.min(totalEmission / 100000, 2); // 最多 2 倍
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8-1.2 隨機波動

        this.gameState.domesticPrice = Math.max(100,
            Math.floor(oldDomesticPrice * (1 + emissionFactor * 0.1) * randomFactor)
        );
        this.gameState.intlPrice = Math.max(500,
            Math.floor(oldIntlPrice * (1 + emissionFactor * 0.05) * randomFactor)
        );

        return {
            domesticPrice: {
                old: oldDomesticPrice,
                new: this.gameState.domesticPrice,
                change: this.gameState.domesticPrice - oldDomesticPrice
            },
            intlPrice: {
                old: oldIntlPrice,
                new: this.gameState.intlPrice,
                change: this.gameState.intlPrice - oldIntlPrice
            }
        };
    }

    /**
     * 獲取查核歷史
     * 
     * @returns {Array} 查核歷史記錄
     */
    getAuditHistory() {
        return this.auditHistory;
    }

    /**
     * 檢查是否應該觸發查核
     * 
     * @returns {boolean}
     */
    shouldTriggerAudit() {
        return this.gameState.turn % GAME_CONFIG.auditInterval === 0;
    }

    /**
     * 檢查是否應該套用 CBAM
     * 
     * @returns {boolean}
     */
    shouldApplyCBAM() {
        return this.gameState.turn >= GAME_CONFIG.cbamStartTurn;
    }
}

