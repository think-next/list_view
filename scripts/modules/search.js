// search.js - Auto-extracted module for SearchModal
// Part of the List View Chrome extension

(function() {
    'use strict';

// Search history management (recent 10 queries)
SearchModal.prototype.saveSearchHistory = function(query) {
    if (!query) return;
    chrome.storage.local.get(['searchHistory'], (result) => {
        let history = result.searchHistory || [];
        history = history.filter(item => item !== query);
        history.unshift(query);
        if (history.length > 10) history = history.slice(0, 10);
        chrome.storage.local.set({ searchHistory: history });
    });
};

SearchModal.prototype.showSearchHistory = function() {
    chrome.storage.local.get(['searchHistory'], (result) => {
        const history = result.searchHistory || [];
        if (history.length === 0) return;
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        const loadingIndicator = this.modal.querySelector('#loadingIndicator');
        loadingIndicator.style.display = 'none';
        const historyHTML = `
            <div class="search-history-section">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;">
                    <span style="font-size:12px;color:#6c757d;font-weight:600;">Recent Searches</span>
                    <button id="clearSearchHistory" style="background:none;border:none;color:#94a3b8;font-size:11px;cursor:pointer;padding:2px 6px;">Clear all</button>
                </div>
                ${history.map(item => `
                    <div class="search-history-item" data-query="${this.escapeHtml(item)}" style="padding:8px 12px;margin-bottom:4px;background:#f8fafc;border-radius:8px;cursor:pointer;font-size:13px;color:#475569;transition:all 0.15s ease;border:1px solid #e2e8f0;">\n\t\t\t\t\t\t\t\t\t🕐 ${this.escapeHtml(item)}\n\t\t\t\t\t\t\t\t</div>
                `).join('')}
            </div>
        `;
        resultsContainer.innerHTML = historyHTML;
        resultsContainer.querySelectorAll('.search-history-item').forEach(el => {
            el.addEventListener('click', () => {
                const q = el.dataset.query;
                const searchInput = this.modal.querySelector('#searchInput');
                searchInput.value = q;
                this.searchBookmarksAndHistory(q);
            });
            el.addEventListener('mouseenter', () => { el.style.background = '#e2e8f0'; });
            el.addEventListener('mouseleave', () => { el.style.background = '#f8fafc'; });
        });
        const clearBtn = document.getElementById('clearSearchHistory');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.storage.local.set({ searchHistory: [] });
                this.showWelcomeMessage();
            });
        }
    });
};

SearchModal.prototype.searchBookmarksAndHistory = async function(query) {
    if (!query.trim()) {
        // 空查询时，根据当前过滤器状态显示相应内容
        if (this.activeFilter === 'history') {
            console.log('历史记录模式下空查询，显示最近20条历史记录');
            this.loadRecentHistory();
        } else {
            this.showWelcomeMessage();
        }
        return;
    }

    // 隐藏历史统计区域
    const historyStatsSection = this.modal.querySelector('#historyStatsSection');
    if (historyStatsSection) {
        historyStatsSection.style.display = 'none';
    }

    this.showLoading();

    try {
        // 如果有选定的分组且是书签模式，在分组内搜索
        if (this.currentSelectedFolder && this.activeFilter === 'bookmark') {
            this.searchInFolder(query);
            return;
        }

        // 如果有选定的分组且在默认搜索模式下，在分组内搜索
        if (this.currentSelectedFolder && !this.activeFilter) {
            this.searchInFolder(query);
            return;
        }

        // 通过消息传递请求background script进行搜索
        const response = await this.sendMessageToBackground({
            action: 'searchBookmarksAndHistory',
            query: query,
            filter: this.activeFilter
        });

        if (response.success) {
            // Save to search history
            this.saveSearchHistory(query);

            if (response.isGrouped) {
                this.displayGroupedResults(response.results);
            } else if (this.activeFilter === 'bookmark') {
                // 书签模式下使用书签展示方式
                this.displayBookmarkResults(response.results);
            } else {
                // 默认搜索模式：保存搜索结果用于后续恢复
                this.results = response.results;
                this._currentQuery = query;
                this.displayResults(response.results, query);
            }

            // 注意：AI推荐现在只在手动触发时调用
        } else {
            console.error('搜索失败:', response.error);
            this.showError('Search failed. Please try again.');
        }
    } catch (error) {
        console.error('搜索出错:', error);
        this.showError('Search failed. Please try again.');
    }
    }

    // 发送消息到background script

