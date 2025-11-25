import { OWNER_CONFIG } from '../core/GameConfig.js';

/**
 * 土地系統
 * 實現 GDD 第 5 節的土地屬性系統
 */
export class LandSystem {
    constructor() {
        this.lands = new Map(); // tileIndex -> land data
        this.landTypes = {
            basic: {
                name: '基本區',
                emoji: '🧱',
                emissionCoeff: 1.0,
                description: '無額外 buff'
            },
            greenGrid: {
                name: '綠電網區',
                emoji: '🌿',
                emissionCoeff: 1.0, // 直接排放不變
                indirectEmissionReduction: 0.5, // 間接排放減少 50%
                description: '間接排放減少 50%'
            },
            highEfficiency: {
                name: '高製程效率區',
                emoji: '🧪',
                emissionCoeff: 0.8, // 直接排放減少 20%
                description: '直接排放減少 20%'
            },
            exportZone: {
                name: '出口加工區',
                emoji: '🚢',
                emissionCoeff: 1.0,
                industryCoeffRange: [0.2, 1.0], // 行業係數影響範圍
                description: '行業係數影響（0.2→1.0）'
            },
            highEmission: {
                name: '高排放區',
                emoji: '⚠️',
                emissionCoeff: 1.2, // 排放增加 20%
                description: '排放增加 20%'
            }
        };
    }

    /**
     * 初始化地圖（分區式布局：4行 x 5列 = 20塊土地）
     * 每列代表一個企業的區域，區域內土地類型有傾向性分布
     * 
     * @param {number} totalTiles - 總地塊數（固定為 20）
     * @param {Array} ownerKeys - 所有者鍵值陣列 ['P', 'A', 'B', 'C']
     */
    initializeLands(totalTiles, ownerKeys) {
        this.lands.clear();
        
        // 固定為 4 行 x 5 列 = 20 塊土地
        // 前4列：每個企業各一列（4塊土地）
        // 第5列：混合區域（所有企業各1塊）
        const rows = 4;
        const cols = 5; // 5列：4個企業各一列 + 1列混合
        const fixedTotalTiles = rows * cols; // 20
        
        // 每個區域的土地類型傾向性（區域中心 vs 邊緣）
        const zoneTypeTendencies = {
            // 區域中心（第 2-4 行）：更多基本區和特殊區域
            center: {
                basic: 0.5,
                greenGrid: 0.15,
                highEfficiency: 0.15,
                exportZone: 0.1,
                highEmission: 0.1
            },
            // 區域邊緣（第 1 和 5 行）：更多特殊區域
            edge: {
                basic: 0.3,
                greenGrid: 0.2,
                highEfficiency: 0.2,
                exportZone: 0.15,
                highEmission: 0.15
            }
        };

        for (let i = 0; i < fixedTotalTiles; i++) {
            // 計算行列位置
            const row = Math.floor(i / cols);
            const col = i % cols;
            
            // 分配所有者：前4列（0-3）每個企業各一列，第5列（4）混合分配
            let ownerKey;
            if (col < ownerKeys.length) {
                // 前4列：每個企業各一列
                ownerKey = ownerKeys[col];
            } else {
                // 第5列：混合區域，按行循環分配
                ownerKey = ownerKeys[row % ownerKeys.length];
            }
            
            // 判斷是區域中心還是邊緣
            const isEdge = row === 0 || row === rows - 1;
            const typeWeights = isEdge ? zoneTypeTendencies.edge : zoneTypeTendencies.center;
            
            // 根據傾向性選擇土地類型
            const rand = Math.random();
            let cumulative = 0;
            let selectedType = 'basic';
            
            for (const [type, weight] of Object.entries(typeWeights)) {
                cumulative += weight;
                if (rand <= cumulative) {
                    selectedType = type;
                    break;
                }
            }

            const landType = this.landTypes[selectedType];
            const owner = OWNER_CONFIG[ownerKey];

            this.lands.set(i, {
                index: i,
                owner: ownerKey,
                type: selectedType,
                name: landType.name,
                emoji: landType.emoji,
                emissionCoeff: landType.emissionCoeff || 1.0,
                cost: this.calculateLandCost(selectedType, i),
                description: landType.description,
                ownerName: owner ? owner.name : '未知',
                ownerColor: owner ? owner.color : 'border-gray-400',
                ownerBadge: owner ? owner.badgeBg : 'bg-gray-500',
                row: row,
                col: col,
                zone: ownerKey // 所屬區域
            });
        }
    }

