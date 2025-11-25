/**
 * 成就系統
 * 追蹤玩家成就，提供成就定義、檢查和獎勵
 */
export class AchievementSystem {
    constructor() {
        this.achievements = this.initializeAchievements();
        this.unlockedAchievements = this.loadUnlockedAchievements();
    }

    /**
     * 初始化成就定義
     * @returns {Object} 成就定義對象
     */
    initializeAchievements() {
        return {
            // 里程碑成就
            first_building: {
                id: 'first_building',
                name: '初出茅廬',
                description: '建造第一個建築',
                icon: '🏗️',
                category: 'milestone',
                points: 10,
                check: (gameState) => gameState.getPlayerBuildings().length >= 1
            },
            ten_buildings: {
                id: 'ten_buildings',
                name: '建築大師',
                description: '建造 10 個建築',
                icon: '🏢',
                category: 'milestone',
                points: 50,
                check: (gameState) => gameState.getPlayerBuildings().length >= 10
            },
            millionaire: {
                id: 'millionaire',
                name: '百萬富翁',
                description: '累積資金達到 $100,000',
                icon: '💰',
                category: 'milestone',
                points: 100,
                check: (gameState) => gameState.money >= 100000
            },
            
            // 減碳成就
            low_emission: {
                id: 'low_emission',
                name: '環保先鋒',
                description: '單回合排放量低於 5,000 噸',
                icon: '🌱',
                category: 'green',
                points: 75,
                check: (gameState, carbonFeeSystem) => {
                    const emission = carbonFeeSystem.calculateTotalEmission('P');
                    return emission < 5000 && emission > 0;
                }
            },
            zero_emission: {
                id: 'zero_emission',
                name: '零排放大師',
                description: '單回合排放量為 0',
                icon: '🌍',
                category: 'green',
                points: 150,
                check: (gameState, carbonFeeSystem) => {
                    return carbonFeeSystem.calculateTotalEmission('P') === 0;
                }
            },
            green_energy: {
                id: 'green_energy',
                name: '綠能專家',
                description: '擁有 5 個綠能建築',
                icon: '☀️',
                category: 'green',
                points: 100,
                check: (gameState, carbonFeeSystem, additionalData) => {
                    // 需要通過 additionalData 傳入 BUILDINGS
                    const BUILDINGS = additionalData.BUILDINGS;
                    if (!BUILDINGS) return false;
                    const greenBuildings = gameState.getPlayerBuildings().filter(b => {
                        const buildingData = BUILDINGS[b.type];
                        return buildingData && buildingData.type === 'clean';
                    });
                    return greenBuildings.length >= 5;
                }
            },
            
            // 策略成就
            efficient_master: {
                id: 'efficient_master',
                name: '效率大師',
                description: '收益/排放比達到 5:1',
                icon: '⚡',
                category: 'strategy',
                points: 125,
                check: (gameState, carbonFeeSystem) => {
                    const emission = carbonFeeSystem.calculateTotalEmission('P');
                    if (emission === 0) return false;
                    const ratio = gameState.projectedIncome / emission;
                    return ratio >= 5;
                }
            },
            upgrade_master: {
                id: 'upgrade_master',
                name: '升級達人',
                description: '擁有 3 個 Lv3 建築',
                icon: '⬆️',
                category: 'strategy',
                points: 100,
                check: (gameState) => {
                    const lv3Buildings = gameState.getPlayerBuildings().filter(b => b.level === 'Lv3');
                    return lv3Buildings.length >= 3;
                }
            },
            carbon_trader: {
                id: 'carbon_trader',
                name: '碳權交易商',
                description: '累積購買 10,000 噸碳權',
                icon: '🎫',
                category: 'strategy',
                points: 80,
                check: (gameState) => {
                    // 這個需要追蹤累積購買量，暫時用當前持有量代替
                    return (gameState.domesticCredits + gameState.intlCredits) >= 10000;
                }
            },
            land_baron: {
                id: 'land_baron',
                name: '地產大亨',
                description: '擁有 8 個或更多地塊',
                icon: '🏞️',
                category: 'strategy',
                points: 100,
                check: (gameState, carbonFeeSystem, additionalData) => {
                    const landSystem = additionalData.landSystem;
                    if (!landSystem) return false;
                    const playerLands = landSystem.getLandsByOwner('P');
                    return playerLands.length >= 8;
                }
            },
            
            // 挑戰成就
            survive_monster: {
                id: 'survive_monster',
                name: '怪獸剋星',
                description: '在怪獸怒氣值超過 80% 時完成遊戲',
                icon: '👹',
                category: 'challenge',
                points: 200,
                check: (gameState) => {
                    return gameState.monsterAnger >= 80;
                }
            },
            early_winner: {
                id: 'early_winner',
                name: '快速勝利',
                description: '在第 5 回合前獲得最高收益',
                icon: '🏆',
                category: 'challenge',
                points: 150,
                check: (gameState, carbonFeeSystem, rankInfo) => {
                    return gameState.turn <= 5 && rankInfo && rankInfo.playerRank === 1;
                }
            },
            perfect_balance: {
                id: 'perfect_balance',
                name: '完美平衡',
                description: '同時達成收益、減碳、效率三項目標',
                icon: '⚖️',
                category: 'challenge',
                points: 250,
                check: (gameState, carbonFeeSystem, rankInfo) => {
                    const emission = carbonFeeSystem.calculateTotalEmission('P');
                    const hasGoodIncome = gameState.money >= 80000;
                    const hasLowEmission = emission < 10000;
                    const hasGoodRatio = emission > 0 && (gameState.projectedIncome / emission) >= 3;
                    return hasGoodIncome && hasLowEmission && hasGoodRatio;
                }
            },
            
            // 隱藏成就
            bankrupt: {
                id: 'bankrupt',
                name: '破產專家',
                description: '資金歸零（隱藏成就）',
                icon: '💸',
                category: 'hidden',
                points: 50,
                check: (gameState) => gameState.money === 0
            },
            monster_rage: {
                id: 'monster_rage',
                name: '怪獸暴怒',
                description: '讓怪獸怒氣值達到 100%（隱藏成就）',
                icon: '😡',
                category: 'hidden',
                points: 100,
                check: (gameState) => gameState.monsterAnger >= 100
            }
        };
    }

