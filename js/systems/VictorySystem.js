/**
 * 勝利條件系統
 * 實現多種勝利條件：收益霸主、減碳先鋒、效率大師等
 */
export class VictorySystem {
    constructor() {
        this.victoryConditions = this.initializeVictoryConditions();
    }

    /**
     * 初始化勝利條件
     * @returns {Object} 勝利條件定義
     */
    initializeVictoryConditions() {
        return {
            profit_king: {
                id: 'profit_king',
                name: '收益霸主',
                description: '累積收益最高',
                icon: '💰',
                priority: 1, // 預設勝利條件
                check: (playerData, allPlayers) => {
                    // 在所有存活玩家中收益最高
                    const alivePlayers = allPlayers.filter(p => !p.eliminated);
                    const maxProfit = Math.max(...alivePlayers.map(p => p.money));
                    return playerData.money === maxProfit && playerData.money > 0;
                }
            },
            carbon_pioneer: {
                id: 'carbon_pioneer',
                name: '減碳先鋒',
                description: '總排放量最低（且收益達標）',
                icon: '🌱',
                priority: 2,
                check: (playerData, allPlayers) => {
                    // 排放最低且收益達到標準（至少 50,000）
                    const alivePlayers = allPlayers.filter(p => !p.eliminated);
                    const minEmission = Math.min(...alivePlayers.map(p => p.totalEmission));
                    return playerData.totalEmission === minEmission && 
                           playerData.money >= 50000 &&
                           playerData.totalEmission > 0; // 不能是 0（完全沒建築）
                }
            },
            efficiency_master: {
                id: 'efficiency_master',
                name: '效率大師',
                description: '收益/排放比最高（且收益達標）',
                icon: '⚡',
                priority: 3,
                check: (playerData, allPlayers) => {
                    // 效率比最高且收益達到標準
                    const alivePlayers = allPlayers.filter(p => !p.eliminated && p.totalEmission > 0);
                    if (alivePlayers.length === 0) return false;
                    
                    const maxRatio = Math.max(...alivePlayers.map(p => {
                        return p.totalEmission > 0 ? p.money / p.totalEmission : 0;
                    }));
                    const playerRatio = playerData.totalEmission > 0 ? 
                        playerData.money / playerData.totalEmission : 0;
                    
                    return playerRatio === maxRatio && 
                           playerData.money >= 50000 &&
                           playerData.totalEmission > 0;
                }
            },
            perfect_balance: {
                id: 'perfect_balance',
                name: '完美平衡',
                description: '收益、排放、效率三項均衡',
                icon: '⚖️',
                priority: 4,
                check: (playerData, allPlayers) => {
                    // 三項都達到良好標準
                    const hasGoodIncome = playerData.money >= 80000;
                    const hasLowEmission = playerData.totalEmission < 15000;
                    const hasGoodRatio = playerData.totalEmission > 0 && 
                        (playerData.money / playerData.totalEmission) >= 3;
                    
                    return hasGoodIncome && hasLowEmission && hasGoodRatio;
                }
            },
            survivor: {
                id: 'surviver',
                name: '倖存者',
                description: '在怪獸怒氣值超過 90% 時完成遊戲',
                icon: '🛡️',
                priority: 5,
                check: (playerData, allPlayers, gameState) => {
                    // 怪獸怒氣值超過 90% 且玩家存活
                    return gameState.monsterAnger >= 90 && !playerData.eliminated;
                }
            }
        };
    }

    /**
     * 計算所有玩家的勝利條件
     * @param {Object} gameState - 遊戲狀態
     * @param {Object} carbonFeeSystem - 碳費系統
     * @returns {Object} 勝利結果
     */
    calculateVictory(gameState, carbonFeeSystem) {
        // 收集所有玩家數據
        const allPlayers = [];
        
        // 玩家數據
        const playerEmission = carbonFeeSystem.calculateTotalEmission('P');
        const playerCarbonFee = carbonFeeSystem.calculateCarbonFee('P');
        const playerEliminated = this.isEliminated('P', gameState, carbonFeeSystem);
        
        allPlayers.push({
            key: 'P',
            name: '你',
            money: gameState.money,
            totalEmission: playerEmission,
            carbonFee: playerCarbonFee.carbonFee,
            eliminated: playerEliminated
        });
        
        // NPC 數據
        Object.entries(gameState.competitors).forEach(([key, npc]) => {
            const npcEmission = carbonFeeSystem.calculateTotalEmission(key);
            const npcCarbonFee = carbonFeeSystem.calculateCarbonFee(key);
            const npcEliminated = this.isEliminated(key, gameState, carbonFeeSystem);
            
            allPlayers.push({
                key: key,
                name: npc.name,
                money: npc.money,
                totalEmission: npcEmission,
                carbonFee: npcCarbonFee.carbonFee,
                eliminated: npcEliminated
            });
        });
        
        // 找出被淘汰的玩家（碳費最高者）
        const maxCarbonFee = Math.max(...allPlayers.map(p => p.carbonFee));
        allPlayers.forEach(p => {
            if (p.carbonFee === maxCarbonFee && maxCarbonFee > 0) {
                p.eliminated = true;
            }
        });
        
        // 計算每個玩家的勝利條件
        const victoryResults = {};
        allPlayers.forEach(player => {
            if (player.eliminated) {
                victoryResults[player.key] = {
                    eliminated: true,
                    victories: []
                };
                return;
            }
            
            const victories = [];
            Object.values(this.victoryConditions).forEach(condition => {
                if (condition.check(player, allPlayers, gameState)) {
                    victories.push(condition);
                }
            });
            
            victoryResults[player.key] = {
                eliminated: false,
                victories: victories,
                // 主要勝利條件（優先級最高）
                primaryVictory: victories.length > 0 ? 
                    victories.sort((a, b) => a.priority - b.priority)[0] : null
            };
        });
        
        // 確定最終勝利者（按優先級排序）
        const winners = allPlayers
            .filter(p => !p.eliminated && victoryResults[p.key].victories.length > 0)
            .sort((a, b) => {
                const aPrimary = victoryResults[a.key].primaryVictory;
                const bPrimary = victoryResults[b.key].primaryVictory;
                if (!aPrimary) return 1;
                if (!bPrimary) return -1;
                return aPrimary.priority - bPrimary.priority;
            });
        
        return {
            allPlayers: allPlayers,
            victoryResults: victoryResults,
            winners: winners,
            primaryWinner: winners.length > 0 ? winners[0] : null
        };
    }

