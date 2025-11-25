/**
 * 新手教學系統
 * 提供互動式教學流程，逐步引導玩家了解遊戲機制
 */
export class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.completed = this.loadTutorialProgress();
        this.steps = this.initializeSteps();
    }

    /**
     * 初始化教學步驟
     * @returns {Array} 教學步驟數組
     */
    initializeSteps() {
        return [
            {
                id: 'welcome',
                title: '歡迎來到《低碳霸主》！',
                content: '你將扮演一位企業 CEO，在碳費制度下經營企業。目標是在不讓城市被排放怪獸摧毀的前提下，獲得最高收益！',
                target: null,
                action: 'next',
                position: 'center'
            },
            {
                id: 'monster',
                title: '認識排放怪獸',
                content: '這是排放怪獸的怒氣值。當全體玩家排放過多時，怪獸會成長。如果達到 100%，城市會被摧毀，遊戲失敗！',
                target: 'monster-bar',
                action: 'next',
                position: 'bottom'
            },
            {
                id: 'resources',
                title: '資源面板',
                content: '這裡顯示你的資金、排放量和碳權。注意：排放量超過免稅額（10,000 噸）就需要支付碳費！',
                target: 'player-money',
                action: 'next',
                position: 'bottom'
            },
            {
                id: 'build',
                title: '建造你的第一個建築',
                content: '點擊你的地塊（標有 "P" 的綠色地塊）來建造工廠。不同建築有不同的收益和排放量。',
                target: null,
                action: 'wait_build',
                position: 'center',
                highlight: 'game-grid'
            },
            {
                id: 'building_types',
                title: '建築類型',
                content: '燃煤電廠：高收益高排放 | 燃氣電廠：中等平衡 | 太陽能：零排放但收益較低 | 選擇適合的策略！',
                target: 'build-modal',
                action: 'next',
                position: 'center'
            },
            {
                id: 'carbon_fee',
                title: '了解碳費',
                content: '建造建築會增加排放量。超過免稅額的部分需要支付碳費。點擊「數據面板」按鈕可以查看詳細計算過程。',
                target: null,
                action: 'next',
                position: 'center'
            },
            {
                id: 'upgrade',
                title: '升級建築',
                content: '點擊你建造的建築可以升級。升級可以降低排放和碳費，但需要投入資金。',
                target: null,
                action: 'wait_upgrade',
                position: 'center'
            },
            {
                id: 'carbon_credits',
                title: '碳權交易',
                content: '可以購買國內許可證或國際碳權來抵扣碳費。國內額度可買賣，國際碳權只能購買。',
                target: null,
                action: 'next',
                position: 'center'
            },
            {
                id: 'end_turn',
                title: '結束回合',
                content: '點擊「結束這一年」來結算收入、支付碳費，並讓 NPC 行動。每回合代表一年，共 10 回合。',
                target: 'end-turn-btn',
                action: 'wait_end_turn',
                position: 'top'
            },
            {
                id: 'victory',
                title: '勝利條件',
                content: '遊戲結束時，碳費最高者會被淘汰。其餘玩家中，收益最高者獲勝。記住：不要讓怪獸達到 100%！',
                target: null,
                action: 'complete',
                position: 'center'
            }
        ];
    }

    /**
     * 開始教學
     */
    start() {
        if (this.completed) {
            return false; // 已經完成過教學
        }
        this.currentStep = 0;
        this.showStep(0);
        return true;
    }

    /**
     * 顯示指定步驟
     * @param {number} stepIndex - 步驟索引
     */
    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        
        // 創建或更新教學覆蓋層
        this.createTutorialOverlay(step);
    }

    /**
     * 創建教學覆蓋層
     * @param {Object} step - 教學步驟
     */
    createTutorialOverlay(step) {
        // 移除舊的覆蓋層和高亮
        const oldOverlay = document.getElementById('tutorial-overlay');
        if (oldOverlay) {
            oldOverlay.remove();
        }
        this.clearHighlights();

        // 判斷是否需要模糊背景
        // 1. 需要操作的步驟（wait_*）不模糊
        // 2. 有目標元素的步驟也降低模糊度，讓目標清晰可見
        const needsInteraction = step.action === 'wait_build' || step.action === 'wait_upgrade' || step.action === 'wait_end_turn';
        const hasTarget = step.target || step.highlight;
        const shouldReduceBlur = needsInteraction || hasTarget;
        
        const overlayOpacity = shouldReduceBlur ? 'bg-black/15' : 'bg-black/40';
        const blurClass = shouldReduceBlur ? '' : 'backdrop-blur-[2px]';

        // 創建新的覆蓋層
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'fixed inset-0 z-[100] pointer-events-none';
        
        // 計算彈窗位置
        const popupStyle = this.getPopupPosition(step);
        
        overlay.innerHTML = `
            <div class="absolute inset-0 ${overlayOpacity} ${blurClass}"></div>
            <div id="tutorial-popup" class="absolute bg-slate-800 rounded-2xl shadow-2xl border-2 border-blue-500 p-6 max-w-md pointer-events-auto z-[101]" style="${popupStyle}">
                <div class="flex items-start justify-between mb-4">
                    <h3 class="text-xl font-bold text-white">${step.title}</h3>
                    <button onclick="tutorialSystem.skip()" class="text-slate-400 hover:text-white text-xl leading-none">✕</button>
                </div>
                <p class="text-slate-300 mb-4 leading-relaxed">${step.content}</p>
                <div class="flex justify-between items-center">
                    <div class="text-xs text-slate-400">
                        步驟 ${this.currentStep + 1} / ${this.steps.length}
                    </div>
                    <div class="flex gap-2">
                        ${this.currentStep > 0 ? '<button onclick="tutorialSystem.previous()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">上一步</button>' : ''}
                        ${step.action === 'next' ? '<button onclick="tutorialSystem.next()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition">下一步</button>' : ''}
                        ${step.action === 'wait_build' ? '<button onclick="tutorialSystem.skip()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">跳過</button>' : ''}
                        ${step.action === 'wait_upgrade' ? '<button onclick="tutorialSystem.skip()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">跳過</button>' : ''}
                        ${step.action === 'wait_end_turn' ? '<button onclick="tutorialSystem.skip()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">跳過</button>' : ''}
                        ${step.action === 'complete' ? '<button onclick="tutorialSystem.complete()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition">完成教學</button>' : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 高亮目標元素（延遲執行，確保 DOM 已更新）
        setTimeout(() => {
            if (step.target) {
                this.highlightTarget(step.target, step);
            } else if (step.highlight) {
                this.highlightTarget(step.highlight, step);
            }
        }, 100);
    }

    /**
     * 獲取彈窗位置
     * @param {Object} step - 教學步驟
     * @returns {string} CSS 樣式字符串
     */
    getPopupPosition(step) {
        const popupWidth = 400; // max-w-md 約 400px
        const popupHeight = 250; // 估算高度（包含內容和按鈕）
        const spacing = 20;
        
        // 如果有目標元素，在目標元素附近顯示
        if (step.target) {
            const target = document.getElementById(step.target);
            if (target) {
                const rect = target.getBoundingClientRect();
                
                // 根據位置偏好計算位置
                let top, left;
                const position = step.position || 'bottom';
                
                switch (position) {
                    case 'top':
                        top = rect.top - popupHeight - spacing;
                        left = rect.left + (rect.width / 2) - (popupWidth / 2);
                        break;
                    case 'bottom':
                        top = rect.bottom + spacing;
                        left = rect.left + (rect.width / 2) - (popupWidth / 2);
                        break;
                    case 'left':
                        top = rect.top + (rect.height / 2) - (popupHeight / 2);
                        left = rect.left - popupWidth - spacing;
                        break;
                    case 'right':
                        top = rect.top + (rect.height / 2) - (popupHeight / 2);
                        left = rect.right + spacing;
                        break;
                    default:
                        top = rect.bottom + spacing;
                        left = rect.left + (rect.width / 2) - (popupWidth / 2);
                }
                
                // 確保彈窗不會超出視窗
                top = Math.max(20, Math.min(top, window.innerHeight - popupHeight - 20));
                left = Math.max(20, Math.min(left, window.innerWidth - popupWidth - 20));
                
                return `top: ${top}px; left: ${left}px;`;
            }
        }
        
        // 如果有 highlight 但沒有 target（如 game-grid），彈窗顯示在側邊，不遮擋地圖
        if (step.highlight) {
            const highlightEl = document.getElementById(step.highlight);
            if (highlightEl) {
                const rect = highlightEl.getBoundingClientRect();
                // 顯示在地圖右側或左側，避免遮擋
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                
                // 嘗試顯示在右側
                let left = rect.right + spacing;
                let top = Math.max(20, Math.min(rect.top, windowHeight - popupHeight - 20));
                
                // 如果右側空間不足，顯示在左側
                if (left + popupWidth > windowWidth - 20) {
                    left = rect.left - popupWidth - spacing;
                    // 如果左側也不足，顯示在上方
                    if (left < 20) {
                        left = Math.max(20, (windowWidth - popupWidth) / 2);
                        top = Math.max(20, rect.top - popupHeight - spacing);
                        if (top < 20) {
                            top = 20;
                        }
                    }
                }
                
                return `top: ${top}px; left: ${left}px;`;
            }
        }
        
        // 如果沒有目標元素，使用預設位置（但避免與主要操作區域重疊）
        const position = step.position || 'center';
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 對於 center 位置，稍微偏上，避免遮擋地圖
        if (position === 'center') {
            return `top: 30%; left: 50%; transform: translate(-50%, -50%);`;
        }
        
        const styles = {
            top: 'top: 20px; left: 50%; transform: translateX(-50%);',
            bottom: 'bottom: 20px; left: 50%; transform: translateX(-50%);',
            left: 'top: 50%; left: 20px; transform: translateY(-50%);',
            right: 'top: 50%; right: 20px; transform: translateY(-50%);'
        };
        return styles[position] || styles.center;
    }

    /**
     * 高亮目標元素
     * @param {string} targetId - 目標元素 ID
     * @param {Object} step - 教學步驟
     */
    highlightTarget(targetId, step) {
        const target = document.getElementById(targetId);
        if (!target) return;
        
        // 設置高亮樣式
        const currentZIndex = window.getComputedStyle(target).zIndex;
        if (!currentZIndex || currentZIndex === 'auto') {
            target.style.zIndex = '102';
        }
        if (window.getComputedStyle(target).position === 'static') {
            target.style.position = 'relative';
        }
        target.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-900');
        target.style.transition = 'all 0.3s ease';
        
        // 如果是需要操作的步驟，確保目標元素可點擊
        const needsInteraction = step && (step.action === 'wait_build' || step.action === 'wait_upgrade' || step.action === 'wait_end_turn');
        if (needsInteraction) {
            // 移除覆蓋層在目標元素上的 pointer-events 限制
            const overlay = document.getElementById('tutorial-overlay');
            if (overlay) {
                // 在目標元素位置創建一個「洞」，讓點擊可以穿透
                this.createClickableHole(target, overlay);
            }
        }
    }

    /**
     * 在覆蓋層上創建可點擊的「洞」
     * @param {HTMLElement} target - 目標元素
     * @param {HTMLElement} overlay - 覆蓋層元素
     */
    createClickableHole(target, overlay) {
        // 移除舊的洞
        const oldHole = document.getElementById('tutorial-clickable-hole');
        if (oldHole) {
            oldHole.remove();
        }
        
        const rect = target.getBoundingClientRect();
        const hole = document.createElement('div');
        hole.className = 'absolute pointer-events-auto';
        hole.style.top = `${rect.top}px`;
        hole.style.left = `${rect.left}px`;
        hole.style.width = `${rect.width}px`;
        hole.style.height = `${rect.height}px`;
        hole.style.zIndex = '103';
        hole.style.background = 'transparent';
        hole.style.cursor = 'pointer';
        hole.id = 'tutorial-clickable-hole';
        
        // 讓點擊事件穿透到目標元素
        hole.addEventListener('click', (e) => {
            e.stopPropagation();
            target.click();
        });
        
        overlay.appendChild(hole);
    }

    /**
     * 清除所有高亮
     */
    clearHighlights() {
        // 移除高亮樣式
        document.querySelectorAll('.ring-4').forEach(el => {
            el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-900');
            el.style.zIndex = '';
            el.style.position = '';
        });
        
        // 移除可點擊的洞
        const hole = document.getElementById('tutorial-clickable-hole');
        if (hole) {
            hole.remove();
        }
    }

    /**
     * 下一步
     */
    next() {
        this.showStep(this.currentStep + 1);
    }

    /**
     * 上一步
     */
    previous() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }

    /**
     * 跳過教學
     */
    skip() {
        if (confirm('確定要跳過教學嗎？你可以隨時在設置中重新開始。')) {
            this.complete();
        }
    }

    /**
     * 完成教學
     */
    complete() {
        this.completed = true;
        this.saveTutorialProgress();
        this.hide();
    }

    /**
     * 隱藏教學覆蓋層
     */
    hide() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.remove();
        }
        // 清除所有高亮
        this.clearHighlights();
    }

    /**
     * 檢查是否需要等待特定動作
     * @param {string} action - 動作類型
     * @returns {boolean} 是否應該繼續
     */
    checkAction(action) {
        const currentStep = this.steps[this.currentStep];
        if (currentStep && currentStep.action === action) {
            this.next();
            return true;
        }
        return false;
    }

    /**
     * 從本地存儲載入教學進度
     * @returns {boolean} 是否已完成
     */
    loadTutorialProgress() {
        try {
            const saved = localStorage.getItem('carbon_game_tutorial_completed');
            return saved === 'true';
        } catch (error) {
            return false;
        }
    }

    /**
     * 保存教學進度到本地存儲
     */
    saveTutorialProgress() {
        try {
            localStorage.setItem('carbon_game_tutorial_completed', 'true');
        } catch (error) {
            console.error('保存教學進度失敗:', error);
        }
    }

    /**
     * 重置教學進度
     */
    reset() {
        this.completed = false;
        this.currentStep = 0;
        localStorage.removeItem('carbon_game_tutorial_completed');
    }
}

