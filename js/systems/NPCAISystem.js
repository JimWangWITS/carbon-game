import { BUILDINGS, FACTORY_LEVELS } from '../core/GameConfig.js';

/**
 * NPC AI 策略模式
 * 實現 GDD 第 9 節的 NPC AI 模型
 */

/**
 * NPC AI 策略基類
 */
class NPCStrategy {
    constructor(npcKey, gameState, carbonFeeSystem, landSystem) {
        this.npcKey = npcKey;
        this.gameState = gameState;
        this.carbonFeeSystem = carbonFeeSystem;
        this.landSystem = landSystem;
    }

    /**
     * 執行 AI 行動（子類實現）
     */
    execute() {
        throw new Error('execute() must be implemented by subclass');
    }

    /**
     * 獲取可用的空閒地塊
     */
    getAvailableTiles() {
        const freeTiles = [];
        const lands = this.landSystem.getLandsByOwner(this.npcKey);
        
        lands.forEach(land => {
            const building = this.gameState.getBuildingAtTile(land.index);
            if (!building) {
                freeTiles.push(land.index);
            }
        });

        return freeTiles;
    }

    /**
     * 獲取可購買的地塊列表
     */
    getPurchasableLands() {
        const npc = this.gameState.competitors[this.npcKey];
        return this.landSystem.getPurchasableLands(
            this.npcKey,
            (tileIndex) => this.gameState.getBuildingAtTile(tileIndex) !== undefined,
            this.gameState.turn,
            npc.money
        );
    }

    /**
     * 購買地塊
     */
    purchaseLand(tileIndex) {
        const npc = this.gameState.competitors[this.npcKey];
        const price = this.landSystem.calculatePurchasePrice(tileIndex, this.gameState.turn, npc.money);

        if (npc.money < price) {
            return { success: false, message: '資金不足' };
        }

        const result = this.landSystem.purchaseLand(tileIndex, this.npcKey, price);
        if (result.success) {
            npc.money -= price;
            return { success: true, tileIndex, price, land: this.landSystem.getLand(tileIndex) };
        }

        return { success: false, message: result.message };
    }

    /**
     * 建造建築
     * 注意：此方法只更新遊戲狀態，視覺更新需要在外部調用 addBuildingToTile
     */
    buildBuilding(tileIndex, buildingType, level = 'Lv1') {
        const npc = this.gameState.competitors[this.npcKey];
        const buildingData = BUILDINGS[buildingType];

        if (npc.money < buildingData.cost) {
            return { success: false, message: '資金不足' };
        }

        npc.money -= buildingData.cost;
        npc.money += buildingData.income; // 簡化：立即獲得收入

        // 添加到遊戲狀態
        this.gameState.addBuilding({
            type: buildingType,
            tileIndex,
            owner: this.npcKey,
            level
        });

        return { success: true, building: buildingData, tileIndex, level };
    }

    /**
     * 升級建築
     */
    upgradeBuilding(tileIndex, targetLevel) {
        const building = this.gameState.getBuildingAtTile(tileIndex);
        if (!building || building.owner !== this.npcKey) {
            return { success: false };
        }

        const buildingData = BUILDINGS[building.type];
        if (!buildingData || !buildingData.canUpgrade) {
            return { success: false };
        }

        const currentLevel = building.level || 'Lv1';
        const levelOrder = ['Lv1', 'Lv2', 'Lv3'];
        const currentIndex = levelOrder.indexOf(currentLevel);
        const targetIndex = levelOrder.indexOf(targetLevel);

        if (targetIndex <= currentIndex) {
            return { success: false };
        }

        // 計算升級成本
        let cost = 0;
        if (currentLevel === 'Lv1' && targetLevel === 'Lv2') {
            cost = Math.round(buildingData.cost * 0.5);
        } else if (currentLevel === 'Lv2' && targetLevel === 'Lv3') {
            cost = Math.round(buildingData.cost * 0.8);
        } else if (currentLevel === 'Lv1' && targetLevel === 'Lv3') {
            cost = Math.round(buildingData.cost * 1.3);
        }

        const npc = this.gameState.competitors[this.npcKey];
        if (npc.money < cost) {
            return { success: false };
        }

        npc.money -= cost;
        this.gameState.upgradeBuilding(tileIndex, this.npcKey, targetLevel);

        return { success: true, cost };
    }
}

/**
 * NPC A：激進擴張型（Profit Rush）
 * 前期瘋狂擴張，中期排放爆炸，需要大量碳權
 */
