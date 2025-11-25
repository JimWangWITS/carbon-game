/**
 * 視覺化數據面板
 * 提供碳費計算過程、排放來源追溯等功能
 */
export class DataPanel {
    constructor() {
        this.isExpanded = false;
    }

    /**
     * 生成碳費計算詳細報告
     * @param {Object} carbonFeeResult - 碳費計算結果
     * @param {Object} gameState - 遊戲狀態
     * @returns {string} HTML 字符串
     */
    generateCarbonFeeBreakdown(carbonFeeResult, gameState) {
        if (!carbonFeeResult || !carbonFeeResult.breakdown) {
            return '<p class="text-slate-400">無數據</p>';
        }

        const bd = carbonFeeResult.breakdown;
        let html = '<div class="space-y-3">';

        // 總排放量
        html += `
            <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                <div class="text-xs text-slate-400 mb-1">年度總排放量</div>
                <div class="text-lg font-bold text-white">${bd.totalEmission.toLocaleString()} 噸</div>
                <div class="text-xs text-slate-500 mt-1">
                    直接排放: ${bd.directEmission.toLocaleString()} 噸 | 
                    間接排放: ${bd.indirectEmission.toLocaleString()} 噸
                </div>
            </div>
        `;

        // 免徵額度
        html += `
            <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                <div class="text-xs text-slate-400 mb-1">免徵額度</div>
                <div class="text-lg font-bold text-emerald-400">${bd.freeEmission.toLocaleString()} 噸</div>
            </div>
        `;

        // 收費排放量
        html += `
            <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                <div class="text-xs text-slate-400 mb-1">收費排放量</div>
                <div class="text-lg font-bold text-yellow-400">${bd.chargeableEmission.toLocaleString()} 噸</div>
                <div class="text-xs text-slate-500 mt-1">
                    = (${bd.totalEmission.toLocaleString()} - ${bd.freeEmission.toLocaleString()}) × ${bd.industryCoeff.toFixed(2)}
                </div>
            </div>
        `;

        // 碳權扣減
        html += `
            <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                <div class="text-xs text-slate-400 mb-1">碳權扣減</div>
                <div class="space-y-1">
                    <div class="flex justify-between">
                        <span class="text-sm text-slate-300">國內額度:</span>
                        <span class="text-sm font-bold text-emerald-400">-${bd.deduction.domestic.toLocaleString()} 噸</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm text-slate-300">國際碳權:</span>
                        <span class="text-sm font-bold text-blue-400">-${bd.deduction.international.toLocaleString()} 噸</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-600 pt-1 mt-1">
                        <span class="text-sm font-bold text-slate-200">總扣減:</span>
                        <span class="text-sm font-bold text-white">-${bd.totalDeduction.toLocaleString()} 噸</span>
                    </div>
                </div>
            </div>
        `;

        // 最終碳費
        html += `
            <div class="bg-rose-900/30 p-3 rounded-lg border-2 border-rose-500">
                <div class="text-xs text-rose-300 mb-1">最終碳費</div>
                <div class="text-2xl font-black text-rose-400">$${bd.carbonFee.toLocaleString()}</div>
                <div class="text-xs text-rose-200 mt-1">
                    = (${bd.chargeableEmission.toLocaleString()} - ${bd.totalDeduction.toLocaleString()}) × ${bd.factoryRate}
                </div>
            </div>
        `;

        html += '</div>';
        return html;
    }

