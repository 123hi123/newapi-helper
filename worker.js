// NewAPI Worker 操作工具
// 這個工具用於操作 NewAPI，支持查詢渠道詳情
// 所有敏感資料都保存在用戶端，確保安全性

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// 主要處理函數
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 處理靜態資源（HTML、CSS、JS）
  if (path === '/' || path === '') {
    return renderMainPage();
  } else if (path === '/api/proxy') {
    // 代理 API 請求
    return await handleAPIProxy(request);
  } else {
    return new Response('未找到頁面', { status: 404 });
  }
}

// API 代理處理函數
async function handleAPIProxy(request) {
  if (request.method !== 'POST') {
    return new Response('僅支持 POST 請求', { status: 405 });
  }

  try {
    // 解析請求體
    const { api_url, access_token, endpoint, method, params, body } = await request.json();
    
    if (!api_url || !access_token) {
      return new Response(JSON.stringify({ error: '缺少必要的參數' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 構建請求選項
    const fetchOptions = {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'New-Api-User': '1',
        'Content-Type': 'application/json',
      },
    };

    // 添加請求體
    if (method === 'POST' || method === 'PUT') {
      fetchOptions.body = JSON.stringify(body || {});
    }

    // 構建目標 URL
    let targetUrl = `${api_url}${endpoint}`;
    
    // 處理 GET 請求參數
    if (method === 'GET' && params) {
      const searchParams = new URLSearchParams();
      for (const key in params) {
        searchParams.append(key, params[key]);
      }
      targetUrl += `?${searchParams.toString()}`;
    }

    // 發送請求到實際的 API
    const response = await fetch(targetUrl, fetchOptions);
    const responseData = await response.json();

    // 返回結果
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `處理請求時發生錯誤: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 渲染主頁面
function renderMainPage() {
  // JavaScript 代碼部分，用來處理前端邏輯
  const scriptCode = `
    // 初始化變數
    let channelData = [];
    let currentChannelDetails = null;
    
    // DOM 元素引用
    const apiUrlInput = document.getElementById('api-url');
    const accessTokenInput = document.getElementById('access-token');
    const saveCredentialsBtn = document.getElementById('save-credentials');
    const clearCredentialsBtn = document.getElementById('clear-credentials');
    const credentialsStatus = document.getElementById('credentials-status');
    const getChannelsBtn = document.getElementById('get-channels');
    const channelSelectorGroup = document.getElementById('channel-selector-group');
    const channelSearchInput = document.getElementById('channel-search');
    const channelSelect = document.getElementById('channel-select');
    const getDetailsBtn = document.getElementById('get-details');
    const detailsSection = document.getElementById('channel-details-section');
    const detailsContainer = document.getElementById('channel-details-container');
    const statusElement = document.getElementById('status');
    
    // 加載保存的憑證
    function loadCredentials() {
      const apiUrl = localStorage.getItem('newapi_url');
      const accessToken = localStorage.getItem('newapi_token');
      
      if (apiUrl) apiUrlInput.value = apiUrl;
      if (accessToken) accessTokenInput.value = accessToken;
      
      if (apiUrl && accessToken) {
        credentialsStatus.textContent = '已載入儲存的憑證';
        setTimeout(() => {
          credentialsStatus.textContent = '';
        }, 3000);
      }
    }
    
    // 儲存憑證
    saveCredentialsBtn.addEventListener('click', () => {
      const apiUrl = apiUrlInput.value.trim();
      const accessToken = accessTokenInput.value.trim();
      
      if (!apiUrl || !accessToken) {
        alert('請輸入 API URL 和 Access Token');
        return;
      }
      
      localStorage.setItem('newapi_url', apiUrl);
      localStorage.setItem('newapi_token', accessToken);
      
      credentialsStatus.textContent = '憑證已儲存';
      setTimeout(() => {
        credentialsStatus.textContent = '';
      }, 3000);
    });
    
    // 清除憑證
    clearCredentialsBtn.addEventListener('click', () => {
      localStorage.removeItem('newapi_url');
      localStorage.removeItem('newapi_token');
      
      apiUrlInput.value = '';
      accessTokenInput.value = '';
      
      credentialsStatus.textContent = '憑證已清除';
      setTimeout(() => {
        credentialsStatus.textContent = '';
      }, 3000);
    });
    
    // 更新狀態
    function updateStatus(message) {
      statusElement.textContent = message;
    }
    
    // 顯示錯誤
    function showError(message) {
      updateStatus("錯誤: " + message);
      console.error(message);
    }
    
    // 發送 API 請求
    async function callAPI(endpoint, method = 'GET', params = {}, body = {}) {
      const apiUrl = localStorage.getItem('newapi_url') || apiUrlInput.value.trim();
      const accessToken = localStorage.getItem('newapi_token') || accessTokenInput.value.trim();
      
      if (!apiUrl || !accessToken) {
        showError('請輸入 API URL 和 Access Token');
        return null;
      }
      
      try {
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_url: apiUrl,
            access_token: accessToken,
            endpoint,
            method,
            params,
            body,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error("API 請求失敗: " + (data.error || response.statusText));
        }
        
        return data;
      } catch (error) {
        showError("API 請求失敗: " + error.message);
        return null;
      }
    }
    
    // 模糊搜索功能
    function fuzzySearch(searchTerm, items) {
      searchTerm = searchTerm.toLowerCase();
      return items.filter(item => {
        const id = String(item.id).toLowerCase();
        const name = (item.name || '').toLowerCase();
        return id.includes(searchTerm) || name.includes(searchTerm);
      });
    }
    
    // 根據搜索輸入過濾渠道選項
    function filterChannelOptions() {
      const searchTerm = channelSearchInput.value.trim();
      
      if (!searchTerm) {
        updateChannelOptions(channelData);
        return;
      }
      
      const filteredChannels = fuzzySearch(searchTerm, channelData);
      updateChannelOptions(filteredChannels);
      
      updateStatus('找到 ' + filteredChannels.length + ' 個匹配渠道');
    }
    
    // 更新渠道選項列表
    function updateChannelOptions(channels) {
      channelSelect.innerHTML = '';
      
      channels.forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = channel.id + ' - ' + (channel.name || '未命名');
        channelSelect.appendChild(option);
      });
      
      if (channels.length > 0) {
        channelSelect.selectedIndex = 0;
      }
    }
    
    // 搜索框輸入事件
    channelSearchInput.addEventListener('input', filterChannelOptions);
    
    // 獲取渠道列表
    getChannelsBtn.addEventListener('click', async () => {
      updateStatus('正在獲取渠道列表...');
      getChannelsBtn.disabled = true;
      
      try {
        const result = await callAPI('/api/channel/', 'GET', {
          p: 0,
          page_size: 1000,
          id_sort: true
        });
        
        if (!result || !result.data || result.data.length === 0) {
          updateStatus('沒有找到渠道數據');
          getChannelsBtn.disabled = false;
          return;
        }
        
        channelData = result.data;
        
        updateChannelOptions(channelData);
        
        channelSearchInput.value = '';
        
        channelSelectorGroup.classList.remove('hidden');
        updateStatus('已獲取 ' + channelData.length + ' 個渠道');
      } catch (error) {
        showError('獲取渠道列表失敗: ' + error.message);
      } finally {
        getChannelsBtn.disabled = false;
      }
    });
    
    // 獲取渠道詳細資訊
    getDetailsBtn.addEventListener('click', async () => {
      const channelId = channelSelect.value;
      
      if (!channelId) {
        alert('請先選擇一個渠道');
        return;
      }
      
      updateStatus('正在獲取渠道詳細資訊...');
      getDetailsBtn.disabled = true;
      detailsContainer.innerHTML = '';
      detailsSection.classList.remove('hidden');
      
      try {
        await getChannelDetails(channelId);
      } finally {
        getDetailsBtn.disabled = false;
      }
    });
    
    // 獲取渠道詳細資訊
    async function getChannelDetails(channelId) {
      try {
        // 注意這裡使用 PUT 方法，並在請求體中提供 id
        const result = await callAPI('/api/channel', 'PUT', {}, {
          id: parseInt(channelId)
        });
        
        if (!result || !result.data) {
          detailsContainer.textContent = '無法獲取渠道詳細資訊';
          updateStatus('獲取渠道詳細資訊失敗');
          return;
        }
        
        currentChannelDetails = result.data;
        
        // 顯示渠道詳細資訊
        displayChannelDetails(currentChannelDetails);
        
        updateStatus("已獲取渠道詳細資訊");
      } catch (error) {
        detailsContainer.textContent = '獲取渠道詳細資訊時發生錯誤: ' + error.message;
        showError("獲取渠道詳細資訊失敗: " + error.message);
      }
    }
    
    // 顯示渠道詳細資訊
    function displayChannelDetails(details) {
      detailsContainer.innerHTML = '';
      
      if (!details) {
        detailsContainer.textContent = '沒有可顯示的詳細資訊';
        return;
      }
      
      const table = document.createElement('table');
      table.className = 'details-table';
      
      // 創建表格標題欄
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      const keyHeader = document.createElement('th');
      keyHeader.textContent = '屬性';
      headerRow.appendChild(keyHeader);
      
      const valueHeader = document.createElement('th');
      valueHeader.textContent = '值 (點擊複製)';
      headerRow.appendChild(valueHeader);
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // 創建表格主體
      const tbody = document.createElement('tbody');
      
      // 處理每個鍵值對
      Object.entries(details).forEach(([key, value]) => {
        const row = document.createElement('tr');
        
        const keyCell = document.createElement('td');
        keyCell.className = 'key-cell';
        keyCell.textContent = key;
        row.appendChild(keyCell);
        
        const valueCell = document.createElement('td');
        valueCell.className = 'value-cell clickable-cell';
        
        let textToCopy = value;
        
        // 特殊處理不同類型的值
        if (value === null || value === undefined) {
          valueCell.textContent = '(空值)';
          textToCopy = '';
        } else if (typeof value === 'object') {
          try {
            // 對於對象類型，顯示為格式化的 JSON
            const formattedValue = JSON.stringify(value, null, 2);
            valueCell.innerHTML = '<pre>' + escapeHtml(formattedValue) + '</pre>';
            textToCopy = formattedValue;
          } catch (e) {
            valueCell.textContent = String(value);
          }
        } else if (key === 'key' || key === 'private_key' || key.includes('token')) {
          // 對於敏感資訊
          const valueSpan = document.createElement('span');
          
          // 如果是可能的 JSON 字符串，嘗試格式化它
          if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
            try {
              const parsedJson = JSON.parse(value);
              const formattedJson = JSON.stringify(parsedJson, null, 2);
              valueSpan.innerHTML = '<pre>' + escapeHtml(formattedJson) + '</pre>';
              textToCopy = formattedJson;
            } catch (e) {
              // 不是有效的 JSON，顯示原始值
              valueSpan.textContent = value;
            }
          } else {
            valueSpan.textContent = value;
          }
          
          valueCell.appendChild(valueSpan);
        } else {
          // 對於普通字符串值
          if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
            // 嘗試解析 JSON 字符串並格式化
            try {
              const parsedJson = JSON.parse(value);
              const formattedJson = JSON.stringify(parsedJson, null, 2);
              valueCell.innerHTML = '<pre>' + escapeHtml(formattedJson) + '</pre>';
              textToCopy = formattedJson;
            } catch (e) {
              valueCell.textContent = value;
            }
          } else {
            valueCell.textContent = value;
          }
        }
        
        // 為值單元格添加點擊複製功能
        valueCell.addEventListener('click', () => {
          navigator.clipboard.writeText(textToCopy)
            .then(() => {
              // 添加複製成功的視覺效果
              valueCell.classList.add('copied');
              setTimeout(() => {
                valueCell.classList.remove('copied');
              }, 1000);
              
              updateStatus('已複製值到剪貼板');
            })
            .catch(err => {
              showError("複製失敗: " + err.message);
            });
        });
        
        row.appendChild(valueCell);
        tbody.appendChild(row);
      });
      
      table.appendChild(tbody);
      detailsContainer.appendChild(table);
      
      // 添加複製所有詳情的按鈕
      const copyDetailsBtn = document.createElement('button');
      copyDetailsBtn.textContent = '複製所有詳情';
      copyDetailsBtn.className = 'copy-details-btn';
      copyDetailsBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(details, null, 2))
          .then(() => {
            updateStatus('已複製所有詳情到剪貼板');
          })
          .catch(err => {
            showError("複製失敗: " + err.message);
          });
      });
      
      detailsContainer.appendChild(document.createElement('br'));
      detailsContainer.appendChild(copyDetailsBtn);
    }
    
    // HTML 轉義函數
    function escapeHtml(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
    
    // 初始化
    loadCredentials();
  `;

  // HTML 內容
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NewAPI Worker 工具</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 20px;
    }
    .section {
      margin-bottom: 30px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    .section-title {
      margin-top: 0;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee;
    }
    .form-group {
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }
    .form-group label {
      min-width: 100px;
      margin-right: 10px;
    }
    .form-group input, .form-group select {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .search-group {
      display: flex;
      margin-bottom: 10px;
    }
    .search-group input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    select.channel-select {
      width: 100%;
      height: 200px;
      margin-bottom: 10px;
    }
    button {
      background-color: #4a69bd;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 5px;
    }
    button:hover {
      background-color: #3a599f;
    }
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .details-container {
      margin-top: 20px;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 4px;
      max-height: 500px;
      overflow-y: auto;
      white-space: pre-wrap;
      background-color: #f9f9f9;
    }
    .status {
      margin-top: 10px;
      padding: 8px;
      background-color: #f0f0f0;
      border-radius: 4px;
    }
    .hidden {
      display: none;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table th, .details-table td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }
    .details-table th {
      background-color: #f2f2f2;
    }
    .key-cell {
      width: 20%;
      font-weight: bold;
    }
    .value-cell {
      position: relative;
      padding-right: 10px;
    }
    .value-cell pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .clickable-cell {
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    .clickable-cell:hover {
      background-color: #f0f0f0;
    }
    .clickable-cell.copied {
      background-color: #d4edda;
    }
    .clickable-cell::after {
      content: '點擊複製';
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      color: #6c757d;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .clickable-cell:hover::after {
      opacity: 1;
    }
    .copy-btn {
      position: absolute;
      right: 5px;
      top: 5px;
      padding: 3px 8px;
      font-size: 12px;
      background-color: #5cb85c;
    }
    .copy-details-btn {
      margin-top: 10px;
      background-color: #5cb85c;
    }
    .channel-selection-container {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>NewAPI Worker 工具</h1>
    
    <div class="section">
      <h2 class="section-title">API 設定</h2>
      <div class="form-group">
        <label for="api-url">API URL:</label>
        <input type="text" id="api-url" placeholder="例如: https://api.example.com">
      </div>
      <div class="form-group">
        <label for="access-token">Access Token:</label>
        <input type="password" id="access-token" placeholder="輸入您的 Access Token">
      </div>
      <div class="form-group">
        <button id="save-credentials">儲存憑證</button>
        <button id="clear-credentials">清除憑證</button>
        <span id="credentials-status"></span>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">渠道列表</h2>
      <div class="form-group">
        <button id="get-channels">獲取渠道列表</button>
      </div>
      <div class="form-group hidden" id="channel-selector-group">
        <div class="channel-selection-container">
          <div class="search-group">
            <input type="text" id="channel-search" placeholder="搜索渠道 (ID 或名稱)...">
          </div>
          <select id="channel-select" class="channel-select" size="10"></select>
          <button id="get-details">獲取詳情</button>
        </div>
      </div>
    </div>
    
    <div class="section hidden" id="channel-details-section">
      <h2 class="section-title">渠道詳細資訊</h2>
      <div id="channel-details-container" class="details-container"></div>
    </div>
    
    <div id="status" class="status">準備就緒</div>
  </div>

  <script>${scriptCode}</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
    },
  });
} 