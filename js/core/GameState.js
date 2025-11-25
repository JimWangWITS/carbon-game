import { GAME_CONFIG, BUILDINGS, FACTORY_LEVELS, OWNER_CONFIG } from './GameConfig.js';

// 確保 GAME_CONFIG 正確導入
if (!GAME_CONFIG) {
    console.error('❌ GAME_CONFIG 未正確導入！');
}
if (!GAME_CONFIG.maxBuildingsPerTurn) {
    console.error('❌ GAME_CONFIG.maxBuildingsPerTurn 未定義！', GAME_CONFIG);
}

/**
 * 遊戲狀態管理類
 * 負責管理所有遊戲狀態，提供狀態變更事件
 */
export class GameState {
    constructor() {
        this.year = 2030;
        this.turn = 1;
        this.money = GAME_CONFIG.initialMoney;
        this.emission = 0;
        this.domesticCredits = 0;
        this.intlCredits = 0;
        this.buildings = []; // { type, tileIndex, owner, level }
        this.monsterAnger = GAME_CONFIG.initialMonsterAnger || 25; // %
        this.domesticPrice = 300;
        this.intlPrice = 800;
        this.projectedIncome = 0;
        this.competitors = {
            A: { name: '暴發戶阿金', money: 50000, emission: 0, style: 'aggressive' },
            B: { name: '博士', money: 45000, emission: 0, style: 'green' },
            C: { name: '成本魔人小李', money: 47000, emission: 0, style: 'balanced' }
        };
        
        // 回合建造計數（限制每回合建造數量）
        this.buildingsBuiltThisTurn = 0;
        
        // 回合地塊購買計數（限制每回合購買數量）
        this.landsPurchasedThisTurn = 0;
        
        // 事件監聽器
        this.listeners = new Map();
    }

    /**
     * 訂閱狀態變更事件
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * 取消訂閱
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 觸發事件
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * 設置金錢（觸發事件）
     */
    setMoney(value) {
        const oldValue = this.money;
        this.money = Math.max(0, value);
        this.emit('money.changed', { old: oldValue, new: this.money });
    }

    /**
     * 增加金錢
     */
    addMoney(amount) {
        this.setMoney(this.money + amount);
    }

    /**
     * 減少金錢
     */
    subtractMoney(amount) {
        this.setMoney(this.money - amount);
    }

    /**
     * 設置排放量
     */
    setEmission(value) {
        const oldValue = this.emission;
        this.emission = Math.max(0, value);
        this.emit('emission.changed', { old: oldValue, new: this.emission });
    }

    /**
     * 添加建築
     */
    addBuilding(building) {
        this.buildings.push(building);
        this.emit('building.added', building);
        this.recalculateStats();
    }

    /**
     * 移除建築
     */
    removeBuilding(tileIndex, owner) {
        const index = this.buildings.findIndex(
            b => b.tileIndex === tileIndex && b.owner === owner
        );
        if (index > -1) {
            const building = this.buildings[index];
            this.buildings.splice(index, 1);
            this.emit('building.removed', building);
            this.recalculateStats();
            return building;
        }
        return null;
    }

    /**
     * 更新建築等級
     */
    upgradeBuilding(tileIndex, owner, newLevel) {
        const building = this.buildings.find(
            b => b.tileIndex === tileIndex && b.owner === owner
        );
        if (building) {
            building.level = newLevel;
            this.emit('building.upgraded', building);
            this.recalculateStats();
            return true;
        }
        return false;
    }

    /**
     * 重新計算統計數據
     */
    recalculateStats() {
        let totalIncome = 0;
        let totalEmission = 0;

        this.buildings
            .filter(b => b.owner === 'P')
            .forEach(b => {
                const data = BUILDINGS[b.type];
                if (data) {
                    totalIncome += data.income;
                    // 排放量會由 CarbonFeeSystem 計算（考慮等級和土地屬性）
                    totalEmission += data.emission;
                }
            });
        
        this.projectedIncome = totalIncome;
        this.setEmission(totalEmission);
    }

    /**
     * 設置國內碳權
     */
    setDomesticCredits(value) {
        this.domesticCredits = Math.max(0, value);
        this.emit('credits.changed', { type: 'domestic', value: this.domesticCredits });
    }

