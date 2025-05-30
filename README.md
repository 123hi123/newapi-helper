# 🚀 NewAPI Worker 工具

這是一個基於 Cloudflare Workers 的現代化 PWA 工具，採用兩欄式響應設計，用於安全地操作 NewAPI，特別是查詢渠道詳細資訊。採用智能緩存機制，提供桌面級的用戶體驗。所有敏感憑證資料都僅保存在使用者的瀏覽器本地存儲中，確保資料安全性。

<div align="center">

![PWA](https://img.shields.io/badge/PWA-Ready-purple?style=for-the-badge&logo=pwa&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

</div>

## 📑 目錄

- [🚀 NewAPI Worker 工具](#-newapi-worker-工具)
  - [📑 目錄](#-目錄)
  - [📋 部署指南](#-部署指南)
    - [🔧 部署到 Cloudflare Workers](#-部署到-cloudflare-workers)
    - [⚡ 快速部署方式](#-快速部署方式)
  - [📝 使用方法](#-使用方法)
    - [🌐 訪問工具](#-訪問工具)
    - [🔐 配置 NewAPI 憑證](#-配置-newapi-憑證)
    - [🔍 查詢渠道信息](#-查詢渠道信息)
  - [✨ 功能特色](#-功能特色)
    - [🛡️ 安全性](#️-安全性)
    - [🎨 使用體驗](#-使用體驗)
    - [📊 資料處理](#-資料處理)
    - [💾 離線功能](#-離線功能)
  - [🔄 更新記錄](#-更新記錄)
  - [⚠️ 注意事項](#️-注意事項)
  - [📄 許可證](#-許可證)

## 📋 部署指南

### 🔧 部署到 Cloudflare Workers

<details>
<summary>點擊展開詳細部署步驟</summary>

1. **📝 註冊 Cloudflare 帳號**
   - 如果尚未擁有 Cloudflare 帳號，請前往 [Cloudflare 官網](https://dash.cloudflare.com/sign-up) 註冊。

2. **⬇️ 安裝 Wrangler CLI 工具**
   - Wrangler 是 Cloudflare 官方提供的命令行工具，用於部署 Workers。
   - 使用 npm 安裝：
   ```bash
   npm install -g @cloudflare/wrangler
   ```

3. **🔑 登入 Wrangler**
   - 在終端機執行：
   ```bash
   wrangler login
   ```
   - 按照彈出的瀏覽器指示進行授權。

4. **📁 初始化項目**
   - 創建一個新資料夾並初始化項目：
   ```bash
   mkdir newapi-worker && cd newapi-worker
   wrangler init
   ```
   - 選擇「從頭開始」選項。

5. **⚙️ 配置 wrangler.toml**
   - 編輯生成的 `wrangler.toml` 文件，設定您的項目名稱：
   ```toml
   name = "newapi-worker"
   main = "worker.js"
   compatibility_date = "2023-06-28"

   [triggers]
   routes = [{ pattern = "你的域名", custom_domain = true }]
   ```
   - 如果不使用自定義域名，可以刪除 `[triggers]` 部分。

6. **📤 部署代碼**
   - 將本專案的 `worker.js` 檔案複製到您的項目資料夾中。
   - 執行部署命令：
   ```bash
   wrangler publish
   ```

7. **🔗 獲取 Worker 網址**
   - 部署成功後，終端機會顯示您的 Worker 訪問網址，通常格式為：
   ```
   https://newapi-worker.您的用戶名.workers.dev
   ```
   - 記錄此網址以便後續使用。

</details>

### ⚡ 快速部署方式

> 💡 **提示**：此方法適合快速試用，無需安裝任何工具。

<ol>
  <li>登入 <a href="https://dash.cloudflare.com/">Cloudflare Dashboard</a></li>
  <li>進入 "Workers & Pages" 部分</li>
  <li>點擊 "Create Application"</li>
  <li>選擇 "Create Worker"</li>
  <li>在編輯界面中，刪除所有默認代碼</li>
  <li>貼入本專案的 <code>worker.js</code> 內容</li>
  <li>點擊 "Save and Deploy"</li>
  <li>使用分配的網址訪問您的應用</li>
</ol>

## 📝 使用方法

### 🌐 訪問工具

1. 使用瀏覽器訪問您部署好的 Worker 網址。

### 🔐 配置 NewAPI 憑證

<table>
<tr>
<td>
  
**準備 NewAPI 憑證** 🗝️
- 您需要有效的 NewAPI URL 和 Access Token。
- 如果沒有這些資訊，請聯繫您的 NewAPI 管理員。
  
</td>
<td>
  
**在工具中填入憑證** 📝
- 在界面的 "API 設定" 區塊中：
  - API URL：輸入您的 NewAPI 完整 URL
  - Access Token：輸入您的 API 訪問令牌
- 點擊「儲存憑證」按鈕保存到本地存儲
  
</td>
</tr>
</table>

### 🔍 查詢渠道信息

```mermaid
graph TD
    A[獲取渠道列表] -->|點擊按鈕| B[顯示渠道列表]
    B --> C{需要搜索特定渠道?}
    C -->|是| D[使用搜索框過濾]
    C -->|否| E[直接選擇渠道]
    D --> E
    E --> F[點擊獲取詳情]
    F --> G[查看渠道詳細資訊]
    G --> H{需要複製資訊?}
    H -->|複製單項| I[點擊表格中的值]
    H -->|複製全部| J[點擊複製所有詳情]
```

1. **📋 獲取渠道列表**
   - 點擊「獲取渠道列表」按鈕，工具會從 API 獲取所有可用渠道。
   - 渠道列表會顯示在下拉選擇框中。

2. **🔎 搜索特定渠道**
   - 在搜索框中輸入渠道 ID 或名稱的一部分，可以立即過濾渠道列表。
   - 支持模糊搜索，只需輸入部分關鍵字即可。

3. **📊 查看渠道詳情**
   - 從列表中選擇一個渠道。
   - 點擊「獲取詳情」按鈕。
   - 渠道的詳細資訊會以表格形式顯示。

4. **📋 複製資訊**
   - 點擊表格中的任何值單元格可以直接複製該值到剪貼板。
   - 複製成功時會有視覺反饋和狀態提示。
   - 點擊「複製所有詳情」按鈕可以一次性複製所有渠道詳情為 JSON 格式。

## ✨ 功能特色

### 🛡️ 安全性

- **🔒 本地資料存儲**：所有敏感憑證僅存儲在用戶的瀏覽器中，不在伺服器保存任何敏感資訊。
- **🔄 代理請求**：通過 Cloudflare Worker 代理 API 請求，避免跨域問題並提升安全性。

### 🎨 使用體驗

- **📱 響應式設計**：適應不同螢幕尺寸的裝置。
- **🧭 直觀操作**：清晰的界面和操作流程。
- **🔍 模糊搜索**：快速找到需要的渠道，支持 ID 和名稱搜索。
- **🖱️ 一鍵複製**：點擊表格中的任何值即可複製，無需選擇文本或使用額外按鈕。
- **✅ 視覺反饋**：複製操作提供明確的視覺反饋。

### 📊 資料處理

- **🧿 格式化顯示**：JSON 數據會被自動格式化，提高可讀性。
- **📚 大型列表支持**：能夠處理和搜索上千個渠道。
- **⚡ 即時過濾**：輸入關鍵字時立即過濾結果。

### 💾 離線功能

- **💡 憑證記憶**：可選擇將憑證保存在本地，下次訪問自動填充。
- **🧹 清除憑證**：提供簡單的方式清除保存的憑證。

## 🔄 更新記錄

### v2.0.0 - PWA風格重大更新 (2024-12-19)

<details>
<summary><strong>🎨 PWA風格UI重設計</strong> - 點擊展開詳情</summary>

#### 📐 布局架構革新
- **🖥️ 兩欄式布局**：針對桌面和筆電優化的左右分欄設計
  - **左側面板 (480px)**：API設定 + 渠道管理控制區
  - **右側面板 (響應式)**：專門的渠道詳情展示區域
- **📱 響應式設計**：平板和手機自動切換為垂直布局
- **🔍 智能適配**：根據屏幕尺寸自動調整界面元素

#### 🎨 視覺設計提升
- **🌈 現代化配色**：藍紫色漸變主題，提升視覺美感
- **🔤 字體優化**：採用系統字體棧 (-apple-system, BlinkMacSystemFont)
- **🎯 卡片式設計**：清晰的區塊劃分和層次結構
- **✨ 動畫效果**：淡入動畫、hover效果和狀態過渡

#### 📋 PWA功能支持
- **📱 PWA Meta標籤**：完整的漸進式Web應用配置
- **🎨 主題色彩**：統一的品牌配色方案
- **📲 應用圖標**：支持添加到主屏幕

</details>

<details>
<summary><strong>⚡ 智能緩存系統</strong> - 點擊展開詳情</summary>

#### 🧠 自動載入機制
- **🔄 智能啟動**：有憑證時自動獲取渠道列表
- **⚡ 預緩存技術**：自動預緩存前10個渠道的詳情數據
- **💾 本地存儲**：利用瀏覽器緩存提升載入速度
- **🔍 緩存標示**：⚡ 圖標標示已緩存的渠道

#### 📈 性能優化
- **🚀 秒速載入**：緩存渠道的詳情瞬間顯示
- **🌐 網絡優化**：減少不必要的API請求
- **⏱️ 智能延遲**：避免請求過於頻繁的保護機制

</details>

<details>
<summary><strong>🎯 用戶體驗革新</strong> - 點擊展開詳情</summary>

#### 🖱️ 交互體驗優化
- **👆 一鍵查看**：直接點擊渠道項目即可查看詳情，無需額外按鈕
- **🔍 實時搜索**：輸入時即時過濾，顯示匹配結果數量
- **📊 狀態反饋**：即時的狀態指示器和進度顯示
- **🎨 視覺提示**：hover效果和選中狀態的清晰標示

#### 🎛️ 界面控制增強
- **📝 表單優化**：更好的輸入框設計和焦點效果
- **🔘 按鈕升級**：漸變按鈕和禁用狀態的視覺反饋
- **📱 響應觸控**：觸控設備的優化體驗

#### 🎪 新增視覺元素
- **📋 空狀態設計**：美觀的佔位符和引導信息
- **❌ 錯誤狀態**：友好的錯誤提示界面
- **💡 智能提示**：操作指導和功能說明

</details>

<details>
<summary><strong>🔗 功能增強</strong> - 點擊展開詳情</summary>

#### 🌐 GitHub整合
- **🔗 項目連結**：右上角固定的GitHub圖標
- **🎨 動態效果**：hover縮放和陰影效果
- **📱 響應設計**：移動設備的圖標自適應

#### 💾 數據管理優化
- **🏷️ 緩存標識**：視覺化展示哪些渠道已預緩存
- **🔄 智能刷新**：保持數據新鮮度的機制
- **📊 狀態管理**：更精確的載入和錯誤狀態處理

#### 🎨 詳情展示增強
- **📋 表格美化**：更清晰的數據展示格式
- **📱 複製優化**：改進的複製功能和反饋
- **🎯 焦點管理**：更好的鍵盤導航支持

</details>

<details>
<summary><strong>🔧 技術架構優化</strong> - 點擊展開詳情</summary>

#### 💻 代碼結構改進
- **🧹 代碼重構**：模塊化的JavaScript代碼結構
- **🎯 DOM操作優化**：更高效的元素選擇和事件處理
- **🔄 狀態管理**：統一的應用狀態管理機制
- **📝 代碼可維護性**：清晰的函數命名和註釋

#### ⚡ 性能提升
- **🚀 載入速度**：優化的CSS和JavaScript載入
- **💾 內存管理**：更好的緩存策略和內存使用
- **🌐 網絡請求**：智能的API請求管理和錯誤處理
- **📱 移動端優化**：觸控設備的性能優化

#### 🛠️ 開發體驗
- **🔍 調試支持**：更好的錯誤信息和日誌
- **📊 狀態監控**：實時的狀態顯示和反饋
- **🔧 可擴展性**：易於添加新功能的架構設計

</details>

### v1.0.0 - 初始版本
- **🚀 基礎功能**：NewAPI渠道查詢工具
- **🔐 安全設計**：本地憑證存儲
- **🔍 搜索功能**：模糊搜索和過濾
- **📋 複製功能**：一鍵複製渠道資訊

---

## ⚠️ 注意事項

> ⚠️ **安全警告**：請妥善保管您的 API 憑證，不要在公共設備上存儲憑證。

<div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin-bottom: 15px;">
<strong>📌 功能限制</strong><br>
本工具僅提供查詢功能，不支持修改或刪除渠道資訊。
</div>

<div style="background-color: #d1ecf1; padding: 15px; border-radius: 4px; border-left: 4px solid #0dcaf0; margin-bottom: 15px;">
<strong>💡 提示</strong><br>
如遇到權限問題，請確認您的 Access Token 具有適當的權限。
</div>

---

<div align="center">
Made with ❤️ for better API management
</div> 

## 📄 許可證

本專案採用 [MIT 許可證](LICENSE)。你可以自由地使用、修改和分發此程式碼，包括商業用途，只需保留原始著作權聲明。

```
MIT License

Copyright (c) 2024 [你的名稱/組織]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
``` 
