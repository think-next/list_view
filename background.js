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

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'contentScriptReady') {
        console.log('Content script已就绪:', request.url);
        sendResponse({ success: true });
    } else if (request.action === 'searchBookmarksAndHistory') {
        // 处理搜索请求
        handleSearchRequest(request.query, sendResponse);
        return true; // 保持消息通道开放
    } else if (request.action === 'getHistoryStats') {
        // 处理历史统计请求
        handleHistoryStatsRequest(sendResponse);
        return true; // 保持消息通道开放
    }
    return true;
});

// 处理搜索请求
async function handleSearchRequest(query, sendResponse) {
    try {
        console.log('开始搜索:', query);

        // 并行搜索书签和历史记录
        const [bookmarks, history] = await Promise.all([
            searchBookmarks(query),
            searchHistory(query)
        ]);

        // 合并结果并按时间排序
        const allResults = [...bookmarks, ...history];
        allResults.sort((a, b) => new Date(b.lastVisitTime || b.dateAdded) - new Date(a.lastVisitTime || a.dateAdded));

        // 返回前12条结果
        sendResponse({
            success: true,
            results: allResults.slice(0, 12)
        });

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
