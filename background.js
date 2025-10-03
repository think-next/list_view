// 测试Chrome API是否可用
console.log('=== Background script loaded from ROOT directory ===');
console.log('chrome.bookmarks available:', typeof chrome.bookmarks);
console.log('chrome.history available:', typeof chrome.history);
console.log('chrome.runtime available:', typeof chrome.runtime);

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
    try {
        // 检查标签页是否有效
        if (!tab || !tab.id) {
            console.error('无效的标签页');
            return;
        }

        // 检查URL是否支持content script
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
            console.warn('当前页面不支持content script:', tab.url);
            return;
        }

        // 向当前标签页发送消息，显示模态框
        chrome.tabs.sendMessage(tab.id, { action: 'showModal' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError.message);

                // 如果content script未加载，尝试注入
                if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                    console.log('尝试注入content script...');
                    injectContentScript(tab.id);
                }
            } else {
                console.log('模态框显示成功');
            }
        });

    } catch (error) {
        console.error('扩展图标点击处理失败:', error);
    }
});

// 注入content script
async function injectContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['scripts/modal.js', 'scripts/content.js']
        });
        console.log('Content script注入成功');

        // 等待一段时间后重试发送消息
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'showModal' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('重试发送消息失败:', chrome.runtime.lastError.message);
                } else {
                    console.log('重试发送消息成功');
                }
            });
        }, 500);

    } catch (error) {
        console.error('注入content script失败:', error);
    }
}

// 监听键盘快捷键命令
chrome.commands.onCommand.addListener((command) => {
    if (command === '_execute_action') {
        console.log('快捷键 Ctrl+Shift+K (Windows/Linux) 或 Command+Shift+K (Mac) 被触发');
        handleShortcutTrigger();
    }
});

// 处理快捷键触发
async function handleShortcutTrigger() {
    try {
        // 获取当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.id) {
            console.error('无法获取当前标签页');
            return;
        }

        // 检查URL是否支持content script
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
            console.warn('当前页面不支持content script:', tab.url);
            return;
        }

        // 向当前标签页发送消息，显示模态框
        chrome.tabs.sendMessage(tab.id, { action: 'showModal' }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('发送消息失败:', chrome.runtime.lastError.message);

                // 如果content script未加载，尝试注入
                if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                    console.log('尝试注入content script...');
                    injectContentScript(tab.id);
                }
            } else {
                console.log('快捷键触发模态框显示成功');
            }
        });

    } catch (error) {
        console.error('快捷键处理失败:', error);
    }
}