SearchModal.prototype.sendMessageToBackground = async function(message, retryCount = 0) {
    console.log('📤 发送消息到background script:', message);

    return new Promise((resolve, reject) => {
        // 检查是否已被取消
        if (message.signal && message.signal.aborted) {
            reject(new Error('请求已被取消'));
            return;
        }

        // 设置取消监听
        if (message.signal) {
            message.signal.addEventListener('abort', () => {
                reject(new Error('请求已被取消'));
            });
        }

        chrome.runtime.sendMessage(message, (response) => {
            console.log('📨 收到background script响应:', response);

            if (chrome.runtime.lastError) {
                console.error('❌ 消息传递错误:', chrome.runtime.lastError);
                console.error('❌ 错误详情:', chrome.runtime.lastError.message);

                // 如果是连接错误且重试次数小于3，则重试
                if (chrome.runtime.lastError.message.includes('Could not establish connection') && retryCount < 3) {
                    console.log(`🔄 连接失败，正在重试 (${retryCount + 1}/3)...`);
                    setTimeout(() => {
                        this.sendMessageToBackground(message, retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, 1000 * (retryCount + 1)); // 递增延迟
                    return;
                }

                reject(new Error(chrome.runtime.lastError.message));
            } else {
                console.log('start handle resolve 1596:', response);
                resolve(response);
            }
        });
    });
    }

    // 显示加载状态

SearchModal.prototype.loadRecentHistory = async function() {
    try {
        console.log('开始加载最近的历史记录');
        this.showLoading();

        // 通过消息传递请求background script获取最近的历史记录
        const response = await this.sendMessageToBackground({
            action: 'getRecentHistory',
            limit: 20
        });

        if (response.success) {
            console.log('获取历史记录成功:', response.results);
            this.displayResults(response.results);
        } else {
            console.error('获取历史记录失败:', response.error);
            this.showError('Failed to load history. Please try again.');
        }
    } catch (error) {
        console.error('加载历史记录出错:', error);
        this.showError('Error loading history.');
    }
    }

    // 显示错误信息

SearchModal.prototype.handleInputChange = function(query) {
    // 检查是否以 "list" 开头（兼容大小写）
    if (query.toLowerCase() === 'list') {
        this.showFilterDropdown();
        return;
    }

    if (query.toLowerCase() === 'list stats') {
        this.hideFilterDropdown();
        this.loadHistoryStats();
        return;
    }

    // 隐藏过滤器下拉列表
    this.hideFilterDropdown();

    // 如果是标签页过滤器，在已有标签页基础上过滤
    if (this.activeFilter === 'tab') {
        this.filterTabs(query);
        return;
    }

    // 注意：现在搜索只在点击按钮或按Enter时触发
    // 实时输入只用于过滤和显示提示
    if (query.length === 0) {
        this.showWelcomeMessage();
    } else {
        // 在list模式下不显示AI推荐UI
        if (this.activeFilter) {
            // 移除已有AI UI，避免状态不一致
            this.removeAIUI();
            return;
        }

        // 仅在默认搜索模式下显示AI推荐UI
        this.checkAIEnabled()
            .then(enabled => {
                // 移除已有AI UI，避免状态不一致
                this.removeAIUI();
                if (enabled) {
                    this.showAIModelDetectionModal(query);
                }
            })
            .catch(() => {
                // 配置读取失败时，默认不显示AI UI
                this.removeAIUI();
            });
    }
    }

    // 显示过滤器下拉列表

SearchModal.prototype.filterTabs = function(query) {
    console.log('过滤标签页，查询:', query);

    if (!this.allTabs) {
        console.log('没有标签页数据，重新加载');
        this.loadAllTabs();
        return;
    }

    if (!query || query.trim() === '') {
        // 如果没有查询条件，显示所有标签页
        this.displayGroupedResults(this.allTabs);
        return;
    }

    // 在已有标签页数据基础上过滤
    const filteredGroups = this.allTabs.map(group => {
        const filteredTabs = group.tabs.filter(tab =>
            tab.title.toLowerCase().includes(query.toLowerCase()) ||
            tab.url.toLowerCase().includes(query.toLowerCase())
        );

        return {
            ...group,
            tabs: filteredTabs
        };
    }).filter(group => group.tabs.length > 0); // 只保留有标签页的组

    this.displayGroupedResults(filteredGroups);
    }

    // 切换到指定标签页

SearchModal.prototype.searchInFolder = function(query) {
    console.log(`在分组 "${this.currentSelectedFolder}" 内搜索:`, query);

    // 获取该分组下的所有书签
    const folderBookmarks = this.allBookmarks.filter(bookmark =>
        bookmark.folderPath === this.currentSelectedFolder
    );

    // 在分组内搜索匹配的书签
    const searchResults = folderBookmarks.filter(bookmark => {
        const title = bookmark.title.toLowerCase();
        const url = bookmark.url.toLowerCase();
        const searchTerm = query.toLowerCase();

        return title.includes(searchTerm) || url.includes(searchTerm);
    });

    console.log(`在分组内找到 ${searchResults.length} 个匹配的书签`);

    // 显示搜索结果
    this.displayBookmarkResults(searchResults);
    }

    // 删除书签

SearchModal.prototype.loadHistoryStats = async function() {
    const historyStatsSection = this.modal.querySelector('#historyStatsSection');
    const statsContainer = this.modal.querySelector('#statsContainer');

    // 显示统计区域
    historyStatsSection.style.display = 'block';

    // 显示加载状态
    statsContainer.innerHTML = `
        <div class="stats-loading">
            <div class="spinner"></div>
            <span>Loading stats...</span>
        </div>
    `;

    try {
        // 请求历史统计
        const response = await this.sendMessageToBackground({
            action: 'getHistoryStats'
        });

        if (response.success) {
            this.displayHistoryStats(response.stats);
        } else {
            console.error('获取历史统计失败:', response.error);
            this.showStatsError('Failed to load stats. Please try again.');
        }
    } catch (error) {
        console.error('历史统计请求出错:', error);
        this.showStatsError('Error loading stats.');
    }
    }

    // 显示历史统计

SearchModal.prototype.displayHistoryStats = function(stats) {
    const statsContainer = this.modal.querySelector('#statsContainer');

    if (!stats || stats.length === 0) {
        statsContainer.innerHTML = `
            <div class="no-stats">
                <p>📊 No activity in the last 7 days</p>
                <p>Activity will appear here after you browse</p>
            </div>
        `;
        return;
    }

    const statsHTML = stats.map(domain => {
        const domainIcon = this.getDomainIcon(domain.domain);
        const pathsHTML = domain.paths.map(path => `
            <div class="path-item" data-path="${this.escapeHtml(path.path)}" data-domain="${this.escapeHtml(domain.domain)}">
                <div class="path-info">
                    <div class="path-title">${this.escapeHtml(path.title || 'Untitled')}</div>
                </div>
                <div class="path-count">${path.count}</div>
            </div>
        `).join('');

        return `
            <div class="domain-group">
                <div class="domain-header">
                    <div class="domain-name">
                        <div class="domain-icon">${domainIcon}</div>
                        ${this.escapeHtml(domain.domain)}
                    </div>
                    <div class="domain-visits">Total visits: ${domain.totalVisits}</div>
                </div>
                <div class="paths-list">
                    ${pathsHTML}
                </div>
            </div>
        `;
    }).join('');

    statsContainer.innerHTML = statsHTML;

    // 添加路径点击事件
    statsContainer.querySelectorAll('.path-item').forEach(item => {
        item.addEventListener('click', () => {
            const domain = item.dataset.domain;
            const path = item.dataset.path;
            const fullUrl = `https://${domain}${path}`;
            window.open(fullUrl, '_blank');
            this.close();
        });
    });
    }

    // 获取域名图标

SearchModal.prototype.getDomainIcon = function(domain) {
    // 提取域名首字母作为图标
    const firstChar = domain.charAt(0).toUpperCase();
    return firstChar;
    }

    // 显示统计错误

SearchModal.prototype.showStatsError = function(message) {
    const statsContainer = this.modal.querySelector('#statsContainer');
    statsContainer.innerHTML = `
        <div class="no-stats">
            <p>❌ ${message}</p>
        </div>
    `;
    }

    // 编辑窗口名称
})();
