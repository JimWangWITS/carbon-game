import { BUILDINGS, FACTORY_LEVELS, GAME_CONFIG } from '../core/GameConfig.js';

/**
 * 建築系統
 * 實現 GDD 第 6 節的工廠等級機制
 */
export class BuildingSystem {
    constructor(gameState, carbonFeeSystem) {
        this.gameState = gameState;
        this.carbonFeeSystem = carbonFeeSystem;
    }

    /**
     * 獲取建築的升級成本
     * 
     * @param {string} buildingType - 建築類型
     * @param {string} currentLevel - 當前等級
     * @param {string} targetLevel - 目標等級
     * @returns {number|null} 升級成本，如果無法升級則返回 null
     */
    getUpgradeCost(buildingType, currentLevel, targetLevel) {
        const buildingData = BUILDINGS[buildingType];
        if (!buildingData || !buildingData.canUpgrade) {
            return null;
        }

        const levelOrder = ['Lv1', 'Lv2', 'Lv3'];
        const currentIndex = levelOrder.indexOf(currentLevel);
        const targetIndex = levelOrder.indexOf(targetLevel);

        if (currentIndex === -1 || targetIndex === -1 || targetIndex <= currentIndex) {
            return null;
        }

        // 升級成本：基礎成本的百分比
        const upgradeCosts = {
            'Lv1->Lv2': 0.5, // 升級到 Lv2 需要基礎成本的 50%
            'Lv2->Lv3': 0.8  // 升級到 Lv3 需要基礎成本的 80%
        };

        if (currentLevel === 'Lv1' && targetLevel === 'Lv2') {
            return Math.round(buildingData.cost * upgradeCosts['Lv1->Lv2']);
        } else if (currentLevel === 'Lv2' && targetLevel === 'Lv3') {
            return Math.round(buildingData.cost * upgradeCosts['Lv2->Lv3']);
        } else if (currentLevel === 'Lv1' && targetLevel === 'Lv3') {
            // 直接升級到 Lv3 需要兩次升級的總和
            return Math.round(buildingData.cost * (upgradeCosts['Lv1->Lv2'] + upgradeCosts['Lv2->Lv3']));
        }

        return null;
    }

    /**
     * 升級建築
     * 
     * @param {number} tileIndex - 地塊索引
     * @param {string} owner - 所有者
     * @param {string} targetLevel - 目標等級
     * @returns {Object} { success: boolean, message: string, cost: number }
     */
    upgradeBuilding(tileIndex, owner, targetLevel) {
        const building = this.gameState.getBuildingAtTile(tileIndex);
        
        if (!building) {
            return { success: false, message: '該地塊沒有建築' };
        }

        if (building.owner !== owner) {
            return { success: false, message: '這不是你的建築' };
        }

        const buildingData = BUILDINGS[building.type];
        if (!buildingData || !buildingData.canUpgrade) {
            return { success: false, message: '該建築無法升級' };
        }

        const currentLevel = building.level || 'Lv1';
        const cost = this.getUpgradeCost(building.type, currentLevel, targetLevel);

        if (cost === null) {
            return { success: false, message: '無法升級到該等級' };
        }

        if (owner === 'P' && this.gameState.money < cost) {
            return { success: false, message: `資金不足，需要 $${cost.toLocaleString()}` };
        }

        // 執行升級
        if (owner === 'P') {
            this.gameState.subtractMoney(cost);
        }

        this.gameState.upgradeBuilding(tileIndex, owner, targetLevel);

        const levelData = FACTORY_LEVELS[targetLevel];
        return {
            success: true,
            message: `成功升級到 ${levelData.name}！`,
            cost,
            newLevel: targetLevel
        };
    }

    /**
     * 計算建築的回收價格（不出售）
     * 
     * @param {number} tileIndex - 地塊索引
     * @returns {number} 回收價格
     */
    calculateRefund(tileIndex) {
        const building = this.gameState.getBuildingAtTile(tileIndex);
        if (!building) return 0;

        const buildingData = BUILDINGS[building.type];
        if (!buildingData) return 0;

        // 計算回收價格（考慮等級）
        const baseRefund = Math.floor(buildingData.cost * 0.6); // 基礎 6 折
        
        // 升級過的建築可以回收更多
        const level = building.level || 'Lv1';
        let levelBonus = 0;
        if (level === 'Lv2') {
            levelBonus = Math.floor(buildingData.cost * 0.1); // 額外 10%
        } else if (level === 'Lv3') {
            levelBonus = Math.floor(buildingData.cost * 0.2); // 額外 20%
        }

        return baseRefund + levelBonus;
    }