    /**
     * 檢查並解鎖成就
     * @param {Object} gameState - 遊戲狀態
     * @param {Object} carbonFeeSystem - 碳費系統（可選）
     * @param {Object} additionalData - 額外數據（如排名信息）
     * @returns {Array} 新解鎖的成就列表
     */
    checkAchievements(gameState, carbonFeeSystem = null, additionalData = {}) {
        const newlyUnlocked = [];

        Object.values(this.achievements).forEach(achievement => {
            // 如果已經解鎖，跳過
            if (this.unlockedAchievements.includes(achievement.id)) {
                return;
            }

            // 檢查成就條件
            try {
                let unlocked = false;
                if (achievement.check.length === 1) {
                    unlocked = achievement.check(gameState);
                } else if (achievement.check.length === 2) {
                    unlocked = achievement.check(gameState, carbonFeeSystem);
                } else {
                    unlocked = achievement.check(gameState, carbonFeeSystem, additionalData);
                }

                if (unlocked) {
                    this.unlockAchievement(achievement.id);
                    newlyUnlocked.push(achievement);
                }
            } catch (error) {
                console.error(`檢查成就 ${achievement.id} 時發生錯誤:`, error);
            }
        });

        return newlyUnlocked;
    }

    /**
     * 解鎖成就
     * @param {string} achievementId - 成就 ID
     */
    unlockAchievement(achievementId) {
        if (!this.unlockedAchievements.includes(achievementId)) {
            this.unlockedAchievements.push(achievementId);
            this.saveUnlockedAchievements();
            console.log(`🏆 成就解鎖: ${this.achievements[achievementId]?.name}`);
        }
    }

    /**
     * 獲取已解鎖的成就列表
     * @returns {Array} 已解鎖的成就對象列表
     */
    getUnlockedAchievements() {
        return this.unlockedAchievements
            .map(id => this.achievements[id])
            .filter(a => a !== undefined);
    }

    /**
     * 獲取所有成就（包括未解鎖的）
     * @returns {Array} 所有成就對象列表
     */
    getAllAchievements() {
        return Object.values(this.achievements);
    }

    /**
     * 獲取成就進度信息
     * @returns {Object} 進度統計
     */
    getProgress() {
        const total = Object.keys(this.achievements).length;
        const unlocked = this.unlockedAchievements.length;
        const totalPoints = Object.values(this.achievements)
            .reduce((sum, a) => sum + a.points, 0);
        const unlockedPoints = this.getUnlockedAchievements()
            .reduce((sum, a) => sum + a.points, 0);

        return {
            total,
            unlocked,
            locked: total - unlocked,
            progress: total > 0 ? (unlocked / total * 100).toFixed(1) : 0,
            totalPoints,
            unlockedPoints,
            progressPoints: totalPoints > 0 ? (unlockedPoints / totalPoints * 100).toFixed(1) : 0
        };
    }

    /**
     * 從本地存儲載入已解鎖的成就
     * @returns {Array} 已解鎖的成就 ID 列表
     */
    loadUnlockedAchievements() {
        try {
            const saved = localStorage.getItem('carbon_game_achievements');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('載入成就失敗:', error);
        }
        return [];
    }

    /**
     * 保存已解鎖的成就到本地存儲
     */
    saveUnlockedAchievements() {
        try {
            localStorage.setItem('carbon_game_achievements', JSON.stringify(this.unlockedAchievements));
        } catch (error) {
            console.error('保存成就失敗:', error);
        }
    }

    /**
     * 重置所有成就（用於測試或重置功能）
     */
    resetAchievements() {
        this.unlockedAchievements = [];
        this.saveUnlockedAchievements();
    }
}