export class AggressiveExpansionStrategy extends NPCStrategy {
    execute() {
        const events = [];
        const npc = this.gameState.competitors[this.npcKey];
        const freeTiles = this.getAvailableTiles();

        // 地塊購買邏輯（30% 機率，優先購買高收益地塊）
        if (Math.random() < 0.3) {
            const purchasableLands = this.getPurchasableLands();
            if (purchasableLands.length > 0) {
                // 優先購買綠電網區或高製程效率區
                const preferredLands = purchasableLands.filter(land => 
                    land.land.type === 'greenGrid' || land.land.type === 'highEfficiency'
                );
                const targetLand = preferredLands.length > 0 
                    ? preferredLands[Math.floor(Math.random() * preferredLands.length)]
                    : purchasableLands[Math.floor(Math.random() * purchasableLands.length)];
                
                if (targetLand.canAfford) {
                    const result = this.purchaseLand(targetLand.tileIndex);
                    if (result.success) {
                        events.push(`${npc.name} 購買了一塊「${result.land.name}」地塊（$${result.price.toLocaleString()}）`);
                    }
                }
            }
        }

        if (freeTiles.length === 0) {
            return events;
        }

        // 提高 NPC 建造頻率：前期更積極
        let buildProbability = 0.5; // 基礎 50%
        if (this.gameState.turn <= 4) {
            buildProbability = 0.85; // 前期 85% 機率建造
        } else if (this.gameState.turn <= 7) {
            buildProbability = 0.70; // 中期 70% 機率建造
        }
        
        // 如果玩家建造了很多建築，NPC 也會更積極
        const playerBuildings = this.gameState.getPlayerBuildings().length;
        if (playerBuildings > 3) {
            buildProbability = Math.min(0.95, buildProbability + 0.2); // 增加 20% 機率
        }

        // 前期（1-4 回合）：瘋狂擴張
        if (this.gameState.turn <= 4 && Math.random() < buildProbability) {
            // 70% 機率建造燃煤廠，30% 機率建造燃氣廠
            const buildingType = Math.random() < 0.7 ? 'coal' : 'gas';
            const tileIndex = freeTiles[Math.floor(Math.random() * freeTiles.length)];
            const result = this.buildBuilding(tileIndex, buildingType);

            if (result.success) {
                events.push(`${npc.name} 在自家區域新蓋了一座「${result.building.name}」`);
            }
        } 
        // 中期（5-7 回合）：繼續擴張，但開始考慮升級
        else if (this.gameState.turn <= 7) {
            if (Math.random() < buildProbability) {
                // 60% 機率繼續建造
                const buildingType = Math.random() < 0.5 ? 'coal' : 'gas';
                const tileIndex = freeTiles[Math.floor(Math.random() * freeTiles.length)];
                const result = this.buildBuilding(tileIndex, buildingType);

                if (result.success) {
                    events.push(`${npc.name} 在自家區域新蓋了一座「${result.building.name}」`);
                }
            } else {
                // 40% 機率升級現有建築
                const buildings = this.gameState.buildings.filter(b => b.owner === this.npcKey);
                if (buildings.length > 0) {
                    const building = buildings[Math.floor(Math.random() * buildings.length)];
                    const currentLevel = building.level || 'Lv1';
                    if (currentLevel === 'Lv1' && Math.random() < 0.5) {
                        const result = this.upgradeBuilding(building.tileIndex, 'Lv2');
                        if (result.success) {
                            events.push(`${npc.name} 升級了一座工廠到技術標竿等級`);
                        }
                    }
                }
            }
        }
        // 後期（8+ 回合）：開始減碳
        else {
            // 根據玩家進度調整：如果玩家領先，NPC 更積極
            const actionProbability = playerBuildings > 4 ? 0.7 : 0.5;
            // 50% 機率升級，50% 機率建造較乾淨的工廠
            if (Math.random() < actionProbability) {
                const buildings = this.gameState.buildings.filter(b => b.owner === this.npcKey);
                if (buildings.length > 0) {
                    const building = buildings[Math.floor(Math.random() * buildings.length)];
                    const currentLevel = building.level || 'Lv1';
                    if (currentLevel !== 'Lv3') {
                        const targetLevel = currentLevel === 'Lv1' ? 'Lv2' : 'Lv3';
                        const result = this.upgradeBuilding(building.tileIndex, targetLevel);
                        if (result.success) {
                            events.push(`${npc.name} 升級了一座工廠到 ${targetLevel === 'Lv2' ? '技術標竿' : '行業削減'}等級`);
                        }
                    }
                }
            } else if (freeTiles.length > 0) {
                // 建造較乾淨的工廠
                const buildingType = Math.random() < 0.6 ? 'gas' : 'tech';
                const tileIndex = freeTiles[Math.floor(Math.random() * freeTiles.length)];
                const result = this.buildBuilding(tileIndex, buildingType);

                if (result.success) {
                    events.push(`${npc.name} 在自家區域新蓋了一座「${result.building.name}」`);
                }
            }
        }

        // 更新 NPC 排放
        npc.emission = this.carbonFeeSystem.calculateTotalEmission(this.npcKey);

        return events;
    }
}