    /**
     * 出售建築
     * 
     * @param {number} tileIndex - 地塊索引
     * @param {string} owner - 所有者
     * @returns {Object} { success: boolean, message: string, refund: number }
     */
    sellBuilding(tileIndex, owner) {
        const building = this.gameState.getBuildingAtTile(tileIndex);
        
        if (!building) {
            return { success: false, message: '該地塊沒有建築' };
        }

        if (building.owner !== owner) {
            return { success: false, message: '這不是你的建築' };
        }

        const buildingData = BUILDINGS[building.type];
        if (!buildingData) {
            return { success: false, message: '建築數據錯誤' };
        }

        // 計算回收價格（考慮等級）
        const baseRefund = Math.floor(buildingData.cost * 0.6); // 基礎 6 折
        
        // 升級過的建築可以回收更多
        const level = building.level || 'Lv1';
        let levelBonus = 0;
        if (level === 'Lv2') {
            levelBonus = Math.floor(buildingData.cost * 0.1); // 額外 10%
        } else if (level === 'Lv3') {
            levelBonus = Math.floor(buildingData.cost * 0.2); // 額外 20%
        }

        const refund = baseRefund + levelBonus;

        // 如果是高排放建築，降低怪獸怒氣值（減碳行動）
        let monsterReduction = 0;
        if (buildingData.type === 'high_pollute') {
            // 根據建築排放量計算降低值（每 2000 噸排放降低 1%，最多 3%）
            const buildingEmission = this.carbonFeeSystem.calculateBuildingEmission(building);
            monsterReduction = Math.min(3, Math.floor(buildingEmission / 2000));
            if (monsterReduction > 0 && owner === 'P') {
                // 只有玩家出售時才降低（NPC 出售不影響，因為他們是 AI）
                this.gameState.reduceMonsterAnger(monsterReduction);
            }
        }

        // 移除建築
        this.gameState.removeBuilding(tileIndex, owner);

        // 退款
        if (owner === 'P') {
            this.gameState.addMoney(refund);
        }

        // 構建消息
        let message = `已出售 ${buildingData.name}，回收 $${refund.toLocaleString()}`;
        if (monsterReduction > 0 && owner === 'P') {
            message += `\n拆除高排放建築，怪獸怒氣值降低 ${monsterReduction}%！`;
        }

        return {
            success: true,
            message,
            refund,
            monsterReduction: monsterReduction || 0
        };
    }

    /**
     * 獲取建築的詳細資訊
     * 
     * @param {number} tileIndex - 地塊索引
     * @returns {Object|null} 建築詳細資訊
     */
    getBuildingInfo(tileIndex) {
        const building = this.gameState.getBuildingAtTile(tileIndex);
        if (!building) return null;

        const buildingData = BUILDINGS[building.type];
        const level = building.level || 'Lv1';
        const levelData = FACTORY_LEVELS[level];

        // 計算實際排放（考慮等級）
        const emission = this.carbonFeeSystem.calculateBuildingEmission(building);

        // 計算可升級選項
        const canUpgrade = buildingData.canUpgrade;
        const upgradeOptions = [];
        if (canUpgrade) {
            if (level === 'Lv1') {
                upgradeOptions.push({
                    level: 'Lv2',
                    cost: this.getUpgradeCost(building.type, 'Lv1', 'Lv2'),
                    name: FACTORY_LEVELS.Lv2.name
                });
                upgradeOptions.push({
                    level: 'Lv3',
                    cost: this.getUpgradeCost(building.type, 'Lv1', 'Lv3'),
                    name: FACTORY_LEVELS.Lv3.name
                });
            } else if (level === 'Lv2') {
                upgradeOptions.push({
                    level: 'Lv3',
                    cost: this.getUpgradeCost(building.type, 'Lv2', 'Lv3'),
                    name: FACTORY_LEVELS.Lv3.name
                });
            }
        }

        return {
            type: building.type,
            name: buildingData.name,
            emoji: buildingData.emoji,
            level,
            levelName: levelData.name,
            income: buildingData.income,
            emission,
            baseEmission: buildingData.emission,
            cost: buildingData.cost,
            canUpgrade,
            upgradeOptions,
            owner: building.owner
        };
    }

    /**
     * 獲取所有可升級的建築
     * 
     * @param {string} owner - 所有者
     * @returns {Array} 可升級的建築列表
     */
    getUpgradeableBuildings(owner = 'P') {
        const buildings = owner === 'P' 
            ? this.gameState.getPlayerBuildings()
            : this.gameState.buildings.filter(b => b.owner === owner);

        return buildings
            .map(b => {
                const info = this.getBuildingInfo(b.tileIndex);
                return info && info.canUpgrade && info.upgradeOptions.length > 0 ? info : null;
            })
            .filter(Boolean);
    }
}