    /**
     * 設置國際碳權
     */
    setIntlCredits(value) {
        this.intlCredits = Math.max(0, value);
        this.emit('credits.changed', { type: 'intl', value: this.intlCredits });
    }

    /**
     * 設置怪獸怒氣值
     */
    setMonsterAnger(value) {
        const oldValue = this.monsterAnger;
        this.monsterAnger = Math.max(0, Math.min(100, value));
        this.emit('monster.changed', { old: oldValue, new: this.monsterAnger });
        
        if (this.monsterAnger >= 100) {
            this.emit('monster.maxed', {});
        }
    }

    /**
     * 增加怪獸怒氣值
     */
    addMonsterAnger(amount) {
        this.setMonsterAnger(this.monsterAnger + amount);
    }

    /**
     * 降低怪獸怒氣值（用於減碳行動）
     */
    reduceMonsterAnger(amount) {
        this.setMonsterAnger(this.monsterAnger - amount);
    }

    /**
     * 下一回合
     */
    nextTurn() {
        this.turn++;
        this.year++;
        this.buildingsBuiltThisTurn = 0; // 重置建造計數
        this.landsPurchasedThisTurn = 0; // 重置購買計數
        this.emit('turn.changed', { turn: this.turn, year: this.year });
    }
    
    /**
     * 檢查是否可以建造（檢查回合限制）
     */
    canBuild() {
        const current = this.buildingsBuiltThisTurn || 0;
        const max = GAME_CONFIG?.maxBuildingsPerTurn || 2;
        const canBuild = current < max;
        
        console.log('canBuild() 被調用:', {
            current: current,
            max: max,
            canBuild: canBuild,
            buildingsBuiltThisTurn: this.buildingsBuiltThisTurn,
            GAME_CONFIG_exists: !!GAME_CONFIG,
            maxBuildingsPerTurn: GAME_CONFIG?.maxBuildingsPerTurn
        });
        
        return canBuild;
    }
    
    /**
     * 增加建造計數
     */
    incrementBuildCount() {
        const before = this.buildingsBuiltThisTurn || 0;
        this.buildingsBuiltThisTurn = (this.buildingsBuiltThisTurn || 0) + 1;
        console.log('incrementBuildCount:', {
            before: before,
            after: this.buildingsBuiltThisTurn
        });
        this.emit('build.count.changed', { count: this.buildingsBuiltThisTurn, max: GAME_CONFIG?.maxBuildingsPerTurn || 2 });
    }

    /**
     * 檢查是否可以購買地塊
     * @returns {boolean}
     */
    canPurchaseLand() {
        return (this.landsPurchasedThisTurn || 0) < 1; // 每回合最多購買 1 個地塊
    }

    /**
     * 增加地塊購買計數
     */
    incrementLandPurchaseCount() {
        this.landsPurchasedThisTurn = (this.landsPurchasedThisTurn || 0) + 1;
        this.emit('land.purchase.changed', { count: this.landsPurchasedThisTurn, max: 1 });
    }

    /**
     * 獲取玩家建築列表
     */
    getPlayerBuildings() {
        return this.buildings.filter(b => b.owner === 'P');
    }

    /**
     * 獲取指定地塊的建築
     */
    getBuildingAtTile(tileIndex) {
        return this.buildings.find(b => b.tileIndex === tileIndex);
    }

    /**
     * 獲取狀態快照（用於調試或回滾）
     */
    getSnapshot() {
        return {
            year: this.year,
            turn: this.turn,
            money: this.money,
            emission: this.emission,
            domesticCredits: this.domesticCredits,
            intlCredits: this.intlCredits,
            monsterAnger: this.monsterAnger,
            buildings: JSON.parse(JSON.stringify(this.buildings)),
            competitors: JSON.parse(JSON.stringify(this.competitors))
        };
    }

    /**
     * 從快照恢復狀態
     */
    restoreFromSnapshot(snapshot) {
        this.year = snapshot.year;
        this.turn = snapshot.turn;
        this.money = snapshot.money;
        this.emission = snapshot.emission;
        this.domesticCredits = snapshot.domesticCredits;
        this.intlCredits = snapshot.intlCredits;
        this.monsterAnger = snapshot.monsterAnger;
        this.buildings = snapshot.buildings;
        this.competitors = snapshot.competitors;
        this.emit('state.restored', snapshot);
    }
}

// 導出單例實例
export const gameState = new GameState();