    /**
     * 計算土地成本（基礎價格）
     * 根據土地類型和位置計算
     */
    calculateLandCost(type, index) {
        const baseCost = 1000;
        const typeMultipliers = {
            basic: 1.0,
            greenGrid: 1.5, // 綠電網區較貴
            highEfficiency: 1.3,
            exportZone: 1.2,
            highEmission: 0.8 // 高排放區較便宜
        };
        
        const multiplier = typeMultipliers[type] || 1.0;
        const positionBonus = Math.floor(index / 4) * 200; // 每列增加成本
        
        return Math.round(baseCost * multiplier + positionBonus);
    }

    /**
     * 計算地塊購買價格（動態價格）
     * 考慮回合數和購買者資金
     * 
     * @param {number} tileIndex - 地塊索引
     * @param {number} currentTurn - 當前回合數
     * @param {number} buyerMoney - 購買者資金（可選，用於動態調整）
     * @returns {number} 購買價格
     */
    calculatePurchasePrice(tileIndex, currentTurn = 1, buyerMoney = null) {
        const land = this.getLand(tileIndex);
        if (!land) return 0;

        // 基礎價格
        let price = land.cost || this.calculateLandCost(land.type, tileIndex);

        // 回合數影響：每回合價格上漲 10%
        const turnMultiplier = 1 + (currentTurn - 1) * 0.1;
        price = Math.round(price * turnMultiplier);

        // 如果購買者資金超過 100,000，價格上漲 20%（防止過度擴張）
        if (buyerMoney !== null && buyerMoney > 100000) {
            price = Math.round(price * 1.2);
        }

        return price;
    }

    /**
     * 獲取指定地塊的資訊
     * 
     * @param {number} tileIndex - 地塊索引
     * @returns {Object|null} 地塊資訊
     */
    getLand(tileIndex) {
        return this.lands.get(tileIndex) || null;
    }

    /**
     * 獲取所有地塊
     * 
     * @returns {Array} 所有地塊資訊陣列
     */
    getAllLands() {
        // 按索引順序返回所有土地
        return Array.from(this.lands.values()).sort((a, b) => a.index - b.index);
    }

    /**
     * 獲取指定所有者的地塊
     * 
     * @param {string} ownerKey - 所有者鍵值
     * @returns {Array} 該所有者的地塊陣列
     */
    getLandsByOwner(ownerKey) {
        return Array.from(this.lands.values())
            .filter(land => land.owner === ownerKey);
    }

    /**
     * 獲取指定類型的地塊
     * 
     * @param {string} type - 土地類型
     * @returns {Array} 該類型的地塊陣列
     */
    getLandsByType(type) {
        return Array.from(this.lands.values())
            .filter(land => land.type === type);
    }

    /**
     * 獲取土地類型的詳細資訊
     * 
     * @param {string} type - 土地類型鍵值
     * @returns {Object|null} 土地類型資訊
     */
    getLandTypeInfo(type) {
        return this.landTypes[type] || null;
    }

    /**
     * 獲取所有土地類型
     * 
     * @returns {Object} 所有土地類型
     */
    getAllLandTypes() {
        return this.landTypes;
    }