    /**
     * 生成排放來源追溯報告
     * @param {Array} buildings - 建築列表
     * @param {Object} carbonFeeSystem - 碳費系統
     * @param {Object} landSystem - 土地系統
     * @param {Object} BUILDINGS - 建築配置
     * @returns {string} HTML 字符串
     */
    generateEmissionSourceTrace(buildings, carbonFeeSystem, landSystem, BUILDINGS) {
        if (!buildings || buildings.length === 0) {
            return '<p class="text-slate-400">尚無建築</p>';
        }

        let html = '<div class="space-y-2">';
        let totalEmission = 0;

        buildings.forEach(building => {
            const buildingData = BUILDINGS[building.type];
            if (!buildingData) return;

            const emission = carbonFeeSystem.calculateBuildingEmission(building);
            totalEmission += emission;

            const land = landSystem.getLand(building.tileIndex);
            const landCoeff = land ? land.emissionCoeff : 1.0;
            const levelCoeff = building.level === 'Lv2' ? 0.8 : building.level === 'Lv3' ? 0.6 : 1.0;

            html += `
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-2xl">${buildingData.emoji}</span>
                            <div>
                                <div class="font-bold text-white">${buildingData.name}</div>
                                <div class="text-xs text-slate-400">${building.level || 'Lv1'}</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-lg font-bold text-rose-400">${emission.toLocaleString()} 噸</div>
                            <div class="text-xs text-slate-500">${((emission / totalEmission) * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                    <div class="text-xs text-slate-500 space-y-1">
                        <div>基礎排放: ${buildingData.emission.toLocaleString()} 噸</div>
                        <div>土地係數: ${landCoeff.toFixed(2)} ${land ? `(${land.name})` : ''}</div>
                        <div>等級係數: ${levelCoeff.toFixed(2)}</div>
                        <div class="text-slate-400">計算: ${buildingData.emission} × ${landCoeff.toFixed(2)} × ${levelCoeff.toFixed(2)} = ${emission.toLocaleString()}</div>
                    </div>
                </div>
            `;
        });

        html += `
            <div class="bg-slate-900 p-3 rounded-lg border-2 border-slate-600 mt-3">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-white">總排放量</span>
                    <span class="text-xl font-black text-rose-400">${totalEmission.toLocaleString()} 噸</span>
                </div>
            </div>
        `;

        html += '</div>';
        return html;
    }

    /**
     * 生成預測工具（如果建造某建築的影響）
     * @param {Object} buildingData - 建築數據
     * @param {number} tileIndex - 地塊索引
     * @param {Object} gameState - 遊戲狀態
     * @param {Object} carbonFeeSystem - 碳費系統
     * @param {Object} landSystem - 土地系統
     * @returns {string} HTML 字符串
     */
    generateBuildPrediction(buildingData, tileIndex, gameState, carbonFeeSystem, landSystem) {
        const land = landSystem.getLand(tileIndex);
        const landCoeff = land ? land.emissionCoeff : 1.0;
        const projectedEmission = buildingData.emission * landCoeff;
        const currentEmission = carbonFeeSystem.calculateTotalEmission('P');
        const newEmission = currentEmission + projectedEmission;

        // 預測碳費
        const currentCarbonFee = carbonFeeSystem.calculateCarbonFee('P');
        // 簡化預測：假設新排放會增加相應的碳費
        const estimatedNewCarbonFee = currentCarbonFee.carbonFee + (projectedEmission * 500); // 簡化計算

        let html = '<div class="space-y-2">';

        html += `
            <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                <div class="text-xs text-slate-400 mb-2">建造後預測</div>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-sm text-slate-300">當前排放:</span>
                        <span class="text-sm font-bold text-white">${currentEmission.toLocaleString()} 噸</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm text-slate-300">新增排放:</span>
                        <span class="text-sm font-bold text-rose-400">+${projectedEmission.toLocaleString()} 噸</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-600 pt-2">
                        <span class="text-sm font-bold text-slate-200">預測總排放:</span>
                        <span class="text-sm font-bold text-yellow-400">${newEmission.toLocaleString()} 噸</span>
                    </div>
                </div>
            </div>
        `;

        html += `
            <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                <div class="text-xs text-slate-400 mb-2">財務影響</div>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-sm text-slate-300">年收入增加:</span>
                        <span class="text-sm font-bold text-emerald-400">+$${buildingData.income.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm text-slate-300">預測碳費增加:</span>
                        <span class="text-sm font-bold text-rose-400">+$${estimatedNewCarbonFee.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between border-t border-slate-600 pt-2">
                        <span class="text-sm font-bold text-slate-200">淨收益預測:</span>
                        <span class="text-sm font-bold ${(buildingData.income - estimatedNewCarbonFee) >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                            ${(buildingData.income - estimatedNewCarbonFee) >= 0 ? '+' : ''}$${(buildingData.income - estimatedNewCarbonFee).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        `;

        if (land) {
            html += `
                <div class="bg-slate-800 p-3 rounded-lg border border-slate-600">
                    <div class="text-xs text-slate-400 mb-1">土地屬性</div>
                    <div class="text-sm text-slate-300">${land.name}</div>
                    <div class="text-xs text-slate-500 mt-1">${land.description}</div>
                    <div class="text-xs text-slate-500">排放係數: ${landCoeff.toFixed(2)}</div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }
}

