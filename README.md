# 低碳霸主：怪獸保衛戰

一個回合制碳費策略遊戲，讓玩家體驗在未來城市中經營企業，與 NPC 競爭版圖，管理碳費與排放，對抗排放怪獸的挑戰。

## 🎮 遊戲特色

- **回合制策略遊戲**：每回合代表一年，需要做出關鍵決策
- **碳費管理系統**：體驗真實的碳費制度帶來的經營壓力
- **NPC 競爭對手**：與 3 家不同性格的 NPC 企業競爭
- **排放怪獸系統**：視覺化呈現城市污染危機
- **雙市場機制**：國內碳額度可交易，國外碳權只能自用
- **多種建築類型**：電廠、製造業、高科技製造業等

## 🚀 快速開始

### 本地運行

1. 下載或克隆此專案
2. 直接用瀏覽器開啟 `game.html` 即可遊玩
3. 無需安裝任何依賴或伺服器

### 線上部署

本專案為純前端靜態網站，可部署到任何靜態網站託管服務。

#### 推薦部署方案

**1. GitHub Pages（推薦）**
```bash
# 1. 在 GitHub 建立新 repository
# 2. 上傳所有檔案
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用戶名/carbon-game.git
git branch -M main
git push -u origin main

# 3. 在 GitHub 設定：
#    Settings → Pages → Source: main branch
#    幾分鐘後即可透過 https://你的用戶名.github.io/carbon-game 訪問
```

**2. Netlify（最快速）**
- 前往 [netlify.com](https://netlify.com)
- 註冊帳號
- 直接拖放專案資料夾到 Netlify
- 立即獲得網址

**3. Vercel**
- 前往 [vercel.com](https://vercel.com)
- 連接 GitHub repository 或上傳專案
- 自動部署完成

## 📝 部署前檢查清單

- [x] ✅ 移除開發用的 console.log
- [x] ✅ 優化 meta 標籤（SEO、社群分享）
- [x] ✅ 加入 favicon
- [x] ✅ 行動裝置相容性優化
- [ ] ⚠️ 更新 meta 標籤中的網址（將 `https://your-domain.com/` 替換為實際網址）
- [ ] ⚠️ 建立 og-image.png（1200x630 像素，用於社群分享預覽圖）
- [ ] ⚠️ 建立 favicon PNG 檔案（16x16, 32x32, 192x192, 512x512）
- [ ] ⚠️ 建立 apple-touch-icon.png（180x180 像素）
- [ ] ⚠️ （可選）啟用 Google Analytics（取消註解並替換 YOUR_GA_ID）

## 🎯 遊戲目標

在不讓城市被排放怪獸摧毀的前提下：
1. **避免成為碳費最高者**（直接淘汰）
2. **存活玩家中，累積收益最高者獲勝**

## 🛠️ 技術架構

- **純前端**：HTML + JavaScript（ES6+）
- **樣式框架**：Tailwind CSS（CDN）
- **字體**：Google Fonts（Noto Sans TC, Fredoka）
- **圖標**：Font Awesome
- **頭像生成**：DiceBear API

## 📁 專案結構

```
carbon_game/
├── game.html              # 主遊戲檔案
├── favicon.svg            # Favicon（SVG）
├── site.webmanifest       # PWA 設定檔
├── README.md              # 本檔案
├── gdd.md                 # 遊戲設計文件
└── js/                    # JavaScript 模組
    ├── core/              # 核心系統
    │   ├── GameConfig.js
    │   └── GameState.js
    ├── systems/           # 遊戲系統
    │   ├── AchievementSystem.js
    │   ├── BuildingSystem.js
    │   ├── CarbonFeeSystem.js
    │   ├── LandSystem.js
    │   ├── NPCAISystem.js
    │   ├── SaveSystem.js
    │   ├── TurnSystem.js
    │   └── VictorySystem.js
    └── ui/                # UI 系統
        ├── DataPanel.js
        └── TutorialSystem.js
```

## 🔧 開發模式

在 `game.html` 的 `<head>` 區塊中，可以設定開發模式：

```javascript
window.DEBUG_MODE = true; // 啟用詳細的 console 日誌
```

設為 `false` 可關閉詳細日誌，適合生產環境。

## 📄 授權

本專案為開源專案，可自由使用與修改。

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

## 📧 聯絡方式

如有問題或建議，歡迎透過 GitHub Issues 聯絡。

---

**享受遊戲，體驗碳費制度的挑戰！** 🌱