// 监听来自content script的消息
console.log('🔧 background.js 已加载，正在注册消息监听器...');
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 消息监听器被触发！收到消息:', request);
    console.log('📨 发送者:', sender);
    console.log('📨 消息类型:', typeof request);
    console.log('📨 消息action:', request.action);

    // 同步操作
    if (request.action === 'contentScriptReady') {
        console.log('Content script已就绪:', request.url);
        sendResponse({ success: true });
        return;
    } else if (request.action === 'openOptionsPage') {
        // 处理打开选项页面请求
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
        return;
    }

    // 异步操作 - 需要特殊处理
    if (request.action === 'searchBookmarksAndHistory') {
        // 处理搜索请求
        handleSearchRequest(request.query, request.filter, sendResponse)
            .catch(error => {
                console.error('❌ handleSearchRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'getHistoryStats') {
        // 处理历史统计请求
        handleHistoryStatsRequest(sendResponse)
            .catch(error => {
                console.error('❌ handleHistoryStatsRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'switchToTab') {
        // 处理切换标签页请求
        handleSwitchToTabRequest(request.tabId, request.windowId, sendResponse)
            .catch(error => {
                console.error('❌ handleSwitchToTabRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'getAllTabs') {
        // 处理获取所有标签页请求
        handleGetAllTabsRequest(sendResponse)
            .catch(error => {
                console.error('❌ handleGetAllTabsRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'closeTab') {
        // 处理关闭标签页请求
        handleCloseTabRequest(request.tabId, sendResponse)
            .catch(error => {
                console.error('❌ handleCloseTabRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'getMaxResults') {
        // 处理获取maxResults配置请求
        handleGetMaxResultsRequest(sendResponse)
            .catch(error => {
                console.error('❌ handleGetMaxResultsRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'getAIRecommendations') {
        // 处理AI推荐请求
        console.log('🎯 进入AI推荐处理分支！');
        console.log('📨 收到AI推荐请求:', request.query);
        console.log('📨 请求对象完整内容:', JSON.stringify(request, null, 2));
        console.log('📨 准备调用 handleAIRecommendationRequest...');
        handleAIRecommendationRequest(request.query, sendResponse)
            .then(() => {
                console.log('📨 handleAIRecommendationRequest 调用完成');
            })
            .catch(error => {
                console.error('❌ 调用 handleAIRecommendationRequest 时发生异常:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'checkAISettings') {
        // 处理AI设置检查请求
        handleCheckAISettingsRequest(sendResponse)
            .catch(error => {
                console.error('❌ handleCheckAISettingsRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'downloadAIModel') {
        // 处理AI模型下载请求
        console.log('🎯 收到downloadAIModel请求，准备调用handleDownloadAIModelRequest');
        handleDownloadAIModelRequest(sendResponse)
            .catch(error => {
                console.error('❌ handleDownloadAIModelRequest 执行失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    // 未知消息类型
    console.warn('⚠️ 收到未知消息类型:', request.action);
    sendResponse({ success: false, error: '未知的消息类型' });
});

// 处理搜索请求
async function handleSearchRequest(query, filter, sendResponse) {
    try {
        console.log('开始搜索:', query, '过滤器:', filter);

        let results = [];

        if (filter === 'bookmark') {
            // 只搜索书签
            results = await searchBookmarks(query);
        } else if (filter === 'history') {
            // 只搜索历史记录
            results = await searchHistory(query);
        } else if (filter === 'tab') {
            // 搜索当前标签页（按窗口分组）
            const windowGroups = await searchTabs(query);
            sendResponse({
                success: true,
                results: windowGroups,
                isGrouped: true // 标记这是分组数据
            });
            return;
        } else {
            // 默认：并行搜索书签和历史记录
            const [bookmarks, history] = await Promise.all([
                searchBookmarks(query),
                searchHistory(query)
            ]);
            results = [...bookmarks, ...history];
        }

        // 按时间排序
        results.sort((a, b) => new Date(b.lastVisitTime || b.dateAdded) - new Date(a.lastVisitTime || a.dateAdded));

        // 去重处理：按URL路径去重，保留最新的记录
        const uniqueResults = deduplicateByUrlPath(results);

        // 获取用户配置的最大结果数
        try {
            const result = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['maxResults'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            const maxResults = result.maxResults || 12;

            // 返回配置数量的结果
            sendResponse({
                success: true,
                results: uniqueResults.slice(0, maxResults),
                maxResults: maxResults
            });
        } catch (error) {
            console.error('获取存储配置失败:', error);
            // 使用默认值
            sendResponse({
                success: true,
                results: uniqueResults.slice(0, 12),
                maxResults: 12
            });
        }

    } catch (error) {
        console.error('搜索出错:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 搜索书签
async function searchBookmarks(query) {
    return new Promise((resolve, reject) => {
        console.log('开始搜索书签:', query);
        console.log('chrome.bookmarks类型:', typeof chrome.bookmarks);

        if (typeof chrome.bookmarks === 'undefined') {
            reject(new Error('chrome.bookmarks is undefined'));
            return;
        }

        chrome.bookmarks.search(query, (results) => {
            if (chrome.runtime.lastError) {
                console.error('书签搜索错误:', chrome.runtime.lastError);
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            const bookmarkResults = results
                .filter(item => item.url)
                .map(item => ({
                    title: item.title,
                    url: item.url,
                    type: 'bookmark',
                    dateAdded: item.dateAdded,
                    id: item.id
                }));
            resolve(bookmarkResults);
        });
    });
}

// 搜索历史记录
async function searchHistory(query) {
    return new Promise((resolve, reject) => {
        const endTime = Date.now();
        const startTime = endTime - (30 * 24 * 60 * 60 * 1000);

        chrome.history.search({
            text: query,
            startTime: startTime,
            endTime: endTime,
            maxResults: 50
        }, (results) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            const historyResults = results.map(item => ({
                title: item.title,
                url: item.url,
                type: 'history',
                lastVisitTime: item.lastVisitTime,
                visitCount: item.visitCount
            }));
            resolve(historyResults);
        });
    });
}

// 搜索当前标签页
async function searchTabs(query) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({}, (tabs) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            // 按窗口分组标签页
            const windowGroups = groupTabsByWindow(tabs, query);

            resolve(windowGroups);
        });
    });
}

// 按窗口分组标签页
function groupTabsByWindow(tabs, query) {
    console.log('开始分组标签页，总数:', tabs.length, '查询:', query);
    const windowMap = new Map();

    tabs.forEach(tab => {
        // 如果有关键词，进行过滤
        if (query && query.trim()) {
            const matchesQuery = tab.title.toLowerCase().includes(query.toLowerCase()) ||
                tab.url.toLowerCase().includes(query.toLowerCase());
            if (!matchesQuery) return;
        }

        const windowId = tab.windowId;

        if (!windowMap.has(windowId)) {
            windowMap.set(windowId, {
                windowId: windowId,
                windowTitle: `窗口 ${windowId}`,
                tabs: []
            });
        }

        windowMap.get(windowId).tabs.push({
            title: tab.title,
            url: tab.url,
            type: 'tab',
            lastVisitTime: Date.now(),
            tabId: tab.id,
            windowId: tab.windowId,
            active: tab.active,
            pinned: tab.pinned
        });
    });

    // 转换为数组并按窗口ID排序
    const result = Array.from(windowMap.values()).sort((a, b) => a.windowId - b.windowId);
    console.log('分组结果:', result);
    return result;
}

// 处理切换标签页请求
async function handleSwitchToTabRequest(tabId, windowId, sendResponse) {
    try {
        console.log('处理切换标签页请求:', tabId, '窗口:', windowId);

        // 先切换到对应窗口
        chrome.windows.update(windowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
                console.error('切换窗口失败:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            // 然后切换到指定标签页
            chrome.tabs.update(tabId, { active: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error('切换标签页失败:', chrome.runtime.lastError);
                    sendResponse({
                        success: false,
                        error: chrome.runtime.lastError.message
                    });
                    return;
                }

                console.log('成功切换到标签页:', tabId);
                sendResponse({
                    success: true,
                    message: '标签页切换成功'
                });
            });
        });
    } catch (error) {
        console.error('切换标签页出错:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理获取所有标签页请求
async function handleGetAllTabsRequest(sendResponse) {
    try {
        console.log('开始获取所有标签页');

        // 获取所有标签页并按窗口分组
        const windowGroups = await searchTabs('');

        sendResponse({
            success: true,
            results: windowGroups
        });
    } catch (error) {
        console.error('获取所有标签页失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理关闭标签页请求
async function handleCloseTabRequest(tabId, sendResponse) {
    try {
        console.log('开始关闭标签页:', tabId);

        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
                console.error('关闭标签页失败:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            console.log('成功关闭标签页:', tabId);
            sendResponse({
                success: true,
                message: '标签页已关闭'
            });
        });
    } catch (error) {
        console.error('关闭标签页出错:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理历史统计请求
async function handleHistoryStatsRequest(sendResponse) {
    try {
        console.log('开始获取历史统计...');

        // 获取过去7天的历史记录
        const endTime = Date.now();
        const startTime = endTime - (7 * 24 * 60 * 60 * 1000); // 7天前

        chrome.history.search({
            text: '',
            startTime: startTime,
            endTime: endTime,
            maxResults: 1000 // 获取更多记录用于统计
        }, (results) => {
            if (chrome.runtime.lastError) {
                console.error('获取历史记录失败:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

            try {
                // 处理历史记录，提取域名和路径
                const domainStats = processHistoryForStats(results);

                // 获取前3个域名，每个域名下前3个路径
                const topDomains = getTopDomainsWithPaths(domainStats, 3, 3);

                sendResponse({
                    success: true,
                    stats: topDomains
                });
            } catch (error) {
                console.error('处理历史统计失败:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
        });
    } catch (error) {
        console.error('历史统计请求失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理历史记录，按域名分组统计
function processHistoryForStats(historyItems) {
    const domainMap = new Map();

    historyItems.forEach(item => {
        if (!item.url) return;

        try {
            const url = new URL(item.url);
            const domain = url.hostname;
            const pathname = url.pathname;

            // 截取?之前的路径
            const path = pathname.split('?')[0];

            if (!domainMap.has(domain)) {
                domainMap.set(domain, new Map());
            }

            const pathMap = domainMap.get(domain);
            if (!pathMap.has(path)) {
                pathMap.set(path, {
                    path: path,
                    count: 0,
                    title: item.title,
                    lastVisit: item.lastVisitTime
                });
            }

            pathMap.get(path).count += item.visitCount || 1;
        } catch (error) {
            console.warn('解析URL失败:', item.url, error);
        }
    });

    return domainMap;
}

// 去重函数：按URL路径去重，保留最新的记录
function deduplicateByUrlPath(results) {
    const urlPathMap = new Map();

    results.forEach(result => {
        if (!result.url) return;

        try {
            // 截取URL到?之前的路径
            const url = new URL(result.url);
            const pathKey = url.origin + url.pathname;

            // 如果该路径还没有记录，或者当前记录更新，则保存
            if (!urlPathMap.has(pathKey) ||
                new Date(result.lastVisitTime || result.dateAdded) >
                new Date(urlPathMap.get(pathKey).lastVisitTime || urlPathMap.get(pathKey).dateAdded)) {
                urlPathMap.set(pathKey, result);
            }
        } catch (error) {
            console.warn('解析URL失败:', result.url, error);
            // 如果URL解析失败，直接使用原URL作为key
            if (!urlPathMap.has(result.url)) {
                urlPathMap.set(result.url, result);
            }
        }
    });

    // 返回去重后的结果，按时间排序
    return Array.from(urlPathMap.values())
        .sort((a, b) => new Date(b.lastVisitTime || b.dateAdded) - new Date(a.lastVisitTime || a.dateAdded));
}

// 获取前N个域名，每个域名下前M个路径
function getTopDomainsWithPaths(domainMap, topDomainsCount, topPathsCount) {
    const domainStats = [];

    // 计算每个域名的总访问次数
    for (const [domain, pathMap] of domainMap) {
        let totalVisits = 0;
        const paths = [];

        for (const [path, stats] of pathMap) {
            totalVisits += stats.count;
            paths.push(stats);
        }

        // 按访问次数排序路径
        paths.sort((a, b) => b.count - a.count);

        domainStats.push({
            domain: domain,
            totalVisits: totalVisits,
            paths: paths.slice(0, topPathsCount) // 取前N个路径
        });
    }

    // 按总访问次数排序域名
    domainStats.sort((a, b) => b.totalVisits - a.totalVisits);

    return domainStats.slice(0, topDomainsCount);
}

// 处理获取maxResults配置请求
async function handleGetMaxResultsRequest(sendResponse) {
    try {
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['maxResults'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });

        const maxResults = result.maxResults || 12;
        sendResponse({
            success: true,
            maxResults: maxResults
        });
    } catch (error) {
        console.error('获取maxResults配置失败:', error);
        sendResponse({
            success: true,
            maxResults: 12
        });
    }
}
// 处理AI设置检查请求
async function handleCheckAISettingsRequest(sendResponse) {
    try {
        // 获取AI推荐设置
        const settings = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['aiRecommendation'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });

        const aiRecommendationEnabled = settings.aiRecommendation !== false;

        // 检查AI权限 (使用官方文档的方式)
        let permissionGranted = false;
        let permissionError = '';
        try {
            // 检查模型可用性
            const availability = await LanguageModel.availability();
            console.log('模型可用性:', availability);

            if (availability === 'available') {
                permissionGranted = true;
            } else if (availability === 'downloadable' || availability === 'downloading') {
                permissionGranted = true;
                console.log('模型需要下载，但API可用');
            } else {
                permissionError = `模型不可用，状态: ${availability}`;
            }
        } catch (error) {
            console.log('AI权限检查失败:', error.message);
            permissionError = error.message;
        }

        sendResponse({
            success: true,
            enabled: aiRecommendationEnabled,
            permission: permissionGranted,
            permissionError: permissionError,
            settings: {
                aiRecommendation: settings.aiRecommendation
            }
        });

    } catch (error) {
        console.error('检查AI设置失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理AI推荐请求
async function handleAIRecommendationRequest(query, sendResponse) {
    console.log('🚀 handleAIRecommendationRequest 函数被调用！');
    console.log('🚀 查询参数:', query);
    console.log('🚀 sendResponse 函数:', typeof sendResponse);
    console.log('🚀 开始处理AI推荐请求，查询:', query);

    try {
        console.log('🔍 开始检查AI设置...');
        // 检查是否启用了AI推荐
        console.log('🔍 正在获取AI设置...');
        const settings = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['aiRecommendation'], (result) => {
                console.log('🔍 存储API返回结果:', result);
                if (chrome.runtime.lastError) {
                    console.error('❌ 存储API错误:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('✅ 存储API成功，设置:', result);
                    resolve(result);
                }
            });
        });

        // 默认启用AI推荐（如果用户未设置过）
        const aiRecommendationEnabled = settings.aiRecommendation !== false;

        console.log('AI推荐设置检查:', {
            aiRecommendation: settings.aiRecommendation,
            aiRecommendationEnabled: aiRecommendationEnabled
        });

        if (!aiRecommendationEnabled) {
            console.log('AI推荐被禁用，设置值:', settings.aiRecommendation);
            // 这里应该是配置文件的开关控制
            sendResponse({ success: false, error: 'AI推荐未启用' });
            return;
        }

        // 检查AI权限 (使用官方文档的方式)
        try {
            console.log('开始检查AI权限...');

            // 检查模型可用性
            const availability = await LanguageModel.availability();
            console.log('模型可用性:', availability);

            if (availability === 'available') {
                console.log('AI权限检查通过');
            } else if (availability === 'downloadable' || availability === 'downloading') {
                console.log('模型需要下载，但API可用');
            } else {
                throw new Error(`模型不可用，状态: ${availability}`);
            }
        } catch (error) {
            console.error('AI权限检查失败:', error);
            console.error('错误详情:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            sendResponse({
                success: false,
                error: 'AI权限未授权，请在扩展设置中授权AI权限'
            });
            return;
        }

        // 获取用户的历史记录和书签作为推荐基础
        const [historyResults, bookmarksResults] = await Promise.all([
            new Promise((resolve) => {
                chrome.history.search({
                    text: query,
                    maxResults: 50,
                    startTime: Date.now() - 30 * 24 * 60 * 60 * 1000 // 最近30天
                }, (results) => {
                    resolve(results || []);
                });
            }),
            new Promise((resolve) => {
                chrome.bookmarks.search(query, (results) => {
                    resolve(results || []);
                });
            })
        ]);

        // 合并并去重
        const allResults = [...historyResults, ...bookmarksResults];
        const uniqueResults = deduplicateByUrlPath(allResults);

        // 构建AI提示
        const contextData = uniqueResults.slice(0, 20).map(item => ({
            title: item.title,
            url: item.url,
            type: item.url ? 'history' : 'bookmark'
        }));

        // 按照官方文档构建会话和提示
        console.log('🤖 使用LanguageModel API调用AI...');
        console.log('📊 历史数据:', contextData.length, '条记录');
        console.log('🔍 搜索查询:', query);

        // 创建会话，使用initialPrompts设置上下文
        const initialPrompts = [
            {
                role: 'system',
                content: '你是一个智能推荐助手，专门为用户推荐相关的网页链接。你需要基于用户的历史记录和书签数据，推荐最相关的链接。'
            },
            {
                role: 'user',
                content: '请推荐3个最相关的链接，返回JSON格式的数组，每个推荐包含title、url、reason三个字段。'
            }
        ];

        console.log('📝 Initial Prompts (传递给 LanguageModel.create()):');
        console.log('const session = await LanguageModel.create({');
        console.log('  initialPrompts: [');
        initialPrompts.forEach((prompt, index) => {
            console.log(`    {`);
            console.log(`      role: '${prompt.role}',`);
            console.log(`      content: '${prompt.content}'`);
            console.log(`    }${index < initialPrompts.length - 1 ? ',' : ''}`);
        });
        console.log('  ]');
        console.log('});');

        // 步骤0: 跳过权限检查（Chrome暂不支持ai权限）
        console.log('🔧 步骤0: 跳过权限检查，直接使用LanguageModel API...');

        // 步骤1: 检查LanguageModel是否可用
        console.log('🔧 步骤1: 检查LanguageModel API...');
        console.log('🔧 检查LanguageModel是否可用:', typeof LanguageModel);
        console.log('🔧 检查LanguageModel.create是否可用:', typeof LanguageModel.create);

        if (typeof LanguageModel === 'undefined') {
            console.log('⚠️ LanguageModel API不可用，使用模拟数据');
            sendResponse({
                success: true,
                recommendations: [
                    {
                        title: "模拟推荐1 - " + query,
                        url: "https://www.google.com/search?q=" + encodeURIComponent(query),
                        reason: "基于搜索查询的模拟推荐"
                    },
                    {
                        title: "模拟推荐2 - " + query,
                        url: "https://www.baidu.com/s?wd=" + encodeURIComponent(query),
                        reason: "备选搜索推荐"
                    }
                ]
            });
            return;
        }

        // 跳过模型可用性检查，直接尝试创建AI会话
        console.log('🔧 步骤1.5: 跳过模型可用性检查，直接尝试创建AI会话...');

        let session;
        try {
            console.log('🔧 调用LanguageModel.create()...');
            session = await LanguageModel.create({
                initialPrompts: initialPrompts
            });
            console.log('✅ LanguageModel.create() 成功！');
            console.log('✅ 会话对象:', typeof session);
            console.log('✅ 会话方法:', Object.getOwnPropertyNames(session));
        } catch (createError) {
            console.error('❌ LanguageModel.create() 失败！');
            console.error('❌ 错误详情:', createError);
            console.error('❌ 错误类型:', createError.name);
            console.error('❌ 错误消息:', createError.message);
            console.error('❌ 错误堆栈:', createError.stack);

            // 发送错误响应
            sendResponse({
                success: false,
                error: `AI会话创建失败: ${createError.message}`
            });
            return;
        }

        // 构建用户查询，包含历史数据
        console.log('🔍 构建用户查询...');
        console.log('🔍 搜索查询:', query);
        console.log('🔍 历史数据条数:', contextData.length);

        // 限制历史数据数量，避免prompt过长
        const limitedContextData = contextData.slice(0, 10); // 只取前10条
        console.log('🔍 限制后历史数据条数:', limitedContextData.length);

        const userQuery = `基于搜索查询"${query}"，从以下数据中推荐3个最相关的链接：

${JSON.stringify(limitedContextData, null, 2)}

请返回JSON格式的推荐结果：`;

        console.log('📤 用户查询长度:', userQuery.length, '字符');
        console.log('📤 查询预览:', userQuery.substring(0, 200) + '...');

        // 步骤2: 验证 session.prompt() 是否成功
        const promptArray = [
            {
                role: 'user',
                content: userQuery
            }
        ];

        // 使用 JSON Schema 约束大模型输出，确保返回期望的结构化结果
        const recommendationSchema = {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    url: { type: 'string' },
                    reason: { type: 'string' }
                },
                required: ['title', 'url', 'reason'],
                additionalProperties: false
            },
            minItems: 1,
            maxItems: 3
        };

        console.log('🔧 步骤2: 开始调用AI...');
        console.log('🔧 检查session.prompt是否可用:', typeof session.prompt);
        console.log('📋 传递给 session.prompt() 的参数:');
        console.log('const aiResponse = await session.prompt(');
        console.log(JSON.stringify(promptArray, null, 2));
        console.log(');');

        // 简化prompt内容输出
        console.log('🔍 发送给AI的prompt分析:');
        console.log('🔍 prompt条数:', promptArray.length);
        console.log('🔍 总字符数:', promptArray.reduce((total, item) => total + item.content.length, 0));
        console.log('🔍 用户查询长度:', promptArray[0]?.content.length || 0, '字符');
        console.log('🔍 用户查询预览:', promptArray[0]?.content.substring(0, 100) + '...');

        let aiResponse;
        try {
            console.log('🔧 调用session.prompt()...');
            console.log('⏰ 开始计时AI调用...');
            const startTime = Date.now();

            // 添加超时机制，避免AI调用卡住太久
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('AI调用超时（30秒）')), 30000);
            });

            aiResponse = await Promise.race([
                session.prompt(promptArray, { responseConstraint: recommendationSchema }),
                timeoutPromise
            ]);

            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`✅ session.prompt() 成功！耗时: ${duration}ms`);
            console.log('✅ AI响应类型:', typeof aiResponse);
            console.log('✅ AI响应内容:', aiResponse);
        } catch (promptError) {
            console.error('❌ session.prompt() 失败！');
            console.error('❌ 错误详情:', promptError);
            console.error('❌ 错误类型:', promptError.name);
            console.error('❌ 错误消息:', promptError.message);
            console.error('❌ 错误堆栈:', promptError.stack);

            // 发送错误响应
            sendResponse({
                success: false,
                error: `AI调用失败: ${promptError.message}`
            });
            return;
        }

        console.log('LanguageModel API响应:', aiResponse);

        // 解析AI响应 (LanguageModel API返回格式)
        console.log('AI响应:', aiResponse);

        // 尝试解析JSON响应
        let recommendations = [];
        try {
            // LanguageModel API返回的文本内容
            const responseText = aiResponse || '';
            console.log('AI响应文本:', responseText);

            // 尝试直接解析
            recommendations = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析失败:', parseError);
            console.log('原始响应:', aiResponse);

            // 如果解析失败，尝试从文本中提取JSON
            try {
                const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    recommendations = JSON.parse(jsonMatch[0]);
                } else {
                    // 如果无法解析，创建默认推荐
                    recommendations = [{
                        title: "AI推荐功能测试 (LanguageModel API)",
                        url: "https://www.google.com",
                        reason: "这是使用LanguageModel API的测试推荐"
                    }];
                }
            } catch (extractError) {
                console.error('JSON提取失败:', extractError);
                recommendations = [{
                    title: "AI推荐功能测试 (LanguageModel API)",
                    url: "https://www.google.com",
                    reason: "这是使用LanguageModel API的测试推荐"
                }];
            }
        }

        // 步骤4: 验证 sendResponse 调用
        console.log('🔧 步骤4: 准备发送成功响应...');
        console.log('🔧 检查sendResponse是否可用:', typeof sendResponse);
        console.log('📤 推荐结果:', recommendations.slice(0, 3));

        try {
            sendResponse({
                success: true,
                recommendations: recommendations.slice(0, 3) // 限制为3个推荐
            });
            console.log('✅ 成功响应已发送！');
        } catch (responseError) {
            console.error('❌ 发送成功响应失败:', responseError);
            console.error('❌ 响应错误详情:', responseError);
        }

    } catch (error) {
        console.error('❌ 步骤3: AI推荐失败 - 异步操作错误处理验证');
        console.error('❌ 错误详情:', error);
        console.error('❌ 错误类型:', error.name);
        console.error('❌ 错误消息:', error.message);
        console.error('❌ 错误堆栈:', error.stack);
        console.log('📤 准备发送错误响应...');

        try {
            sendResponse({
                success: false,
                error: error.message
            });
            console.log('✅ 错误响应已发送！');
        } catch (responseError) {
            console.error('❌ 发送错误响应失败:', responseError);
        }
    }
}

// 处理AI模型下载请求
async function handleDownloadAIModelRequest(sendResponse) {
    console.log('🚀 开始处理AI模型下载请求...');

    try {
        // 检查当前模型状态
        const availability = await LanguageModel.availability();
        console.log('🔍 当前模型状态:', availability);

        if (availability === 'available') {
            console.log('✅ 模型已可用，无需下载');
            sendResponse({
                success: true,
                message: '模型已可用',
                availability: availability
            });
            return;
        }

        if (availability === 'downloading') {
            console.log('⏳ 模型正在下载中，开始监听下载进度');

            // 创建会话以监听正在进行的下载
            try {
                const session = await LanguageModel.create({
                    monitor(m) {
                        console.log('📊 设置下载进度监听器（正在进行的下载）');
                        m.addEventListener('downloadprogress', (e) => {
                            // e.loaded 是 0-1 之间的进度值，需要转换为百分比
                            const progress = Math.round(e.loaded * 100);
                            console.log(`📥 下载进度: ${progress}% (原始值: ${e.loaded})`);

                            // 发送进度更新到前端
                            chrome.runtime.sendMessage({
                                action: 'downloadProgress',
                                progress: progress,
                                loaded: e.loaded
                            }).catch(() => {
                                // 忽略发送失败，可能前端已关闭它
                            });
                        });

                        m.addEventListener('downloadcomplete', () => {
                            console.log('✅ 模型下载完成');

                            // 发送下载完成通知
                            chrome.runtime.sendMessage({
                                action: 'downloadComplete'
                            }).catch(() => {
                                // 忽略发送失败
                            });
                        });
                    }
                });

                console.log('✅ 下载进度监听器设置成功');
                sendResponse({
                    success: true,
                    message: '正在监听下载进度',
                    isDownloading: true,
                    availability: availability
                });
                return;
            } catch (error) {
                console.error('❌ 设置下载进度监听器失败:', error);
                sendResponse({
                    success: false,
                    error: `监听下载进度失败: ${error.message}`,
                    availability: availability
                });
                return;
            }
        }

        if (availability !== 'downloadable') {
            console.log('❌ 模型状态不支持下载:', availability);
            sendResponse({
                success: false,
                error: `模型状态不支持下载: ${availability}`,
                availability: availability
            });
            return;
        }

        console.log('📥 开始下载AI模型...');

        // 创建会话并开始下载
        const session = await LanguageModel.create({
            monitor(m) {
                console.log('📊 设置下载进度监听器');
                m.addEventListener('downloadprogress', (e) => {
                    // e.loaded 是 0-1 之间的进度值，需要转换为百分比
                    const progress = Math.round(e.loaded * 100);
                    console.log(`📥 下载进度: ${progress}% (原始值: ${e.loaded})`);

                    // 发送进度更新到前端
                    chrome.runtime.sendMessage({
                        action: 'downloadProgress',
                        progress: progress,
                        loaded: e.loaded
                    }).catch(() => {
                        // 忽略发送失败，可能前端已关闭
                    });
                });

                m.addEventListener('downloadcomplete', () => {
                    console.log('✅ 模型下载完成');

                    // 发送下载完成通知
                    chrome.runtime.sendMessage({
                        action: 'downloadComplete'
                    }).catch(() => {
                        // 忽略发送失败
                    });
                });
            }
        });

        console.log('✅ 模型下载会话创建成功');

        // 重新检查模型状态
        const newAvailability = await LanguageModel.availability();
        console.log('🔍 下载后模型状态:', newAvailability);

        sendResponse({
            success: true,
            message: '模型下载已开始',
            availability: newAvailability,
            sessionCreated: true
        });

    } catch (error) {
        console.error('❌ AI模型下载失败:', error);
        sendResponse({
            success: false,
            error: `模型下载失败: ${error.message}`,
            errorDetails: error
        });
    } finally {
        // 确保sendResponse被调用
        console.log('🔧 handleDownloadAIModelRequest 函数执行完成');
    }
}

