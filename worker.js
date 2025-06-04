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
    let channelDetailsCache = new Map(); // 添加詳情緩存
    let selectedChannelId = null;
    let currentAccountId = null; // 當前賬號ID
    let displayMode = 'channels'; // 顯示模式：'channels' 或 'redemptions'
    
    // DOM 元素引用
    const apiUrlInput = document.getElementById('api-url');
    const accessTokenInput = document.getElementById('access-token');
    const accountNameInput = document.getElementById('account-name');
    const saveCredentialsBtn = document.getElementById('save-credentials');
    const clearCredentialsBtn = document.getElementById('clear-credentials');
    const accountSelector = document.getElementById('account-selector');
    const deleteAccountBtn = document.getElementById('delete-account');
    const credentialsStatus = document.getElementById('credentials-status');
    const getChannelsBtn = document.getElementById('get-channels');
    const channelSelectorGroup = document.getElementById('channel-selector-group');
    const channelSearchInput = document.getElementById('channel-search');
    const channelList = document.getElementById('channel-list');
    const detailsContainer = document.getElementById('channel-details-container');
    const statusElement = document.getElementById('status');
    
    // 優惠碼生成相關元素
    const generateRedemptionBtn = document.getElementById('generate-redemption');
    const redemptionAmountInput = document.getElementById('redemption-amount');
    const redemptionCountInput = document.getElementById('redemption-count');
    
    // 多賬號管理功能
    function getAccounts() {
      const accounts = localStorage.getItem('newapi_accounts');
      return accounts ? JSON.parse(accounts) : {};
    }
    
    function saveAccount(accountId, accountData) {
      const accounts = getAccounts();
      accounts[accountId] = accountData;
      localStorage.setItem('newapi_accounts', JSON.stringify(accounts));
    }
    
    function deleteAccount(accountId) {
      const accounts = getAccounts();
      delete accounts[accountId];
      localStorage.setItem('newapi_accounts', JSON.stringify(accounts));
    }
    
    function getCurrentAccount() {
      const currentId = localStorage.getItem('newapi_current_account');
      if (!currentId) return null;
      
      const accounts = getAccounts();
      return accounts[currentId] || null;
    }
    
    // 加載保存的憑證
    function loadCredentials() {
      updateAccountSelector();
      
      const currentAccount = getCurrentAccount();
      if (currentAccount) {
        apiUrlInput.value = currentAccount.api_url;
        accessTokenInput.value = currentAccount.access_token;
        accountNameInput.value = currentAccount.name;
        currentAccountId = localStorage.getItem('newapi_current_account');
        
        showCredentialsStatus('已載入儲存的憑證: ' + currentAccount.name, 'success');
        
        // 自動獲取渠道列表
        setTimeout(() => {
          autoLoadChannels();
        }, 500);
      }
    }
    
    function updateAccountSelector() {
      const accounts = getAccounts();
      const currentId = localStorage.getItem('newapi_current_account');
      
      accountSelector.innerHTML = '<option value="">選擇賬號...</option>';
      
      Object.entries(accounts).forEach(([id, account]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = account.name;
        option.selected = id === currentId;
        accountSelector.appendChild(option);
      });
      
      deleteAccountBtn.style.display = currentId ? 'inline-flex' : 'none';
    }
    
    // 顯示憑證狀態
    function showCredentialsStatus(message, type = 'success') {
      credentialsStatus.textContent = message;
      credentialsStatus.className = 'status-indicator ' + (type === 'success' ? 'status-success' : 'status-error');
      credentialsStatus.classList.remove('hidden');
      
      setTimeout(() => {
        credentialsStatus.classList.add('hidden');
      }, 3000);
    }
    
    // 自動載入渠道
    async function autoLoadChannels() {
      updateStatus('正在自動載入渠道列表...');
      
      try {
        const result = await callAPI('/api/channel/', 'GET', {
          p: 0,
          page_size: 1000,
          id_sort: true
        });
        
        if (!result || !result.data || result.data.length === 0) {
          updateStatus('沒有找到渠道數據');
          return;
        }
        
        channelData = result.data;
        
        updateChannelList(channelData);
        
        channelSearchInput.value = '';
        
        channelSelectorGroup.classList.remove('hidden');
        updateStatus('已自動載入 ' + channelData.length + ' 個渠道，正在預緩存前10個渠道詳情...');
        
        // 預緩存前10個渠道的詳情
        await precacheChannelDetails();
        
      } catch (error) {
        showError('自動載入渠道列表失敗: ' + error.message);
      }
    }
    
    // 預緩存前10個渠道的詳情
    async function precacheChannelDetails() {
      const topChannels = channelData.slice(0, 10);
      let cached = 0;
      
      for (let i = 0; i < topChannels.length; i++) {
        const channel = topChannels[i];
        try {
          const result = await callAPI('/api/channel', 'PUT', {}, {
            id: parseInt(channel.id)
          });
          
          if (result && result.data) {
            channelDetailsCache.set(channel.id.toString(), result.data);
            cached++;
            updateStatus('已預緩存 ' + cached + '/' + topChannels.length + ' 個渠道詳情');
          }
        } catch (error) {
          console.log('預緩存渠道 ' + channel.id + ' 失敗:', error);
        }
        
        // 添加小延遲避免請求過於頻繁
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      updateStatus('完成！已載入 ' + channelData.length + ' 個渠道，預緩存了 ' + cached + ' 個渠道詳情');
    }
    
    // 儲存憑證
    saveCredentialsBtn.addEventListener('click', () => {
      const apiUrl = apiUrlInput.value.trim();
      const accessToken = accessTokenInput.value.trim();
      const accountName = accountNameInput.value.trim();
      
      if (!apiUrl || !accessToken || !accountName) {
        showCredentialsStatus('請輸入完整的賬號資訊', 'error');
        return;
      }
      
      const accountId = Date.now().toString();
      const accountData = {
        name: accountName,
        api_url: apiUrl,
        access_token: accessToken,
        created_at: new Date().toISOString()
      };
      
      saveAccount(accountId, accountData);
      localStorage.setItem('newapi_current_account', accountId);
      currentAccountId = accountId;
      
      updateAccountSelector();
      showCredentialsStatus('憑證已儲存: ' + accountName, 'success');
      
      // 儲存後自動載入渠道
      setTimeout(() => {
        autoLoadChannels();
      }, 500);
    });
    
    // 賬號切換
    accountSelector.addEventListener('change', () => {
      const selectedAccountId = accountSelector.value;
      
      if (!selectedAccountId) {
        // 清空表單
        apiUrlInput.value = '';
        accessTokenInput.value = '';
        accountNameInput.value = '';
        currentAccountId = null;
        localStorage.removeItem('newapi_current_account');
        
        // 清除緩存和狀態
        channelData = [];
        channelDetailsCache.clear();
        selectedChannelId = null;
        channelSelectorGroup.classList.add('hidden');
        resetDetailsPanel();
        
        deleteAccountBtn.style.display = 'none';
        showCredentialsStatus('已清除當前賬號', 'success');
        return;
      }
      
      const accounts = getAccounts();
      const selectedAccount = accounts[selectedAccountId];
      
      if (selectedAccount) {
        apiUrlInput.value = selectedAccount.api_url;
        accessTokenInput.value = selectedAccount.access_token;
        accountNameInput.value = selectedAccount.name;
        currentAccountId = selectedAccountId;
        localStorage.setItem('newapi_current_account', selectedAccountId);
        
        // 清除舊的緩存和狀態
        channelData = [];
        channelDetailsCache.clear();
        selectedChannelId = null;
        channelSelectorGroup.classList.add('hidden');
        resetDetailsPanel();
        
        deleteAccountBtn.style.display = 'inline-flex';
        showCredentialsStatus('已切換到賬號: ' + selectedAccount.name, 'success');
        
        // 自動載入新賬號的渠道
        setTimeout(() => {
          autoLoadChannels();
        }, 500);
      }
    });
    
    // 刪除賬號
    deleteAccountBtn.addEventListener('click', () => {
      if (!currentAccountId) return;
      
      if (confirm('確定要刪除當前賬號嗎？此操作無法撤銷。')) {
        deleteAccount(currentAccountId);
        localStorage.removeItem('newapi_current_account');
        
        // 清空表單和狀態
        apiUrlInput.value = '';
        accessTokenInput.value = '';
        accountNameInput.value = '';
        currentAccountId = null;
        
        channelData = [];
        channelDetailsCache.clear();
        selectedChannelId = null;
        channelSelectorGroup.classList.add('hidden');
        resetDetailsPanel();
        
        updateAccountSelector();
        showCredentialsStatus('賬號已刪除', 'success');
      }
    });
    
    // 清除憑證（保留向後兼容）
    clearCredentialsBtn.addEventListener('click', () => {
      if (confirm('確定要清除所有賬號嗎？此操作無法撤銷。')) {
        localStorage.removeItem('newapi_accounts');
        localStorage.removeItem('newapi_current_account');
        
        apiUrlInput.value = '';
        accessTokenInput.value = '';
        accountNameInput.value = '';
        currentAccountId = null;
        
        // 清除緩存和狀態
        channelData = [];
        channelDetailsCache.clear();
        selectedChannelId = null;
        channelSelectorGroup.classList.add('hidden');
        
        // 重置詳情面板
        resetDetailsPanel();
        
        updateAccountSelector();
        showCredentialsStatus('所有憑證已清除', 'success');
      }
    });
    
    // 重置詳情面板
    function resetDetailsPanel() {
      detailsContainer.innerHTML = '<div class="details-placeholder"><div class="details-placeholder-icon">📋</div><p style="font-size: 16px; margin-bottom: 8px;">尚未選擇渠道</p><p style="font-size: 14px;">請從左側選擇一個渠道以查看詳細資訊</p></div>';
    }
    
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
      const currentAccount = getCurrentAccount();
      const apiUrl = currentAccount?.api_url || apiUrlInput.value.trim();
      const accessToken = currentAccount?.access_token || accessTokenInput.value.trim();
      
      if (!apiUrl || !accessToken) {
        showError('請選擇賬號或輸入 API URL 和 Access Token');
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
        updateChannelList(channelData);
        updateStatus('顯示所有 ' + channelData.length + ' 個渠道');
        return;
      }
      
      const filteredChannels = fuzzySearch(searchTerm, channelData);
      updateChannelList(filteredChannels);
      
      updateStatus('找到 ' + filteredChannels.length + ' 個匹配渠道');
    }
    
    // 更新渠道列表
    function updateChannelList(channels) {
      channelList.innerHTML = '';
      
      if (channels.length === 0) {
        channelList.innerHTML = '<div style="padding: 20px; text-align: center; color: #9ca3af;">沒有找到匹配的渠道</div>';
        return;
      }
      
      channels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.dataset.channelId = channel.id;
        
        // 檢查是否有緩存，添加視覺提示
        const isCached = channelDetailsCache.has(channel.id.toString());
        const cacheIndicator = isCached ? '<span class="cache-indicator">⚡</span>' : '';
        
        channelItem.innerHTML = '<div class="channel-id">' + channel.id + cacheIndicator + '</div><div class="channel-name">' + (channel.name || '未命名') + '</div>';
        
        // 添加點擊事件
        channelItem.addEventListener('click', () => {
          handleChannelClick(channel.id);
        });
        
        channelList.appendChild(channelItem);
      });
    }
    
    // 處理渠道點擊事件
    async function handleChannelClick(channelId) {
      // 更新選中狀態
      document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('selected');
      });
      
      const selectedItem = document.querySelector('[data-channel-id="' + channelId + '"]');
      if (selectedItem) {
        selectedItem.classList.add('selected');
      }
      
      selectedChannelId = channelId;
      updateStatus('正在載入渠道詳細資訊...');
      
      // 先檢查緩存
      if (channelDetailsCache.has(channelId.toString())) {
        const cachedDetails = channelDetailsCache.get(channelId.toString());
        displayChannelDetails(cachedDetails);
        updateStatus('已從緩存載入渠道詳細資訊 ⚡');
        return;
      }
      
      // 如果沒有緩存，則請求詳情
      try {
        await getChannelDetails(channelId);
      } catch (error) {
        showError('載入渠道詳情失敗: ' + error.message);
      }
    }
    
    // 搜索框輸入事件
    channelSearchInput.addEventListener('input', filterChannelOptions);
    
    // 手動獲取渠道列表按鈕（保留向後兼容）
    getChannelsBtn.addEventListener('click', async () => {
      updateStatus('正在重新獲取渠道列表...');
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
        
        updateChannelList(channelData);
        
        channelSearchInput.value = '';
        
        channelSelectorGroup.classList.remove('hidden');
        updateStatus('已重新獲取 ' + channelData.length + ' 個渠道');
      } catch (error) {
        showError('獲取渠道列表失敗: ' + error.message);
      } finally {
        getChannelsBtn.disabled = false;
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
          detailsContainer.innerHTML = '<div class="details-placeholder"><div class="details-placeholder-icon">❌</div><p style="font-size: 16px; margin-bottom: 8px;">無法獲取渠道詳細資訊</p><p style="font-size: 14px;">請檢查網絡連接或API設定</p></div>';
          updateStatus('獲取渠道詳細資訊失敗');
          return;
        }
        
        currentChannelDetails = result.data;
        
        // 緩存詳情數據
        channelDetailsCache.set(channelId.toString(), result.data);
        
        // 顯示渠道詳細資訊
        displayChannelDetails(currentChannelDetails);
        
        updateStatus("已獲取渠道詳細資訊");
      } catch (error) {
        detailsContainer.innerHTML = '<div class="details-placeholder"><div class="details-placeholder-icon">❌</div><p style="font-size: 16px; margin-bottom: 8px;">獲取渠道詳細資訊時發生錯誤</p><p style="font-size: 14px;">' + error.message + '</p></div>';
        showError("獲取渠道詳細資訊失敗: " + error.message);
      }
    }
    
    // 優惠碼生成功能
    generateRedemptionBtn.addEventListener('click', async () => {
      const amount = parseFloat(redemptionAmountInput.value);
      const count = parseInt(redemptionCountInput.value);
      
      if (!amount || amount <= 0) {
        showError('請輸入有效的額度（美金）');
        return;
      }
      
      if (!count || count <= 0) {
        showError('請輸入有效的數量');
        return;
      }
      
      // 轉換美金為quota（1美金 = 500000 quota）
      const quota = Math.round(amount * 500000);
      
      generateRedemptionBtn.disabled = true;
      generateRedemptionBtn.innerHTML = '<div class="loading"></div> 生成中...';
      updateStatus('正在生成優惠碼...');
      
      try {
        const result = await callAPI('/api/redemption/', 'POST', {}, {
          name: 'rdp',
          quota: quota,
          count: count
        });
        
        if (result && result.data) {
          displayMode = 'redemptions';
          displayRedemptionCodes(result.data, amount, count);
          updateStatus('成功生成 ' + count + ' 個優惠碼');
        } else {
          showError('生成優惠碼失敗：無效的回應數據');
        }
      } catch (error) {
        showError('生成優惠碼失敗: ' + error.message);
      } finally {
        generateRedemptionBtn.disabled = false;
        generateRedemptionBtn.innerHTML = '🎫 生成優惠碼';
      }
    });
    
    // 顯示優惠碼結果
    function displayRedemptionCodes(codes, amount, count) {
      detailsContainer.innerHTML = '';
      
      const header = document.createElement('div');
      header.style.cssText = 'margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 8px;';
      header.innerHTML = '<h3 style="margin: 0; font-size: 18px;">✅ 優惠碼生成成功</h3><p style="margin: 8px 0 0; font-size: 14px;">生成了 ' + count + ' 個價值 $' + amount + ' 的優惠碼</p>';
      detailsContainer.appendChild(header);
      
      const codesContainer = document.createElement('div');
      codesContainer.style.cssText = 'background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);';
      
      const title = document.createElement('h4');
      title.textContent = '優惠碼列表';
      title.style.cssText = 'margin: 0 0 16px; color: #1f2937; font-size: 16px;';
      codesContainer.appendChild(title);
      
      const codesList = document.createElement('div');
      codesList.style.cssText = 'font-family: monospace; font-size: 14px; line-height: 1.8; background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb;';
      
      if (Array.isArray(codes)) {
        codesList.textContent = codes.join('\\n');
      } else {
        codesList.textContent = codes;
      }
      
      codesContainer.appendChild(codesList);
      
      // 添加複製按鈕
      const copyButton = document.createElement('button');
      copyButton.textContent = '📋 複製所有優惠碼';
      copyButton.className = 'btn btn-primary';
      copyButton.style.cssText = 'margin-top: 16px; width: 100%;';
      copyButton.addEventListener('click', () => {
        const textToCopy = Array.isArray(codes) ? codes.join('\\n') : codes;
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            updateStatus('已複製所有優惠碼到剪貼板 📋');
          })
          .catch(err => {
            showError("複製失敗: " + err.message);
          });
      });
      
      codesContainer.appendChild(copyButton);
      
      // 添加返回渠道檢視按鈕
      const backButton = document.createElement('button');
      backButton.textContent = '🔙 返回渠道檢視';
      backButton.className = 'btn btn-secondary';
      backButton.style.cssText = 'margin-top: 12px; width: 100%;';
      backButton.addEventListener('click', () => {
        displayMode = 'channels';
        if (selectedChannelId) {
          handleChannelClick(selectedChannelId);
        } else {
          resetDetailsPanel();
        }
      });
      
      codesContainer.appendChild(backButton);
      detailsContainer.appendChild(codesContainer);
    }
    
    // 顯示渠道詳細資訊
    function displayChannelDetails(details) {
      detailsContainer.innerHTML = '';
      
      if (!details) {
        resetDetailsPanel();
        return;
      }
      
      const table = document.createElement('table');
      table.className = 'details-table fade-in';
      
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
        valueCell.className = 'value-cell';
        
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
              
              updateStatus('已複製值到剪貼板 📋');
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
      const copyAllButton = document.createElement('div');
      copyAllButton.style.cssText = 'margin-top: 20px; text-align: center;';
      
      const copyDetailsBtn = document.createElement('button');
      copyDetailsBtn.textContent = '📋 複製所有詳情';
      copyDetailsBtn.className = 'btn btn-primary';
      copyDetailsBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(details, null, 2))
          .then(() => {
            updateStatus('已複製所有詳情到剪貼板 📋');
          })
          .catch(err => {
            showError("複製失敗: " + err.message);
          });
      });
      
      copyAllButton.appendChild(copyDetailsBtn);
      detailsContainer.appendChild(copyAllButton);
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
    
    // 動態生成PWA Manifest
    function createManifest() {
      const manifest = {
        name: "NewAPI Helper",
        short_name: "NewAPI",
        description: "NewAPI 渠道管理工具，支持智能緩存和快速查詢",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f7fa",
        theme_color: "#4a69bd",
        icons: [
          {
            src: "https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      };
      
      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(manifestBlob);
      
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = manifestURL;
      document.head.appendChild(manifestLink);
    }
    
    // 在頁面載入完成後創建manifest
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createManifest);
    } else {
      createManifest();
    }
  `;

  // HTML 內容
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NewAPI Worker 工具</title>
  
  <!-- 應用圖標 -->
  <link rel="icon" type="image/png" href="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  <link rel="shortcut icon" type="image/png" href="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  <link rel="apple-touch-icon" href="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  <link rel="apple-touch-icon" sizes="152x152" href="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  <link rel="apple-touch-icon" sizes="180x180" href="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  <link rel="apple-touch-icon" sizes="167x167" href="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  
  <!-- PWA Meta Tags -->
  <meta name="description" content="NewAPI 渠道管理工具，支持智能緩存和快速查詢">
  <meta name="theme-color" content="#4a69bd">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="NewAPI Helper">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="application-name" content="NewAPI Helper">
  <meta name="msapplication-TileColor" content="#4a69bd">
  <meta name="msapplication-TileImage" content="https://5fddeabb.cloudflare-imgbed-42c.pages.dev/file/1748520079762_image.png">
  
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      background-color: #f5f7fa;
      color: #2c3e50;
      overflow-x: hidden;
    }

    /* GitHub 圖標樣式 */
    .github-link {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background-color: #24292e;
      border-radius: 50%;
      padding: 12px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-decoration: none;
    }
    
    .github-link:hover {
      background-color: #1c2327;
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }
    
    .github-link svg {
      width: 24px;
      height: 24px;
      fill: white;
      display: block;
    }

    /* 主容器 - 兩列布局 */
    .app-container {
      display: flex;
      min-height: 100vh;
      max-height: 100vh;
    }

    /* 左側面板 - 設定和控制 */
    .left-panel {
      flex: 0 0 480px;
      background: white;
      border-right: 1px solid #e1e8ed;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }

    /* 右側面板 - 詳情展示 */
    .right-panel {
      flex: 1;
      background: #fafbfc;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* 頁面標題 */
    .app-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
    }

    .app-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .app-subtitle {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }

    /* 設定區塊 */
    .settings-section, .channels-section {
      padding: 24px;
      border-bottom: 1px solid #f0f3f6;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 18px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 2px;
    }

    /* 表單樣式 */
    .form-group {
      margin-bottom: 16px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #374151;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s ease;
      background: #ffffff;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* 按鈕樣式 */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #4b5563;
      transform: translateY(-1px);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .btn-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* 狀態指示器 */
    .status-indicator {
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      margin-top: 8px;
      transition: all 0.3s ease;
    }

    .status-success {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .status-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    /* 搜索框 */
    .search-container {
      position: relative;
      margin-bottom: 16px;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px 12px 44px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      background: white;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
    }

    /* 渠道列表 */
    .channel-list {
      max-height: 300px;
      overflow-y: auto;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
    }

    .channel-item {
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .channel-item:hover {
      background: #f8fafc;
      transform: translateX(2px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .channel-item.selected {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);
    }
    
    .channel-item.selected .channel-name {
      color: rgba(255, 255, 255, 0.9);
    }

    .channel-item:last-child {
      border-bottom: none;
    }
    
    .channel-id {
      font-weight: 600;
      font-size: 15px;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .channel-item.selected .channel-id {
      color: white;
    }
    
    .channel-name {
      font-size: 13px;
      color: #6b7280;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .cache-indicator {
      color: #fbbf24;
      font-size: 16px;
      margin-left: 4px;
    }

    /* 提示信息 */
    .info-card {
      background: linear-gradient(135deg, #e0e7ff, #f0f9ff);
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      font-size: 14px;
      color: #3730a3;
    }

    /* 右側詳情面板 */
    .details-header {
      padding: 24px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }

    .details-title {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }

    .details-subtitle {
      color: #6b7280;
      font-size: 14px;
    }

    .details-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .details-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9ca3af;
      text-align: center;
    }

    .details-placeholder-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    /* 詳情表格 */
    .details-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .details-table th {
      background: #f8fafc;
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }

    .details-table td {
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }

    .details-table tr:last-child td {
      border-bottom: none;
    }

    .key-cell {
      width: 25%;
      font-weight: 500;
      color: #4b5563;
    }

    .value-cell {
      position: relative;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .value-cell:hover {
      background-color: #f8fafc;
    }

    .value-cell.copied {
      background-color: #d1fae5;
    }

    .value-cell pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      background: #f8fafc;
      padding: 8px;
      border-radius: 4px;
    }

    /* 底部狀態欄 */
    .status-bar {
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      flex-shrink: 0;
    }

    /* 響應式設計 */
    @media (max-width: 1024px) {
      .app-container {
        flex-direction: column;
        max-height: none;
      }

      .left-panel {
        flex: none;
        border-right: none;
        border-bottom: 1px solid #e1e8ed;
      }

      .right-panel {
        min-height: 60vh;
      }

      .github-link {
        top: 10px;
        right: 10px;
        padding: 8px;
      }

      .github-link svg {
        width: 20px;
        height: 20px;
      }
    }

    @media (max-width: 640px) {
      .left-panel, .details-content {
        padding: 16px;
      }

      .app-header {
        padding: 16px;
      }

      .settings-section, .channels-section {
        padding: 16px;
      }

      .btn-group {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }
      
      .channel-name {
        max-width: 120px;
      }
      
      .channel-item {
        padding: 10px 12px;
      }
    }

    /* 動畫效果 */
    .fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* 隱藏類 */
    .hidden {
      display: none !important;
    }

    /* 載入動畫 */
    .loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- GitHub 圖標連結 -->
  <a href="https://github.com/123hi123/newapi-helper" target="_blank" class="github-link" title="查看 GitHub 項目">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  </a>

  <div class="app-container">
    <!-- 左側面板 -->
    <div class="left-panel">
      <!-- 應用標題 -->
      <div class="app-header">
        <h1 class="app-title">NewAPI Helper</h1>
        <p class="app-subtitle">多用戶智能管理工具 - 渠道查詢 & 優惠碼生成</p>
      </div>

      <!-- API 設定區塊 -->
      <div class="settings-section">
        <h2 class="section-title">🔧 多用戶設定</h2>
        
        <div class="form-group">
          <label class="form-label" for="account-selector">選擇賬號</label>
          <select id="account-selector" class="form-input">
            <option value="">選擇賬號...</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label" for="account-name">賬號名稱</label>
          <input type="text" id="account-name" class="form-input" placeholder="例如: 主要賬號">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="api-url">API URL</label>
          <input type="text" id="api-url" class="form-input" placeholder="例如: https://api.example.com">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="access-token">Access Token</label>
          <input type="password" id="access-token" class="form-input" placeholder="輸入您的 Access Token">
        </div>
        
        <div class="btn-group">
          <button id="save-credentials" class="btn btn-primary">
            💾 儲存賬號
          </button>
          <button id="delete-account" class="btn btn-secondary" style="display: none;">
            🗑️ 刪除賬號
          </button>
          <button id="clear-credentials" class="btn btn-secondary">
            🧹 清除所有
          </button>
        </div>
        
        <div id="credentials-status" class="status-indicator hidden"></div>
      </div>

      <!-- 渠道選擇區塊 -->
      <div class="channels-section">
        <h2 class="section-title">📡 渠道管理</h2>
        
        <div class="btn-group" style="margin-bottom: 20px;">
          <button id="get-channels" class="btn btn-primary">
            🔄 手動重載渠道
          </button>
        </div>

        <div id="channel-selector-group" class="hidden">
          <div class="info-card">
            💡 直接點擊渠道即可查看詳情，前10個渠道已預緩存，載入更快速！
          </div>
          
          <div class="search-container">
            <div class="search-icon">🔍</div>
            <input type="text" id="channel-search" class="search-input" placeholder="搜索渠道 ID 或名稱...">
          </div>
          
          <div id="channel-list" class="channel-list"></div>
        </div>
      </div>

      <!-- 優惠碼生成區塊 -->
      <div class="settings-section">
        <h2 class="section-title">🎫 優惠碼生成</h2>
        
        <div class="info-card">
          💡 生成優惠碼需要當前賬號有對應的權限，生成結果將顯示在右側面板
        </div>
        
        <div class="form-group">
          <label class="form-label" for="redemption-amount">額度 (美金)</label>
          <input type="number" id="redemption-amount" class="form-input" placeholder="例如: 10" min="0.01" step="0.01">
        </div>
        
        <div class="form-group">
          <label class="form-label" for="redemption-count">數量</label>
          <input type="number" id="redemption-count" class="form-input" placeholder="例如: 5" min="1" step="1">
        </div>
        
        <button id="generate-redemption" class="btn btn-primary" style="width: 100%;">
          🎫 生成優惠碼
        </button>
      </div>

      <!-- 狀態欄 -->
      <div class="status-bar">
        <div id="status">準備就緒</div>
      </div>
    </div>

    <!-- 右側面板 -->
    <div class="right-panel">
      <div class="details-header">
        <h2 class="details-title">渠道詳細資訊</h2>
        <p class="details-subtitle">點擊左側渠道以查看詳細配置</p>
      </div>
      
      <div class="details-content">
        <div id="channel-details-container">
          <div class="details-placeholder">
            <div class="details-placeholder-icon">📋</div>
            <p style="font-size: 16px; margin-bottom: 8px;">尚未選擇渠道</p>
            <p style="font-size: 14px;">請從左側選擇一個渠道以查看詳細資訊</p>
          </div>
        </div>
      </div>
    </div>
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