    /**
     * 檢查地塊是否可購買
     * 條件：1. 地塊存在 2. 不是購買者自己的地塊 3. 地塊上沒有建築
     * 
     * @param {number} tileIndex - 地塊索引
     * @param {string} buyerKey - 購買者鍵值
     * @param {Function} hasBuilding - 檢查地塊是否有建築的函數
     * @returns {Object} { canPurchase: boolean, reason: string }
     */
    canPurchase(tileIndex, buyerKey = 'P', hasBuilding = null) {
        const land = this.getLand(tileIndex);
        if (!land) {
            return { canPurchase: false, reason: '地塊不存在' };
        }
        
        // 不能購買自己的地塊
        if (land.owner === buyerKey) {
            return { canPurchase: false, reason: '這已經是您的地塊' };
        }
        
        // 檢查地塊上是否有建築（如果提供了檢查函數）
        if (hasBuilding && hasBuilding(tileIndex)) {
            return { canPurchase: false, reason: '地塊上已有建築，無法購買' };
        }
        
        return { canPurchase: true, reason: '' };
    }

    /**
     * 購買地塊
     * 
     * @param {number} tileIndex - 地塊索引
     * @param {string} buyerKey - 購買者鍵值
     * @param {number} price - 購買價格
     * @returns {Object} { success: boolean, message: string }
     */
    purchaseLand(tileIndex, buyerKey, price) {
        const land = this.getLand(tileIndex);
        if (!land) {
            return { success: false, message: '地塊不存在' };
        }

        // 更新地塊所有者
        const oldOwner = land.owner;
        land.owner = buyerKey;
        
        // 更新所有者相關信息
        const owner = OWNER_CONFIG[buyerKey];
        if (owner) {
            land.ownerName = owner.name;
            land.ownerColor = owner.color;
            land.ownerBadge = owner.badgeBg;
        }

        return {
            success: true,
            message: `成功購買地塊！從 ${OWNER_CONFIG[oldOwner]?.name || '未知'} 購買了 ${land.name}`,
            oldOwner: oldOwner,
            newOwner: buyerKey
        };
    }

    /**
     * 獲取可購買的地塊列表
     * 
     * @param {string} buyerKey - 購買者鍵值
     * @param {Function} hasBuilding - 檢查地塊是否有建築的函數
     * @param {number} currentTurn - 當前回合數
     * @param {number} buyerMoney - 購買者資金
     * @returns {Array} 可購買的地塊信息數組
     */
    getPurchasableLands(buyerKey, hasBuilding, currentTurn = 1, buyerMoney = 0) {
        const purchasable = [];
        
        this.lands.forEach((land, index) => {
            const checkResult = this.canPurchase(index, buyerKey, hasBuilding);
            if (checkResult.canPurchase) {
                const price = this.calculatePurchasePrice(index, currentTurn, buyerMoney);
                purchasable.push({
                    tileIndex: index,
                    land: land,
                    price: price,
                    canAfford: buyerMoney >= price
                });
            }
        });
        
        return purchasable;
    }

    /**
     * 獲取地塊的視覺化資訊（用於 UI 渲染）
     * 
     * @param {number} tileIndex - 地塊索引
     * @returns {Object} 視覺化資訊
     */
    getLandVisualInfo(tileIndex) {
        const land = this.getLand(tileIndex);
        if (!land) {
            return {
                emoji: '🧱',
                bgClass: 'bg-slate-800/80',
                borderClass: 'border-slate-700',
                tooltip: '未知地塊'
            };
        }

        const typeInfo = this.landTypes[land.type];
        let bgClass = 'bg-slate-800/80';
        
        // 根據土地類型設置背景色
        switch (land.type) {
            case 'greenGrid':
                bgClass = 'bg-emerald-900/30';
                break;
            case 'highEfficiency':
                bgClass = 'bg-blue-900/30';
                break;
            case 'exportZone':
                bgClass = 'bg-cyan-900/30';
                break;
            case 'highEmission':
                bgClass = 'bg-rose-900/30';
                break;
        }

        return {
            emoji: typeInfo.emoji || '🧱',
            name: land.name,
            bgClass,
            borderClass: land.ownerColor,
            tooltip: `${land.name} - ${typeInfo.description}`,
            owner: land.owner,
            ownerBadge: land.ownerBadge,
            cost: land.cost
        };
    }
}

