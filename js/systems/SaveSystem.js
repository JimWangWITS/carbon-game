/**
 * 遊戲保存/載入系統
 * 實現本地存儲功能，支持多個存檔槽位
 */
export class SaveSystem {
    constructor() {
        this.storageKey = 'carbon_game_saves';
        this.maxSlots = 5; // 最多 5 個存檔槽位
    }

    /**
     * 保存遊戲狀態到指定槽位
     * @param {number} slotIndex - 存檔槽位索引 (0-4)
     * @param {Object} gameState - 遊戲狀態對象
     * @param {Object} additionalData - 額外數據（如土地系統、回合系統等）
     * @returns {boolean} 是否保存成功
     */
    saveGame(slotIndex, gameState, additionalData = {}) {
        if (slotIndex < 0 || slotIndex >= this.maxSlots) {
            console.error('無效的存檔槽位索引:', slotIndex);
            return false;
        }

        try {
            // 獲取當前所有存檔
            const allSaves = this.getAllSaves();
            
            // 創建存檔數據
            const saveData = {
                version: '1.0.0', // 版本號，用於未來兼容性檢查
                timestamp: Date.now(),
                gameState: gameState.getSnapshot(),
                additionalData: {
                    // 保存土地系統數據
                    lands: additionalData.lands || null,
                    // 保存其他系統數據
                    ...additionalData
                }
            };

            // 更新指定槽位
            allSaves[slotIndex] = saveData;

            // 保存到 localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(allSaves));
            
            console.log(`✅ 遊戲已保存到槽位 ${slotIndex + 1}`);
            return true;
        } catch (error) {
            console.error('保存遊戲失敗:', error);
            return false;
        }
    }

    /**
     * 從指定槽位載入遊戲狀態
     * @param {number} slotIndex - 存檔槽位索引
     * @param {Object} gameState - 遊戲狀態對象（將被恢復）
     * @returns {Object|null} 載入的存檔數據，失敗返回 null
     */
    loadGame(slotIndex, gameState) {
        if (slotIndex < 0 || slotIndex >= this.maxSlots) {
            console.error('無效的存檔槽位索引:', slotIndex);
            return null;
        }

        try {
            const allSaves = this.getAllSaves();
            const saveData = allSaves[slotIndex];

            if (!saveData) {
                console.warn(`槽位 ${slotIndex + 1} 沒有存檔`);
                return null;
            }

            // 恢復遊戲狀態
            if (saveData.gameState) {
                gameState.restoreFromSnapshot(saveData.gameState);
            }

            console.log(`✅ 遊戲已從槽位 ${slotIndex + 1} 載入`);
            return saveData;
        } catch (error) {
            console.error('載入遊戲失敗:', error);
            return null;
        }
    }

    /**
     * 獲取所有存檔信息
     * @returns {Array} 存檔信息數組
     */
    getAllSaves() {
        try {
            const savesJson = localStorage.getItem(this.storageKey);
            if (!savesJson) {
                return new Array(this.maxSlots).fill(null);
            }
            const saves = JSON.parse(savesJson);
            // 確保數組長度正確
            while (saves.length < this.maxSlots) {
                saves.push(null);
            }
            return saves;
        } catch (error) {
            console.error('讀取存檔失敗:', error);
            return new Array(this.maxSlots).fill(null);
        }
    }

    /**
     * 獲取存檔信息（不載入完整數據）
     * @returns {Array} 存檔信息數組，每個元素包含 { exists, timestamp, turn, year, money }
     */
    getSaveInfo() {
        const allSaves = this.getAllSaves();
        return allSaves.map((save, index) => {
            if (!save) {
                return {
                    slotIndex: index,
                    exists: false,
                    timestamp: null,
                    turn: null,
                    year: null,
                    money: null
                };
            }

            return {
                slotIndex: index,
                exists: true,
                timestamp: save.timestamp,
                turn: save.gameState?.turn || null,
                year: save.gameState?.year || null,
                money: save.gameState?.money || null,
                formattedDate: new Date(save.timestamp).toLocaleString('zh-TW')
            };
        });
    }

    /**
     * 刪除指定槽位的存檔
     * @param {number} slotIndex - 存檔槽位索引
     * @returns {boolean} 是否刪除成功
     */
    deleteSave(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.maxSlots) {
            return false;
        }

        try {
            const allSaves = this.getAllSaves();
            allSaves[slotIndex] = null;
            localStorage.setItem(this.storageKey, JSON.stringify(allSaves));
            console.log(`✅ 槽位 ${slotIndex + 1} 的存檔已刪除`);
            return true;
        } catch (error) {
            console.error('刪除存檔失敗:', error);
            return false;
        }
    }

    /**
     * 自動保存（保存到槽位 0，作為自動存檔）
     * @param {Object} gameState - 遊戲狀態對象
     * @param {Object} additionalData - 額外數據
     */
    autoSave(gameState, additionalData = {}) {
        return this.saveGame(0, gameState, additionalData);
    }

    /**
     * 載入自動存檔
     * @param {Object} gameState - 遊戲狀態對象
     * @returns {Object|null} 載入的存檔數據
     */
    loadAutoSave(gameState) {
        return this.loadGame(0, gameState);
    }

    /**
     * 檢查是否有自動存檔
     * @returns {boolean}
     */
    hasAutoSave() {
        const allSaves = this.getAllSaves();
        return allSaves[0] !== null;
    }
}

