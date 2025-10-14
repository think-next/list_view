// 测试Chrome API是否可用
console.log('Background script loaded');

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
                    injectContentScript(tab.id);
                }
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

        // 等待一段时间后重试发送消息
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'showModal' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('重试发送消息失败:', chrome.runtime.lastError.message);
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
                    injectContentScript(tab.id);
                }
            }
        });

    } catch (error) {
        console.error('快捷键处理失败:', error);
    }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 同步操作
    if (request.action === 'contentScriptReady') {
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
                console.error('搜索请求失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'getHistoryStats') {
        // 处理历史统计请求
        handleHistoryStatsRequest(sendResponse)
            .catch(error => {
                console.error('历史统计请求失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'switchToTab') {
        // 处理切换标签页请求
        handleSwitchToTabRequest(request.tabId, request.windowId, sendResponse)
            .catch(error => {
                console.error('切换标签页失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'getAllTabs') {
        // 处理获取所有标签页请求
        handleGetAllTabsRequest(sendResponse)
            .catch(error => {
                console.error('获取所有标签页失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'closeTab') {
        // 处理关闭标签页请求
        handleCloseTabRequest(request.tabId, sendResponse)
            .catch(error => {
                console.error('关闭标签页失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // 保持消息通道开放
    } else if (request.action === 'getMaxResults') {
        // 处理获取maxResults配置请求
        handleGetMaxResultsRequest(sendResponse)
            .catch(error => {
                console.error('获取maxResults配置失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'getAIRecommendations') {
        // 处理AI推荐请求
        handleAIRecommendationRequest(request.query, sendResponse)
            .catch(error => {
                console.error('AI推荐请求失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'checkAISettings') {
        // 处理AI设置检查请求
        handleCheckAISettingsRequest(sendResponse)
            .catch(error => {
                console.error('检查AI设置失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'downloadAIModel') {
        // 处理AI模型下载请求
        handleDownloadAIModelRequest(sendResponse)
            .catch(error => {
                console.error('AI模型下载失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'mergeWindows') {
        // 处理窗口合并请求
        handleMergeWindowsRequest(request.sourceWindowId, request.targetWindowId, sendResponse)
            .catch(error => {
                console.error('窗口合并失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'getAllBookmarks') {
        // 处理获取所有书签请求
        handleGetAllBookmarksRequest(sendResponse)
            .catch(error => {
                console.error('获取所有书签失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'deleteBookmark') {
        // 处理删除书签请求
        handleDeleteBookmarkRequest(request.bookmarkId, sendResponse)
            .catch(error => {
                console.error('删除书签失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'createTab') {
        // 处理创建标签页请求
        handleCreateTabRequest(request.url, sendResponse)
            .catch(error => {
                console.error('创建标签页失败:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    } else if (request.action === 'getRecentHistory') {
        // 处理获取最近历史记录请求
        handleGetRecentHistoryRequest(request.limit, sendResponse)
            .catch(error => {
                console.error('获取最近历史记录失败:', error);
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
            // 默认：并行搜索 Tabs、书签 和 历史记录
            const [tabsFlat, bookmarks, history] = await Promise.all([
                searchTabsFlat(query),
                searchBookmarks(query),
                searchHistory(query)
            ]);

            // 各来源内部：先依据各自时间维度排序
            const sortedTabs = sortTabsForDefault(tabsFlat);
            const sortedBookmarks = sortBookmarksForDefault(bookmarks);
            const sortedHistory = sortHistoryForDefault(history);

            // 各来源内部去重（以基础URL为准，忽略查询参数）并各自限量12条
            const tabsCapped = dedupeAndCapByBaseUrl(sortedTabs, 12);
            const bookmarksCapped = dedupeAndCapByBaseUrl(sortedBookmarks, 12);
            const historyCapped = dedupeAndCapByBaseUrl(sortedHistory, 12);

            // 跨来源合并：按优先级 Tabs > 书签 > 历史，并按基础URL去重（优先级保留）
            const merged = mergeSourcesByPriority({
                tabs: tabsCapped,
                bookmarks: bookmarksCapped,
                history: historyCapped
            });

            // 最终结果：按 Tabs、书签、历史分段展示顺序
            results = merged;

            // 返回结果（按需求不使用全局上限，严格每来源上限12）
            sendResponse({
                success: true,
                results: results,
                perSourceLimit: 12,
                order: ['tab', 'bookmark', 'history']
            });
            return;
        }

        // 原有分支（非默认）走老逻辑

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
    return new Promise(async (resolve, reject) => {

        if (typeof chrome.bookmarks === 'undefined') {
            reject(new Error('chrome.bookmarks is undefined'));
            return;
        }

        try {
            // 获取所有书签树结构
            const bookmarks = await chrome.bookmarks.getTree();
            const flatBookmarks = [];

            // 递归展平书签树，包含路径信息
            function flattenBookmarks(nodes, parentPath = '') {
                for (const node of nodes) {
                    if (node.url) {
                        // 这是一个书签，添加到结果中
                        // 移除"书签栏"前缀，如果路径以"书签栏/"开头则去掉
                        let cleanPath = parentPath || '';
                        if (cleanPath.startsWith('书签栏/')) {
                            cleanPath = cleanPath.substring(3); // 移除"书签栏/"（3个字符）
                        } else if (cleanPath === '书签栏') {
                            cleanPath = ''; // 如果就是"书签栏"，则设为空
                        }

                        // 移除路径开头的"/"分隔符
                        if (cleanPath.startsWith('/')) {
                            cleanPath = cleanPath.substring(1);
                        }

                        flatBookmarks.push({
                            title: node.title,
                            url: node.url,
                            type: 'bookmark',
                            dateAdded: node.dateAdded,
                            id: node.id,
                            folderPath: cleanPath
                        });
                    }
                    if (node.children) {
                        // 这是一个文件夹，递归处理子项
                        const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
                        flattenBookmarks(node.children, currentPath);
                    }
                }
            }

            flattenBookmarks(bookmarks);

            // 在展平的书签中搜索匹配的书签
            const searchResults = flatBookmarks.filter(bookmark => {
                const title = bookmark.title.toLowerCase();
                const url = bookmark.url.toLowerCase();
                const searchTerm = query.toLowerCase();

                return title.includes(searchTerm) || url.includes(searchTerm);
            });

            resolve(searchResults);
        } catch (error) {
            console.error('书签搜索出错:', error);
            reject(error);
        }
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

// 默认搜索用：扁平化标签页搜索（不分窗口分组）
async function searchTabsFlat(query) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({}, (tabs) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            const q = (query || '').trim().toLowerCase();
            const filtered = tabs.filter(tab => {
                if (!q) return true;
                const title = (tab.title || '').toLowerCase();
                const url = (tab.url || '').toLowerCase();
                return title.includes(q) || url.includes(q);
            }).map(tab => ({
                title: tab.title,
                url: tab.url,
                type: 'tab',
                tabId: tab.id,
                windowId: tab.windowId,
                active: !!tab.active,
                pinned: !!tab.pinned,
                // 作为排序参考；有些环境提供 lastAccessed
                lastAccessed: tab.lastAccessed || 0,
                // 回退时间，用于与历史/书签对齐的排序字段名
                lastVisitTime: tab.lastAccessed || Date.now()
            }));

            resolve(filtered);
        });
    });
}

// 工具：基础URL（去查询参数）
function toBaseUrl(urlString) {
    try {
        const url = new URL(urlString);
        return url.origin + url.pathname;
    } catch (e) {
        return urlString;
    }
}

// 各来源内部：按各自逻辑排序
function sortTabsForDefault(tabs) {
    // 优先激活的tab，其次按 lastAccessed/lastVisitTime 降序
    return [...tabs].sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return (b.lastAccessed || b.lastVisitTime || 0) - (a.lastAccessed || a.lastVisitTime || 0);
    });
}

function sortBookmarksForDefault(bookmarks) {
    // 书签按 dateAdded 降序
    return [...bookmarks].sort((a, b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
}

function sortHistoryForDefault(history) {
    // 历史按 lastVisitTime 降序
    return [...history].sort((a, b) => new Date(b.lastVisitTime || 0) - new Date(a.lastVisitTime || 0));
}

// 在单一来源内部去重并限量
function dedupeAndCapByBaseUrl(items, limit) {
    const seen = new Set();
    const output = [];
    for (const item of items) {
        if (!item || !item.url) continue;
        const key = toBaseUrl(item.url);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        output.push(item);
        if (output.length >= limit) break;
    }
    return output;
}

// 跨来源合并（优先级：Tabs > Bookmarks > History），并按段落顺序输出
function mergeSourcesByPriority({ tabs = [], bookmarks = [], history = [] }) {
    const keep = new Set(); // 记录已保留的基础URL
    const result = [];

    const pushWithCheck = (item) => {
        if (!item || !item.url) return;
        const key = toBaseUrl(item.url);
        if (keep.has(key)) return;
        keep.add(key);
        result.push(item);
    };

    // Tabs 段
    tabs.forEach(pushWithCheck);
    // Bookmarks 段
    bookmarks.forEach(pushWithCheck);
    // History 段
    history.forEach(pushWithCheck);

    return result;
}

// 按窗口分组标签页
function groupTabsByWindow(tabs, query) {
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
                windowTitle: `Window ${windowId}`,
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

    // 对每个窗口组内的tabs按URL排序
    result.forEach(group => {
        group.tabs.sort((a, b) => {
            // 去掉URL中?的部分进行排序
            const urlA = a.url.split('?')[0].toLowerCase();
            const urlB = b.url.split('?')[0].toLowerCase();
            return urlA.localeCompare(urlB);
        });
    });

    return result;
}

// 处理切换标签页请求
async function handleSwitchToTabRequest(tabId, windowId, sendResponse) {
    try {

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

        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
                console.error('关闭标签页失败:', chrome.runtime.lastError);
                sendResponse({
                    success: false,
                    error: chrome.runtime.lastError.message
                });
                return;
            }

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

        const aiRecommendationEnabled = settings.aiRecommendation === true;

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
    try {
        const settings = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['aiRecommendation', 'aiTimeout'], (result) => {
                if (chrome.runtime.lastError) {
                    console.error('存储API错误:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });

        // 默认关闭AI推荐（需要用户手动开启）
        const aiRecommendationEnabled = settings.aiRecommendation === true;
        // 默认AI超时时间30000ms（如果用户未设置过）
        const aiTimeout = settings.aiTimeout || 30000;

        if (!aiRecommendationEnabled) {
            sendResponse({ success: false, error: 'AI推荐未启用' });
            return;
        }

        // 检查AI权限
        try {
            const availability = await LanguageModel.availability();
            if (availability !== 'available' && availability !== 'downloadable' && availability !== 'downloading') {
                throw new Error(`模型不可用，状态: ${availability}`);
            }
        } catch (error) {
            console.error('AI权限检查失败:', error);
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

        // 创建AI会话
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

        if (typeof LanguageModel === 'undefined') {
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

        let session;
        try {
            session = await LanguageModel.create({
                initialPrompts: initialPrompts
            });
        } catch (createError) {
            console.error('AI会话创建失败:', createError);
            sendResponse({
                success: false,
                error: `AI会话创建失败: ${createError.message}`
            });
            return;
        }

        // 构建用户查询，包含历史数据
        const limitedContextData = contextData.slice(0, 10); // 只取前10条
        const userQuery = `基于搜索查询"${query}"，从以下数据中推荐3个最相关的链接：

${JSON.stringify(limitedContextData, null, 2)}

请返回JSON格式的推荐结果：`;

        // 调用AI
        const promptArray = [
            {
                role: 'user',
                content: userQuery
            }
        ];

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

        let aiResponse;
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`AI timeout after ${aiTimeout} ms`)), aiTimeout);
            });

            aiResponse = await Promise.race([
                session.prompt(promptArray, { responseConstraint: recommendationSchema }),
                timeoutPromise
            ]);
        } catch (promptError) {
            console.error('AI调用失败:', promptError);
            sendResponse({
                success: false,
                error: `${promptError.message}`
            });
            return;
        }

        // 解析AI响应
        let recommendations = [];
        try {
            const responseText = aiResponse || '';
            recommendations = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析失败:', parseError);
            // 如果解析失败，尝试从文本中提取JSON
            try {
                const jsonMatch = responseText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    recommendations = JSON.parse(jsonMatch[0]);
                } else {
                    // 如果无法解析，创建默认推荐
                    recommendations = [{
                        title: "AI推荐功能测试",
                        url: "https://www.google.com",
                        reason: "这是AI推荐功能的测试推荐"
                    }];
                }
            } catch (extractError) {
                console.error('JSON提取失败:', extractError);
                recommendations = [{
                    title: "AI推荐功能测试",
                    url: "https://www.google.com",
                    reason: "这是AI推荐功能的测试推荐"
                }];
            }
        }

        sendResponse({
            success: true,
            recommendations: recommendations.slice(0, 3)
        });

    } catch (error) {
        console.error('AI推荐失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理AI模型下载请求
async function handleDownloadAIModelRequest(sendResponse) {
    try {
        const availability = await LanguageModel.availability();

        if (availability === 'available') {
            sendResponse({
                success: true,
                message: '模型已可用',
                availability: availability
            });
            return;
        }

        if (availability === 'downloading') {
            // 创建会话以监听正在进行的下载
            try {
                const session = await LanguageModel.create({
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            const progress = Math.round(e.loaded * 100);
                            chrome.runtime.sendMessage({
                                action: 'downloadProgress',
                                progress: progress,
                                loaded: e.loaded
                            }).catch(() => { });
                        });

                        m.addEventListener('downloadcomplete', () => {
                            chrome.runtime.sendMessage({
                                action: 'downloadComplete'
                            }).catch(() => { });
                        });
                    }
                });

                sendResponse({
                    success: true,
                    message: '正在监听下载进度',
                    isDownloading: true,
                    availability: availability
                });
                return;
            } catch (error) {
                console.error('设置下载进度监听器失败:', error);
                sendResponse({
                    success: false,
                    error: `监听下载进度失败: ${error.message}`,
                    availability: availability
                });
                return;
            }
        }

        if (availability !== 'downloadable') {
            sendResponse({
                success: false,
                error: `模型状态不支持下载: ${availability}`,
                availability: availability
            });
            return;
        }

        // 创建会话并开始下载
        const session = await LanguageModel.create({
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    const progress = Math.round(e.loaded * 100);
                    chrome.runtime.sendMessage({
                        action: 'downloadProgress',
                        progress: progress,
                        loaded: e.loaded
                    }).catch(() => { });
                });

                m.addEventListener('downloadcomplete', () => {
                    chrome.runtime.sendMessage({
                        action: 'downloadComplete'
                    }).catch(() => { });
                });
            }
        });

        // 重新检查模型状态
        const newAvailability = await LanguageModel.availability();

        sendResponse({
            success: true,
            message: '模型下载已开始',
            availability: newAvailability,
            sessionCreated: true
        });

    } catch (error) {
        console.error('AI模型下载失败:', error);
        sendResponse({
            success: false,
            error: `模型下载失败: ${error.message}`,
            errorDetails: error
        });
    }
}

// 处理获取所有书签请求
async function handleGetAllBookmarksRequest(sendResponse) {
    try {

        const bookmarks = await chrome.bookmarks.getTree();
        const flatBookmarks = [];

        function flattenBookmarks(nodes, parentPath = '') {
            for (const node of nodes) {
                if (node.url) {
                    // 这是一个书签，添加到结果中
                    // 移除"书签栏"前缀，如果路径以"书签栏/"开头则去掉
                    let cleanPath = parentPath || '';
                    if (cleanPath.startsWith('书签栏/')) {
                        cleanPath = cleanPath.substring(3); // 移除"书签栏/"（3个字符）
                    } else if (cleanPath === '书签栏') {
                        cleanPath = ''; // 如果就是"书签栏"，则设为空
                    }

                    // 移除路径开头的"/"分隔符
                    if (cleanPath.startsWith('/')) {
                        cleanPath = cleanPath.substring(1);
                    }

                    flatBookmarks.push({
                        ...node,
                        folderPath: cleanPath
                    });
                }
                if (node.children) {
                    // 这是一个文件夹，递归处理子项
                    const currentPath = parentPath ? `${parentPath}/${node.title}` : node.title;
                    flattenBookmarks(node.children, currentPath);
                }
            }
        }

        flattenBookmarks(bookmarks);

        sendResponse({
            success: true,
            results: flatBookmarks
        });
    } catch (error) {
        console.error('获取书签失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理删除书签请求
async function handleDeleteBookmarkRequest(bookmarkId, sendResponse) {
    try {
        await chrome.bookmarks.remove(bookmarkId);

        sendResponse({
            success: true,
            message: '书签删除成功'
        });
    } catch (error) {
        console.error('删除书签失败:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

// 处理窗口合并请求
async function handleMergeWindowsRequest(sourceWindowId, targetWindowId, sendResponse) {
    try {
        // 参数验证
        if (!sourceWindowId || !targetWindowId) {
            throw new Error('源窗口ID和目标窗口ID不能为空');
        }

        if (sourceWindowId === targetWindowId) {
            throw new Error('源窗口和目标窗口不能相同');
        }

        // 检查窗口是否存在
        const windows = await chrome.windows.getAll();
        const sourceWindow = windows.find(w => w.id === sourceWindowId);
        const targetWindow = windows.find(w => w.id === targetWindowId);

        if (!sourceWindow) {
            throw new Error(`源窗口 ${sourceWindowId} 不存在`);
        }

        if (!targetWindow) {
            throw new Error(`目标窗口 ${targetWindowId} 不存在`);
        }

        // 获取源窗口的所有标签页
        const sourceTabs = await chrome.tabs.query({ windowId: sourceWindowId });

        if (!sourceTabs || sourceTabs.length === 0) {
            throw new Error('源窗口没有标签页');
        }

        // 检查目标窗口是否已关闭
        if (targetWindow.state === 'minimized') {
            try {
                await chrome.windows.update(targetWindowId, { state: 'normal' });
            } catch (error) {
                console.warn('恢复目标窗口失败:', error.message);
            }
        }

        // 执行标签页移动
        const tabIds = sourceTabs.map(tab => tab.id);

        try {
            await chrome.tabs.move(tabIds, {
                windowId: targetWindowId,
                index: -1 // 移动到目标窗口末尾
            });
        } catch (error) {
            throw new Error(`标签页移动失败: ${error.message}`);
        }

        // 关闭源窗口
        try {
            await chrome.windows.remove(sourceWindowId);
        } catch (error) {
            console.warn('标签页已移动，但源窗口关闭失败');
        }

        // 验证合并结果
        const remainingTabs = await chrome.tabs.query({ windowId: sourceWindowId });
        const targetTabs = await chrome.tabs.query({ windowId: targetWindowId });

        sendResponse({
            success: true,
            message: `成功将 ${sourceTabs.length} 个标签页合并到目标窗口`,
            mergedTabsCount: sourceTabs.length,
            targetWindowTabsCount: targetTabs.length
        });

    } catch (error) {
        console.error('窗口合并失败:', error);

        // 根据错误类型提供更详细的错误信息
        let errorMessage = error.message;

        if (error.message.includes('No tab with id')) {
            errorMessage = '标签页不存在或已被关闭';
        } else if (error.message.includes('No window with id')) {
            errorMessage = '窗口不存在或已被关闭';
        } else if (error.message.includes('Cannot move tabs')) {
            errorMessage = '无法移动标签页，可能权限不足';
        } else if (error.message.includes('Cannot modify')) {
            errorMessage = '无法修改标签页，可能受到浏览器限制';
        }

        sendResponse({
            success: false,
            error: errorMessage,
            errorDetails: error.message
        });
    }
}

// 处理创建标签页请求
async function handleCreateTabRequest(url, sendResponse) {
    try {
        const tab = await chrome.tabs.create({ url: url });
        sendResponse({ success: true, tabId: tab.id });
    } catch (error) {
        console.error('创建标签页失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 处理获取最近历史记录请求
async function handleGetRecentHistoryRequest(limit, sendResponse) {
    try {

        const endTime = Date.now();
        const startTime = endTime - (7 * 24 * 60 * 60 * 1000); // 最近7天

        chrome.history.search({
            text: '',
            startTime: startTime,
            endTime: endTime,
            maxResults: limit * 3 // 获取更多结果用于去重
        }, (historyItems) => {
            if (chrome.runtime.lastError) {
                console.error('历史记录搜索错误:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            // 按访问时间排序（从新到旧）
            historyItems.sort((a, b) => b.lastVisitTime - a.lastVisitTime);

            // URL去重：去掉?之前的部分进行去重
            const urlMap = new Map();
            const uniqueHistoryItems = [];

            for (const item of historyItems) {
                if (!item.url) continue;

                // 去掉URL中?之前的部分作为去重键
                const urlKey = item.url.split('?')[0];

                if (!urlMap.has(urlKey)) {
                    urlMap.set(urlKey, true);
                    uniqueHistoryItems.push({
                        title: item.title,
                        url: item.url,
                        type: 'history',
                        lastVisitTime: item.lastVisitTime,
                        visitCount: item.visitCount
                    });

                    // 达到限制数量就停止
                    if (uniqueHistoryItems.length >= limit) {
                        break;
                    }
                }
            }

            sendResponse({
                success: true,
                results: uniqueHistoryItems
            });
        });
    } catch (error) {
        console.error('获取最近历史记录失败:', error);
        sendResponse({ success: false, error: error.message });
    }
}

