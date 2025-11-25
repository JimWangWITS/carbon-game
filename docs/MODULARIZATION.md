# 模組化改造說明

## 完成的高優先級項目

### 1. ✅ GameState 模組（狀態管理）
**文件**: `js/core/GameState.js`

- 封裝所有遊戲狀態為類
- 提供事件系統（on/off/emit）
- 狀態變更自動觸發事件
- 支援狀態快照與回滾
- 提供 getter/setter 方法

**主要功能**:
- `setMoney()`, `addMoney()`, `subtractMoney()` - 金錢管理
- `setEmission()`, `setMonsterAnger()` - 狀態設置
- `addBuilding()`, `removeBuilding()`, `upgradeBuilding()` - 建築管理
- `getPlayerBuildings()`, `getBuildingAtTile()` - 查詢方法
- `getSnapshot()`, `restoreFromSnapshot()` - 狀態快照

### 2. ✅ CarbonFeeSystem（完整碳費計算系統）
**文件**: `js/systems/CarbonFeeSystem.js`

完整實現 GDD 第 7 節的碳費公式：

#### 已實現的公式：

1. **年度總排放量**
   ```
   TotalEmission = Σ(直接排放 × 地塊係數 × 工廠等級係數) + 間接排放
   ```

2. **收費排放量**
   ```
   Chargeable = (TotalEmission − 25,000) × 行業係數
   ```

3. **碳權扣減**
   ```
   DomesticDeduction = min(DomesticCredit × 1.2, Chargeable × 10%)
   InternationalDeduction = min(IntlCredit × 1.0, Chargeable × 5%)
   ```

4. **最終碳費**
   ```
   CarbonFee = (Chargeable − DomesticDeduction − IntlDeduction) × FactoryRate
   ```

5. **CBAM 境外稅**（第 6 回合起）

**主要方法**:
- `calculateTotalEmission(owner)` - 計算總排放
- `calculateChargeableEmission(owner)` - 計算收費排放
- `calculateCreditDeduction()` - 計算碳權扣減
- `calculateCarbonFee(owner)` - 計算最終碳費
- `calculateCBAMTax(owner, turn)` - 計算 CBAM 稅

### 3. ✅ LandSystem（土地屬性系統）
**文件**: `js/systems/LandSystem.js`

實現 GDD 第 5 節的土地屬性系統：

#### 土地類型：

1. **基本區** 🧱
   - 無額外 buff
   - 排放係數: 1.0

2. **綠電網區** 🌿
   - 間接排放減少 50%
   - 排放係數: 1.0（直接排放不變）

3. **高製程效率區** 🧪
   - 直接排放減少 20%
   - 排放係數: 0.8

4. **出口加工區** 🚢
   - 行業係數影響（0.2→1.0）
   - 排放係數: 1.0

5. **高排放區** ⚠️
   - 排放增加 20%
   - 排放係數: 1.2

**主要方法**:
- `initializeLands(totalTiles, ownerKeys)` - 初始化地圖
- `getLand(tileIndex)` - 獲取地塊資訊
- `getLandsByOwner(ownerKey)` - 獲取指定所有者的地塊
- `getLandVisualInfo(tileIndex)` - 獲取視覺化資訊

## 模組結構

```
js/
├── core/
│   ├── GameConfig.js          # 配置常數（GAME_CONFIG, BUILDINGS, FACTORY_LEVELS）
│   └── GameState.js            # 遊戲狀態管理類
└── systems/
    ├── CarbonFeeSystem.js      # 碳費計算系統
    └── LandSystem.js           # 土地系統
```

## 主要改進

### 1. 關注點分離
- 狀態管理與業務邏輯分離
- UI 渲染與數據計算分離
- 配置與實現分離

### 2. 可維護性提升
- 單一職責原則：每個模組只負責一個功能
- 易於測試：各系統可獨立測試
- 易於擴展：新增功能只需添加新模組

### 3. 符合 GDD 規範
- 完整實現碳費公式（GDD 第 7 節）
- 實現土地屬性系統（GDD 第 5 節）
- 支援工廠等級系統（GDD 第 6 節）
- 支援 CBAM 境外稅（GDD 第 4 節）

## 使用方式

### 導入模組
```javascript
import { GAME_CONFIG, BUILDINGS } from './js/core/GameConfig.js';
import { gameState } from './js/core/GameState.js';
import { CarbonFeeSystem } from './js/systems/CarbonFeeSystem.js';
import { LandSystem } from './js/systems/LandSystem.js';
```

### 初始化系統
```javascript
const landSystem = new LandSystem();
landSystem.initializeLands(20, ['P', 'A', 'B', 'C']);

const carbonFeeSystem = new CarbonFeeSystem(gameState, landSystem);
```

### 計算碳費
```javascript
const carbonFeeResult = carbonFeeSystem.calculateCarbonFee('P');
console.log(carbonFeeResult.carbonFee); // 最終碳費
console.log(carbonFeeResult.breakdown); // 詳細計算過程
```

### 監聽狀態變更
```javascript
gameState.on('money.changed', ({ old, new: newValue }) => {
    console.log(`金錢從 ${old} 變更為 ${newValue}`);
});
```

## 注意事項

1. **ES6 Modules**: 需要使用 `type="module"` 的 script 標籤
2. **本地開發**: 需要使用 HTTP 伺服器（不能直接用 file:// 協議）
3. **瀏覽器支援**: 需要支援 ES6 Modules 的現代瀏覽器

## 下一步建議

### 中優先級項目
1. 實現完整的工廠等級系統（升級功能）
2. 實現查核事件系統（每 3 回合）
3. 重構 NPC AI 為策略模式

### 低優先級項目
1. UI 組件化
2. 引入狀態管理庫
3. 添加單元測試

## 測試建議

1. 打開瀏覽器開發者工具
2. 檢查控制台是否有導入錯誤
3. 測試建造工廠功能
4. 測試碳費計算是否正確
5. 測試土地屬性是否生效