    /**
     * 檢查玩家是否被淘汰
     * @param {string} ownerKey - 玩家標識
     * @param {Object} gameState - 遊戲狀態
     * @param {Object} carbonFeeSystem - 碳費系統
     * @returns {boolean} 是否被淘汰
     */
    isEliminated(ownerKey, gameState, carbonFeeSystem) {
        // 碳費最高者被淘汰
        const allCarbonFees = [];
        
        if (ownerKey === 'P') {
            allCarbonFees.push(carbonFeeSystem.calculateCarbonFee('P').carbonFee);
        } else {
            allCarbonFees.push(carbonFeeSystem.calculateCarbonFee(ownerKey).carbonFee);
        }
        
        // 添加其他玩家的碳費
        if (ownerKey !== 'P') {
            allCarbonFees.push(carbonFeeSystem.calculateCarbonFee('P').carbonFee);
        }
        Object.keys(gameState.competitors).forEach(key => {
            if (key !== ownerKey) {
                allCarbonFees.push(carbonFeeSystem.calculateCarbonFee(key).carbonFee);
            }
        });
        
        const maxCarbonFee = Math.max(...allCarbonFees);
        const playerCarbonFee = ownerKey === 'P' ? 
            carbonFeeSystem.calculateCarbonFee('P').carbonFee :
            carbonFeeSystem.calculateCarbonFee(ownerKey).carbonFee;
        
        return playerCarbonFee === maxCarbonFee && maxCarbonFee > 0;
    }

    /**
     * 生成勝利報告
     * @param {Object} victoryResult - 勝利結果
     * @returns {string} HTML 字符串
     */
    generateVictoryReport(victoryResult) {
        let html = '<div class="space-y-4">';
        
        // 顯示所有玩家的結果
        victoryResult.allPlayers.forEach(player => {
            const result = victoryResult.victoryResults[player.key];
            const isPlayer = player.key === 'P';
            
            html += `
                <div class="bg-slate-700 p-4 rounded-lg border ${isPlayer ? 'border-yellow-500' : 'border-slate-600'}">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold ${isPlayer ? 'text-yellow-400' : 'text-white'}">${player.name}</span>
                        ${result.eliminated ? '<span class="text-xs bg-rose-500 text-white px-2 py-1 rounded">淘汰</span>' : ''}
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                            <div class="text-slate-400">資金</div>
                            <div class="font-bold text-yellow-400">$${player.money.toLocaleString()}</div>
                        </div>
                        <div>
                            <div class="text-slate-400">排放</div>
                            <div class="font-bold text-rose-400">${player.totalEmission.toLocaleString()} 噸</div>
                        </div>
                        <div>
                            <div class="text-slate-400">碳費</div>
                            <div class="font-bold text-red-400">$${player.carbonFee.toLocaleString()}</div>
                        </div>
                    </div>
                    ${result.victories.length > 0 ? `
                        <div class="mt-2">
                            <div class="text-xs text-slate-400 mb-1">達成勝利條件：</div>
                            <div class="flex flex-wrap gap-1">
                                ${result.victories.map(v => `
                                    <span class="text-xs bg-emerald-500 text-white px-2 py-1 rounded">
                                        ${v.icon} ${v.name}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        // 顯示最終勝利者
        if (victoryResult.primaryWinner) {
            const winnerResult = victoryResult.victoryResults[victoryResult.primaryWinner.key];
            html += `
                <div class="bg-gradient-to-r from-yellow-600 to-yellow-500 p-6 rounded-lg border-4 border-yellow-400 text-center">
                    <div class="text-4xl mb-2">${winnerResult.primaryVictory.icon}</div>
                    <div class="text-2xl font-black text-white mb-1">${victoryResult.primaryWinner.name}</div>
                    <div class="text-lg font-bold text-yellow-100">${winnerResult.primaryVictory.name}</div>
                    <div class="text-sm text-yellow-200 mt-2">${winnerResult.primaryVictory.description}</div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
}