/**
 * NPC B：效率求極致型（Tech Optimizer）
 * 優先升級工廠，高機率取得 A/B 低費率優惠
 */
export class TechOptimizerStrategy extends NPCStrategy {
    execute() {
        const events = [];
        const npc = this.gameState.competitors[this.npcKey];
        const freeTiles = this.getAvailableTiles();

        // 地塊購買邏輯（20% 機率，優先購買綠電網區）
        if (Math.random() < 0.2) {
            const purchasableLands = this.getPurchasableLands();
            if (purchasableLands.length > 0) {
                // 優先購買綠電網區
                const greenLands = purchasableLands.filter(land => land.land.type === 'greenGrid');
                const targetLand = greenLands.length > 0 
                    ? greenLands[Math.floor(Math.random() * greenLands.length)]
                    : purchasableLands[Math.floor(Math.random() * purchasableLands.length)];
                
                if (targetLand.canAfford) {
                    const result = this.purchaseLand(targetLand.tileIndex);
                    if (result.success) {
                        events.push(`${npc.name} 購買了一塊「${result.land.name}」地塊（$${result.price.toLocaleString()}）`);
                    }
                }
            }
        }

        // 技術優化型 NPC 建造概率較低，更傾向於升級
        // 提前定義 buildProbability，確保在所有路徑中都可使用
        let buildProbability = 0.3; // 基礎 30% 建造概率
        if (this.gameState.turn <= 3) {
            buildProbability = 0.5; // 前期稍微積極一些
        } else if (this.gameState.turn <= 6) {
            buildProbability = 0.4; // 中期
        }

        // 優先升級現有建築
        const buildings = this.gameState.buildings.filter(b => b.owner === this.npcKey);
        let upgradeAttempted = false;
        if (buildings.length > 0) {
            // 80% 機率嘗試升級
            if (Math.random() < 0.8) {
                upgradeAttempted = true;
                const building = buildings[Math.floor(Math.random() * buildings.length)];
                const buildingData = BUILDINGS[building.type];
                const currentLevel = building.level || 'Lv1';

                if (buildingData && buildingData.canUpgrade) {
                    let targetLevel = 'Lv2';
                    if (currentLevel === 'Lv2') {
                        targetLevel = 'Lv3';
                    } else if (currentLevel === 'Lv1' && Math.random() < 0.3) {
                        // 30% 機率直接升級到 Lv3
                        targetLevel = 'Lv3';
                    }

                    const result = this.upgradeBuilding(building.tileIndex, targetLevel);
                    if (result.success) {
                        const levelName = targetLevel === 'Lv2' ? '技術標竿' : '行業削減';
                        events.push(`${npc.name} 升級了一座工廠到 ${levelName} 等級`);
                        // 升級成功後，本回合不再建造
                        npc.emission = this.carbonFeeSystem.calculateTotalEmission(this.npcKey);
                        return events;
                    }
                }
            }
        }

        // 如果沒有建築或升級失敗，建造新建築（優先選擇乾淨的）
        // 如果沒有建築，必須建造
        if (freeTiles.length > 0 && (buildings.length === 0 || (upgradeAttempted && Math.random() < buildProbability) || (!upgradeAttempted && Math.random() < buildProbability))) {
            // 優先選擇：太陽能 > 高科技 > 燃氣 > 其他
            let buildingType;
            const rand = Math.random();
            if (rand < 0.3 && npc.money >= BUILDINGS.solar.cost) {
                buildingType = 'solar';
            } else if (rand < 0.6 && npc.money >= BUILDINGS.tech.cost) {
                buildingType = 'tech';
            } else if (rand < 0.8) {
                buildingType = 'gas';
            } else {
                buildingType = 'manufacturing';
            }

            const tileIndex = freeTiles[Math.floor(Math.random() * freeTiles.length)];
            const result = this.buildBuilding(tileIndex, buildingType);

            if (result.success) {
                events.push(`${npc.name} 在自家區域新蓋了一座「${result.building.name}」`);
            }
        }

        // 更新 NPC 排放
        npc.emission = this.carbonFeeSystem.calculateTotalEmission(this.npcKey);

        return events;
    }
}

