# 部署指南

本文件提供詳細的部署步驟和注意事項。

## 📋 部署前準備

### 1. 更新網址資訊

在 `game.html` 中，找到以下 meta 標籤並更新為你的實際網址：

```html
<!-- 將 https://your-domain.com/ 替換為你的實際網址 -->
<meta property="og:url" content="https://your-domain.com/">
<meta name="twitter:url" content="https://your-domain.com/">
<meta property="og:image" content="https://your-domain.com/og-image.png">
<meta name="twitter:image" content="https://your-domain.com/og-image.png">
```

### 2. 建立社群分享圖片

建立一個 `og-image.png` 檔案（建議尺寸：1200x630 像素），用於：
- Facebook 分享預覽
- Twitter 卡片預覽
- LinkedIn 分享預覽

圖片應包含：
- 遊戲名稱：「低碳霸主：怪獸保衛戰」
- 簡短描述或遊戲截圖
- 品牌色彩（建議使用深綠色系）

### 3. 建立 Favicon 檔案

雖然已經有 `favicon.svg`，但建議同時建立以下 PNG 檔案以獲得更好的相容性：

- `favicon-16x16.png` (16x16 像素)
- `favicon-32x32.png` (32x32 像素)
- `favicon-192x192.png` (192x192 像素)
- `favicon-512x512.png` (512x512 像素)
- `apple-touch-icon.png` (180x180 像素)

可以使用線上工具生成：
- [Favicon Generator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

### 4. （可選）啟用 Google Analytics

1. 前往 [Google Analytics](https://analytics.google.com/) 建立帳號
2. 建立新的屬性並取得追蹤 ID（格式：G-XXXXXXXXXX）
3. 在 `game.html` 中找到 Google Analytics 區塊
4. 取消註解並替換 `YOUR_GA_ID` 為你的實際追蹤 ID

## 🚀 部署步驟

### 方案 A：GitHub Pages

**優點**：免費、無流量限制、自動 HTTPS、可自訂域名

**步驟**：

1. **建立 GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: 低碳霸主遊戲"
   ```

2. **推送到 GitHub**
   ```bash
   git remote add origin https://github.com/你的用戶名/carbon-game.git
   git branch -M main
   git push -u origin main
   ```

3. **啟用 GitHub Pages**
   - 前往 repository 的 Settings
   - 左側選單選擇 Pages
   - Source 選擇 `main` branch
   - 點擊 Save
   - 等待幾分鐘，即可透過 `https://你的用戶名.github.io/carbon-game` 訪問

4. **（可選）自訂域名**
   - 在 repository 根目錄建立 `CNAME` 檔案
   - 內容填入你的域名（例如：`carbon-game.example.com`）
   - 在 DNS 設定中加入 CNAME 記錄指向 `你的用戶名.github.io`

### 方案 B：Netlify

**優點**：部署快速、自動 HTTPS、全球 CDN、自動部署

**步驟**：

1. **註冊 Netlify 帳號**
   - 前往 [netlify.com](https://netlify.com)
   - 使用 GitHub 帳號登入（推薦）

2. **部署方式一：拖放部署**
   - 登入後點擊 "Add new site" → "Deploy manually"
   - 直接拖放專案資料夾
   - 立即獲得網址（例如：`random-name-123.netlify.app`）

3. **部署方式二：Git 整合（推薦）**
   - 點擊 "Add new site" → "Import an existing project"
   - 選擇 GitHub 並授權
   - 選擇你的 repository
   - Netlify 會自動偵測設定並部署
   - 之後每次 push 到 GitHub 都會自動重新部署

4. **（可選）自訂域名**
   - 在 Site settings → Domain management
   - 點擊 "Add custom domain"
   - 按照指示設定 DNS

### 方案 C：Vercel

**優點**：部署快速、自動 HTTPS、全球 CDN、優異效能

**步驟**：

1. **註冊 Vercel 帳號**
   - 前往 [vercel.com](https://vercel.com)
   - 使用 GitHub 帳號登入

2. **匯入專案**
   - 點擊 "Add New Project"
   - 選擇 GitHub repository
   - Vercel 會自動偵測設定
   - 點擊 Deploy

3. **自動部署**
   - 之後每次 push 到 GitHub 都會自動重新部署

### 方案 D：Cloudflare Pages

**優點**：免費、無限制請求、全球 CDN、快速

**步驟**：

1. **註冊 Cloudflare 帳號**
   - 前往 [cloudflare.com](https://cloudflare.com)
   - 註冊或登入帳號

2. **建立 Pages 專案**
   - 前往 Dashboard → Pages
   - 點擊 "Create a project"
   - 連接 GitHub repository 或直接上傳檔案

3. **設定部署**
   - 選擇 repository
   - Build command 留空（純靜態網站）
   - Build output directory 設為 `/`
   - 點擊 Save and Deploy

## ✅ 部署後檢查

部署完成後，請檢查以下項目：

- [ ] 遊戲可以正常載入
- [ ] 所有功能正常運作
- [ ] 行動裝置顯示正常
- [ ] Favicon 正確顯示
- [ ] 社群分享預覽圖正確顯示（可在 [Facebook Debugger](https://developers.facebook.com/tools/debug/) 測試）
- [ ] HTTPS 正常運作
- [ ] 載入速度可接受

## 🔍 效能優化建議

1. **啟用 CDN 快取**：大多數託管服務會自動處理
2. **壓縮檔案**：HTML/CSS/JS 檔案可進一步壓縮（但 CDN 通常會自動處理）
3. **圖片優化**：如果有圖片，使用 WebP 格式並壓縮
4. **快取策略**：設定適當的 Cache-Control headers

## 🐛 常見問題

### Q: 部署後遊戲無法載入？
A: 檢查瀏覽器 Console 是否有錯誤，確認所有外部 CDN 連結正常。

### Q: Favicon 沒有顯示？
A: 清除瀏覽器快取，或等待幾分鐘讓 CDN 更新。

### Q: 社群分享預覽圖不正確？
A: 使用 [Facebook Debugger](https://developers.facebook.com/tools/debug/) 或 [Twitter Card Validator](https://cards-dev.twitter.com/validator) 清除快取。

### Q: 如何更新已部署的網站？
A: 
- GitHub Pages：push 到 GitHub 後自動更新（可能需要幾分鐘）
- Netlify/Vercel：push 到 GitHub 後自動重新部署
- 手動部署：重新上傳檔案

## 📞 需要幫助？

如有部署問題，請檢查：
1. 瀏覽器 Console 錯誤訊息
2. 託管服務的部署日誌
3. 網路連線是否正常

---

**祝部署順利！** 🎉