/**
 * NPC C：碳權投機商（Carbon Dealer）
 * 買爆國內額度 → 高價賣出，幾乎不碰國外碳權
 */
export class CarbonDealerStrategy extends NPCStrategy {
    execute() {
        const events = [];
        const npc = this.gameState.competitors[this.npcKey];
        const freeTiles = this.getAvailableTiles();

        // 地塊購買邏輯（10% 機率，只買便宜地塊）
        if (Math.random() < 0.1) {
            const purchasableLands = this.getPurchasableLands();
            if (purchasableLands.length > 0) {
                // 優先購買便宜的地塊（高排放區或基本區）
                const cheapLands = purchasableLands.filter(land => 
                    land.land.type === 'highEmission' || land.land.type === 'basic'
                ).sort((a, b) => a.price - b.price);
                
                const targetLand = cheapLands.length > 0 
                    ? cheapLands[0] // 選擇最便宜的
                    : purchasableLands.sort((a, b) => a.price - b.price)[0];
                
                if (targetLand && targetLand.canAfford) {
                    const result = this.purchaseLand(targetLand.tileIndex);
                    if (result.success) {
                        events.push(`${npc.name} 購買了一塊「${result.land.name}」地塊（$${result.price.toLocaleString()}）`);
                    }
                }
            }
        }

        // 這個 NPC 主要專注於碳權交易，建造策略較保守
        // 建造較少但高效的建築
        if (freeTiles.length > 0 && Math.random() < 0.4) {
            // 優先建造中等排放但收益不錯的建築
            const buildingType = Math.random() < 0.5 ? 'gas' : 'manufacturing';
            const tileIndex = freeTiles[Math.floor(Math.random() * freeTiles.length)];
            const result = this.buildBuilding(tileIndex, buildingType);

            if (result.success) {
                events.push(`${npc.name} 在自家區域新蓋了一座「${result.building.name}」`);
            }
        }

        // 偶爾升級建築以降低排放
        const buildings = this.gameState.buildings.filter(b => b.owner === this.npcKey);
        if (buildings.length > 0 && Math.random() < 0.3) {
            const building = buildings[Math.floor(Math.random() * buildings.length)];
            const currentLevel = building.level || 'Lv1';
            if (currentLevel === 'Lv1') {
                const result = this.upgradeBuilding(building.tileIndex, 'Lv2');
                if (result.success) {
                    events.push(`${npc.name} 升級了一座工廠以降低排放成本`);
                }
            }
        }

        // 模擬碳權交易（簡化：只顯示訊息）
        if (Math.random() < 0.5) {
            events.push(`${npc.name} 正在進行碳權交易，尋找獲利機會`);
        }

        // 更新 NPC 排放
        npc.emission = this.carbonFeeSystem.calculateTotalEmission(this.npcKey);

        return events;
    }
}

/**
 * NPC AI 系統管理器
 */
export class NPCAISystem {
    constructor(gameState, carbonFeeSystem, landSystem) {
        this.gameState = gameState;
        this.carbonFeeSystem = carbonFeeSystem;
        this.landSystem = landSystem;
        
        // 初始化策略
        this.strategies = {
            A: new AggressiveExpansionStrategy('A', gameState, carbonFeeSystem, landSystem),
            B: new TechOptimizerStrategy('B', gameState, carbonFeeSystem, landSystem),
            C: new CarbonDealerStrategy('C', gameState, carbonFeeSystem, landSystem)
        };
    }

    /**
     * 執行所有 NPC 的行動
     * 
     * @returns {Array} 所有 NPC 的行動事件
     */
    executeAllNPCs() {
        const allEvents = [];

        Object.keys(this.strategies).forEach(npcKey => {
            const strategy = this.strategies[npcKey];
            const events = strategy.execute();
            allEvents.push(...events);
        });

        return allEvents;
    }

    /**
     * 執行單個 NPC 的行動
     * 
     * @param {string} npcKey - NPC 鍵值
     * @returns {Array} 行動事件
     */
    executeNPC(npcKey) {
        const strategy = this.strategies[npcKey];
        if (!strategy) {
            return [];
        }
        return strategy.execute();
    }
}

