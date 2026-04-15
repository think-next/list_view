// tabs.js - Auto-extracted module for SearchModal
// Part of the List View Chrome extension

(function() {
    'use strict';

// Batch selection state
SearchModal.prototype.selectedTabIds = new Set();
SearchModal.prototype.lastClickedTabId = null;

SearchModal.prototype.toggleTabSelection = function(tabId, e) {
    if (e && e.shiftKey && this.lastClickedTabId !== null) {
        // Shift+Click: range select
        const visibleItems = Array.from(this.modal.querySelectorAll('.tab-item:not(.window-hidden .tab-item)') || this.modal.querySelectorAll('.tab-item'));
        const ids = visibleItems.map(el => parseInt(el.dataset.tabId)).filter(id => !isNaN(id));
        const lastIdx = ids.indexOf(this.lastClickedTabId);
        const curIdx = ids.indexOf(tabId);
        if (lastIdx !== -1 && curIdx !== -1) {
            const start = Math.min(lastIdx, curIdx);
            const end = Math.max(lastIdx, curIdx);
            for (let i = start; i <= end; i++) this.selectedTabIds.add(ids[i]);
        }
    } else if (this.selectedTabIds.has(tabId)) {
        this.selectedTabIds.delete(tabId);
    } else {
        this.selectedTabIds.add(tabId);
    }
    this.lastClickedTabId = tabId;
    this.updateBatchSelectionUI();
};

SearchModal.prototype.updateBatchSelectionUI = function() {
    this.modal.querySelectorAll('.tab-item').forEach(item => {
        const tabId = parseInt(item.dataset.tabId);
        const cb = item.querySelector('.batch-checkbox');
        if (this.selectedTabIds.has(tabId)) {
            item.style.outline = '2px solid #2563eb';
            item.style.outlineOffset = '-1px';
            if (cb) cb.textContent = '☑';
        } else {
            item.style.outline = '';
            item.style.outlineOffset = '';
            if (cb) cb.textContent = '☐';
        }
    });
    // Show/hide batch action bar
    let bar = this.modal.querySelector('#batchActionBar');
    if (this.selectedTabIds.size > 0) {
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'batchActionBar';
            bar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 20px;background:#2563eb;color:white;font-size:13px;font-weight:500;position:sticky;bottom:0;z-index:10;border-radius:0 0 16px 16px;';
            bar.innerHTML = `<span id="batchCount">0 selected</span><button id="batchCloseBtn" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Close Selected</button><button id="batchMoveBtn" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Move to New Window</button><button id="batchCancelBtn" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">Cancel</button>`;
            const modalBody = this.modal.querySelector('.modal-body');
            modalBody.appendChild(bar);
            bar.querySelector('#batchCloseBtn').addEventListener('click', () => this.batchCloseSelected());
            bar.querySelector('#batchMoveBtn').addEventListener('click', () => this.batchMoveToNewWindow());
            bar.querySelector('#batchCancelBtn').addEventListener('click', () => { this.selectedTabIds.clear(); this.lastClickedTabId = null; this.updateBatchSelectionUI(); });
        }
        bar.style.display = 'flex';
        bar.querySelector('#batchCount').textContent = `${this.selectedTabIds.size} selected`;
    } else if (bar) {
        bar.style.display = 'none';
    }
};

SearchModal.prototype.batchCloseSelected = function() {
    const ids = [...this.selectedTabIds];
    this.selectedTabIds.clear();
    this.lastClickedTabId = null;
    this.updateBatchSelectionUI();
    ids.forEach(tabId => chrome.tabs.remove(tabId, () => { if (!chrome.runtime.lastError) this.removeTabFromResults(tabId, 0); }));
};

SearchModal.prototype.batchMoveToNewWindow = function() {
    const ids = [...this.selectedTabIds];
    this.selectedTabIds.clear();
    this.lastClickedTabId = null;
    this.updateBatchSelectionUI();
    chrome.windows.create({ tabId: ids[0] }, (win) => {
        if (ids.length > 1) chrome.tabs.move(ids.slice(1), { windowId: win.id, index: -1 });
        this.loadAllTabs();
    });
};

SearchModal.prototype.displayGroupedResults = function(windowGroups) {
    Logger.info('显示分组结果:', windowGroups);
    const loadingIndicator = this.modal.querySelector('#loadingIndicator');
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    loadingIndicator.style.display = 'none';

    // 保存AI推荐模块（如果存在）
    const aiDetection = resultsContainer.querySelector('.ai-detection');

    // 保存分组结果
    this.results = [];
    this.windowGroups = windowGroups;
    this.selectedIndex = -1; // 重置选中状态

    // 将所有标签页展平到results数组中，用于键盘导航
    windowGroups.forEach(group => {
        // 对tabs进行排序（与显示逻辑保持一致）
        const sortedTabs = [...group.tabs].sort((a, b) => {
            const urlA = a.url.split('?')[0].toLowerCase();
            const urlB = b.url.split('?')[0].toLowerCase();
            return urlA.localeCompare(urlB);
        });

        sortedTabs.forEach(tab => {
            this.results.push({
                ...tab,
                type: 'tab',
                windowTitle: group.windowTitle
            });
        });
    });

    if (windowGroups.length === 0) {
        Logger.info('没有找到窗口组');
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No matching tabs found</p>
                <p>Try different keywords</p>
            </div>
        `;

        // 如果有AI推荐模块，重新插入到最前面
        if (aiDetection) {
            resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
        }
        return;
    }

    // 添加窗口Tab导航（仅当有多个窗口时显示）
    let windowTabsHTML = '';
    if (windowGroups.length > 1) {
        windowTabsHTML = `
            <div class="window-tabs-container">
                <div class="window-tabs">
                    ${windowGroups.map((group, index) => {
            const displayName = this.getWindowName(group.windowId, group.windowTitle);
            return `
                            <button class="window-tab" data-window-id="${group.windowId}" data-group-index="${index}">
                                <span class="window-tab-name">${this.escapeHtml(displayName)}</span>
                                <span class="window-tab-count">${group.tabs.length}</span>
                            </button>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    const groupsHTML = windowGroups.map((group, groupIndex) => {
        // 对当前窗口组内的tabs按URL排序
        const sortedTabs = [...group.tabs].sort((a, b) => {
            // 去掉URL中?的部分进行排序
            const urlA = a.url.split('?')[0].toLowerCase();
            const urlB = b.url.split('?')[0].toLowerCase();
            return urlA.localeCompare(urlB);
        });

        // 检测Duptab
        const urlCount = this.findDuplicateUrls(sortedTabs);

        const tabsHTML = sortedTabs.map((tab, tabIndex) => {
            const truncatedUrl = this.truncateUrl(tab.url);
            const isActive = tab.active ? 'active' : '';
            const isPinned = tab.pinned ? 'pinned' : '';
            const isDuplicate = (urlCount.get(this.getBaseUrl(tab.url)) || 0) > 1 ? 'duplicate' : '';
            const duplicateBadge = isDuplicate ? '<span class="duplicate-badge">Dup</span>' : '';

            return `
                <div class="result-item tab-item ${isActive} ${isPinned} ${isDuplicate}" 
                     data-url="${tab.url}" 
                     data-tab-id="${tab.tabId}" 
                     data-window-id="${tab.windowId}">
                    <div class="result-header">
                        <div class="result-header-left">
                            <span class="batch-checkbox" data-tab-id="${tab.tabId}" style="cursor:pointer;font-size:14px;margin-right:4px;user-select:none;flex-shrink:0;">☐</span>
                            <img class="tab-favicon" src="${this.getFaviconUrl(tab.url)}" onerror="this.style.display='none'" alt="">
                            <span class="result-title">${this.escapeHtml(tab.title)}</span>
                            ${duplicateBadge}
                            ${tab.pinned ? '<span class="pinned-indicator">📌</span>' : ''}
                        </div>
                        <div class="tab-actions">
                            <button class="close-tab-btn" data-tab-id="${tab.tabId}" title="Close tab">×</button>
                        </div>
                    </div>
                    <div class="result-url">${this.escapeHtml(truncatedUrl)}</div>
                </div>
            `;
        }).join('');

        // 使用保存的窗口名称，如果没有则使用默认名称
        const displayName = this.getWindowName(group.windowId, group.windowTitle);

        // 检查是否有多个窗口（用于决定是否显示菜单按钮）
        const hasMultipleWindows = windowGroups.length > 1;

        return `
            <div class="window-group">
                <div class="window-header">
                    <div class="window-title-container">
                        <h4 class="window-title${hasMultipleWindows ? ' has-menu' : ''}" data-window-id="${group.windowId}" title="Click to rename window">${this.escapeHtml(displayName)}</h4>
                        <!-- 排序按钮：单独升序与降序 -->
                        <button class="window-sort-btn window-sort-asc" data-window-id="${group.windowId}" title="Sort Ascending">
                            <span class="window-sort-icon">↑</span>
                        </button>
                        <button class="window-sort-btn window-sort-desc" data-window-id="${group.windowId}" title="Sort Descending">
                            <span class="window-sort-icon">↓</span>
                        </button>
                        ${hasMultipleWindows ? `<button class="window-menu-btn" data-window-id="${group.windowId}" title="合并窗口">merge</button>` : ''}
                    </div>
                    <span class="tab-count">${group.tabs.length} tabs</span>
                </div>
                <div class="tabs-list">
                    ${tabsHTML}
                </div>
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = windowTabsHTML + groupsHTML;

    // 如果有AI推荐模块，重新插入到最前面
    if (aiDetection) {
        resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
    }

    // 绑定窗口Tab导航事件
    this.bindWindowTabEvents();

    // 初始化窗口索引，默认选中当前窗口
    const currentWindowId = this._currentWindowId || null;
    let defaultIndex = 0;
    if (currentWindowId) {
        const idx = windowGroups.findIndex(g => g.windowId === currentWindowId);
        if (idx !== -1) defaultIndex = idx;
    }
    this.activeWindowIndex = defaultIndex;
    const defaultWindowTab = this.modal.querySelector(`.window-tab[data-group-index="${defaultIndex}"]`);
    if (defaultWindowTab) {
        this.updateWindowTabSelection(defaultWindowTab);
        this.switchToWindowGroup(defaultIndex);
        // 在当前窗口分组中高亮活跃tab并滚动到可见
        const activeGroup = windowGroups[defaultIndex];
        if (activeGroup) {
            const activeTabIndex = activeGroup.tabs.findIndex(t => t.active);
            if (activeTabIndex !== -1) {
                const visibleItems = this.modal.querySelectorAll('.window-group:not(.window-hidden) .result-item.tab-item');
                if (visibleItems[activeTabIndex]) {
                    visibleItems[activeTabIndex].classList.add('selected');
                    // 同步 selectedIndex 到 DOM 数组中的真实位置
                    const allVisibleItems = this.modal.querySelectorAll('.window-group:not(.window-hidden) .result-item');
                    this.selectedIndex = Array.from(allVisibleItems).indexOf(visibleItems[activeTabIndex]);
                    visibleItems[activeTabIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
            }
        }
    }

    // 添加窗口名称编辑事件
    this.modal.querySelectorAll('.window-title').forEach(titleElement => {
        titleElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editWindowName(titleElement);
        });
    });

    // 添加窗口排序按钮事件（升序/降序分别绑定）
    this.modal.querySelectorAll('.window-sort-asc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const windowId = parseInt(btn.dataset.windowId);
            this.applySortForWindow(windowId, 'asc', btn);
        });
    });
    this.modal.querySelectorAll('.window-sort-desc').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const windowId = parseInt(btn.dataset.windowId);
            this.applySortForWindow(windowId, 'desc', btn);
        });
    });

    // 添加在真实窗口中应用排序的逻辑（升序/降序按钮会直接在UI与真实窗口内生效）

    // 添加窗口菜单事件
    this.modal.querySelectorAll('.window-menu-btn').forEach(menuBtn => {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showWindowMenu(menuBtn, windowGroups);
        });
    });

    // 添加点击事件
    this.modal.querySelectorAll('.tab-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 如果点击的是关闭按钮，不切换标签页
            if (e.target.classList.contains('close-tab-btn')) {
                e.stopPropagation();
                return;
            }

            const tabId = parseInt(item.dataset.tabId);
            const windowId = parseInt(item.dataset.windowId);
            if (e.target.classList.contains('batch-checkbox')) {
                this.toggleTabSelection(tabId, e);
                e.stopPropagation();
                return;
            }
            this.switchToTab(tabId, windowId);
        });
    });

    // 添加关闭按钮事件
    this.modal.querySelectorAll('.close-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = parseInt(btn.dataset.tabId);
            this.closeTab(tabId);
        });
    });
    }

    // 加载当前的maxResults配置

SearchModal.prototype.loadAllTabs = async function() {
    try {
        Logger.info('开始加载所有标签页');
        this.showLoading();

        // 通过消息传递请求background script获取所有标签页
        const response = await this.sendMessageToBackground({
            action: 'getAllTabs'
        });

        if (response.success) {
            Logger.info('获取标签页成功:', response.results);
            this.allTabs = response.results; // 保存所有标签页数据
            this.displayGroupedResults(response.results);
        } else {
            Logger.error('获取标签页失败:', response.error);
            this.showError('Failed to load tabs. Please try again.');
        }
    } catch (error) {
        Logger.error('加载标签页出错:', error);
        this.showError('Error loading tabs.');
    }
    }

    // 加载所有书签

SearchModal.prototype.switchToTab = async function(tabId, windowId) {
    try {
        Logger.info('请求切换标签页:', tabId, '窗口:', windowId);

        // 通过消息传递到background script处理
        const response = await this.sendMessageToBackground({
            action: 'switchToTab',
            tabId: tabId,
            windowId: windowId
        });

        if (response.success) {
            Logger.info('成功切换到标签页:', tabId);
            this.close();
        } else {
            Logger.error('切换标签页失败:', response.error);
        }
    } catch (error) {
        Logger.error('切换标签页出错:', error);
    }
    }

    // 关闭标签页

SearchModal.prototype.closeTab = async function(tabId) {
    try {
        Logger.info('请求关闭标签页:', tabId);

        // 记录当前选中的索引
        const currentIndex = this.selectedIndex;
        const currentResult = this.results[currentIndex];

        // 通过消息传递到background script处理
        const response = await this.sendMessageToBackground({
            action: 'closeTab',
            tabId: tabId
        });

        if (response.success) {
            Logger.info('成功关闭标签页:', tabId);

            // 从当前结果中移除被关闭的tab
            this.removeTabFromResults(tabId, currentIndex);
        } else {
            Logger.error('关闭标签页失败:', response.error);
        }
    } catch (error) {
        Logger.error('关闭标签页出错:', error);
    }
    }

    // 从结果中移除指定的tab并保持选择状态

SearchModal.prototype.removeTabFromResults = function(tabId, currentIndex) {
    // 从results数组中移除被关闭的tab
    const tabIndex = this.results.findIndex(result => result.tabId === tabId);
    if (tabIndex !== -1) {
        this.results.splice(tabIndex, 1);
    }

    // 调整选择索引
    let newIndex = currentIndex;
    if (tabIndex !== -1) {
        if (tabIndex < currentIndex) {
            // 如果被删除的tab在当前选中tab之前，索引需要减1
            newIndex = currentIndex - 1;
        } else if (tabIndex === currentIndex) {
            // 如果被删除的就是当前选中的tab，选择前一个
            newIndex = Math.max(0, currentIndex - 1);
        }
        // 如果被删除的tab在当前选中tab之后，索引不变
    }

    // 确保索引不超出范围
    if (newIndex >= this.results.length) {
        newIndex = Math.max(0, this.results.length - 1);
    }

    // 更新选择状态
    this.selectedIndex = newIndex;

    // 重新渲染结果
    this.refreshResultsDisplay();

    // 如果还有结果，更新选择状态
    if (this.results.length > 0) {
        this.updateSelection();
    }
    }

    // 刷新结果显示（不重新获取数据）

SearchModal.prototype.refreshResultsDisplay = function() {
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    if (!resultsContainer) return;

    // 保存AI推荐模块（如果存在）
    const aiDetection = resultsContainer.querySelector('.ai-detection');

    if (this.results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No results. Try different keywords.</p>
            </div>
        `;
    } else {
        // 检查当前是否在tab搜索模式（有windowGroups数据）
        if (this.windowGroups && this.windowGroups.length > 0) {
            // 使用分组显示格式（tab搜索页面）
            this.refreshGroupedResultsDisplay();
        } else {
            // 使用简单列表格式（默认搜索页面）
            this.refreshSimpleResultsDisplay(this._currentQuery || '');
        }
    }

    // 如果有AI推荐模块，重新插入到最前面
    if (aiDetection) {
        resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
    }
    }

    // 刷新分组结果显示（tab搜索页面）

SearchModal.prototype.refreshGroupedResultsDisplay = function() {
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    if (!resultsContainer) return;

    // 重新构建windowGroups数据
    const windowGroups = this.rebuildWindowGroups();

    const groupsHTML = windowGroups.map((group, groupIndex) => {
        // 对当前窗口组内的tabs按URL排序
        const sortedTabs = [...group.tabs].sort((a, b) => {
            // 去掉URL中?的部分进行排序
            const urlA = a.url.split('?')[0].toLowerCase();
            const urlB = b.url.split('?')[0].toLowerCase();
            return urlA.localeCompare(urlB);
        });

        // 检测Duptab
        const urlCount = this.findDuplicateUrls(sortedTabs);

        const tabsHTML = sortedTabs.map((tab, tabIndex) => {
            const truncatedUrl = this.truncateUrl(tab.url);
            const isActive = tab.active ? 'active' : '';
            const isPinned = tab.pinned ? 'pinned' : '';
            const isDuplicate = (urlCount.get(this.getBaseUrl(tab.url)) || 0) > 1 ? 'duplicate' : '';
            const duplicateBadge = isDuplicate ? '<span class="duplicate-badge">Dup</span>' : '';

            return `
                <div class="result-item tab-item ${isActive} ${isPinned} ${isDuplicate}" 
                     data-url="${tab.url}" 
                     data-tab-id="${tab.tabId}" 
                     data-window-id="${tab.windowId}">
                    <div class="result-header">
                        <div class="result-header-left">
                            <span class="batch-checkbox" data-tab-id="${tab.tabId}" style="cursor:pointer;font-size:14px;margin-right:4px;user-select:none;flex-shrink:0;">☐</span>
                            <img class="tab-favicon" src="${this.getFaviconUrl(tab.url)}" onerror="this.style.display='none'" alt="">
                            <span class="result-title">${this.escapeHtml(tab.title)}</span>
                            ${duplicateBadge}
                            ${tab.pinned ? '<span class="pinned-indicator">📌</span>' : ''}
                        </div>
                        <div class="tab-actions">
                            <button class="close-tab-btn" data-tab-id="${tab.tabId}" title="Close tab">×</button>
                        </div>
                    </div>
                    <div class="result-url">${this.escapeHtml(truncatedUrl)}</div>
                </div>
            `;
        }).join('');

        // 使用保存的窗口名称，如果没有则使用默认名称
        const displayName = this.getWindowName(group.windowId, group.windowTitle);

        // 检查是否有多个窗口（用于决定是否显示菜单按钮）
        const hasMultipleWindows = windowGroups.length > 1;

        return `
            <div class="window-group">
                <div class="window-header">
                    <div class="window-title-container">
                        <h4 class="window-title${hasMultipleWindows ? ' has-menu' : ''}" data-window-id="${group.windowId}" title="Click to rename window">${this.escapeHtml(displayName)}</h4>
                        ${hasMultipleWindows ? `<button class="window-menu-btn" data-window-id="${group.windowId}" title="合并窗口">merge</button>` : ''}
                    </div>
                    <span class="tab-count">${group.tabs.length} tabs</span>
                </div>
                <div class="tabs-list">
                    ${tabsHTML}
                </div>
            </div>
        `;
    }).join('');

    // 添加窗口Tab导航（仅当有多个窗口时显示）
    let windowTabsHTML = '';
    if (windowGroups.length > 1) {
        windowTabsHTML = `
            <div class="window-tabs-container">
                <div class="window-tabs">
                    ${windowGroups.map((group, index) => {
            const displayName = this.getWindowName(group.windowId, group.windowTitle);
            return `
                            <button class="window-tab" data-window-id="${group.windowId}" data-group-index="${index}">
                                <span class="window-tab-name">${this.escapeHtml(displayName)}</span>
                                <span class="window-tab-count">${group.tabs.length}</span>
                            </button>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    resultsContainer.innerHTML = windowTabsHTML + groupsHTML;

    // 重新绑定事件
    this.bindTabEvents();

    // 绑定窗口Tab导航事件
    if (windowTabsHTML) {
        this.bindWindowTabEvents();
    }

    // 恢复窗口切换状态（删除条目后只显示当前窗口分组）
    if (windowGroups.length > 1 && this.activeWindowIndex !== undefined && this.activeWindowIndex !== null) {
        const targetIndex = Math.min(this.activeWindowIndex, windowGroups.length - 1);
        this.activeWindowIndex = targetIndex;
        const activeTab = this.modal.querySelector(`.window-tab[data-group-index="${targetIndex}"]`);
        if (activeTab) {
            this.updateWindowTabSelection(activeTab);
        }
        this.switchToWindowGroup(targetIndex);
    }
    }

    // 刷新简单结果显示（默认搜索页面）

SearchModal.prototype.rebuildWindowGroups = function() {
    const windowMap = new Map();

    this.results.forEach(result => {
        if (result.type === 'tab') {
            const windowId = result.windowId;
            if (!windowMap.has(windowId)) {
                windowMap.set(windowId, {
                    windowId: windowId,
                    windowTitle: result.windowTitle || `Window ${windowId}`,
                    tabs: []
                });
            }
            windowMap.get(windowId).tabs.push(result);
        }
    });

    return Array.from(windowMap.values()).sort((a, b) => a.windowId - b.windowId);
    }

    // 绑定窗口Tab导航事件

SearchModal.prototype.bindWindowTabEvents = function() {
    this.modal.querySelectorAll('.window-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const groupIndex = parseInt(tab.dataset.groupIndex);
            this.activeWindowIndex = groupIndex;
            this.switchToWindowGroup(groupIndex);
            this.updateWindowTabSelection(tab);
        });
    });
    }

    // 切换到指定的窗口组（tab切换效果，不滚动）

SearchModal.prototype.switchToWindowGroup = function(groupIndex) {
    const windowGroups = this.modal.querySelectorAll('.window-group');
    windowGroups.forEach((group, index) => {
        if (index === groupIndex) {
            group.classList.remove('window-hidden');
        } else {
            group.classList.add('window-hidden');
        }
    });
    // 切换窗口时重置选中状态
    this.updateSelectedItem(-1);
    this.selectedIndex = -1;
    }

    // 更新窗口Tab选中状态

SearchModal.prototype.updateWindowTabSelection = function(selectedTab) {
    // 移除所有Tab的选中状态
    this.modal.querySelectorAll('.window-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 添加选中状态到当前Tab
    selectedTab.classList.add('active');
    }

    // 绑定默认搜索页面的Tab导航事件

SearchModal.prototype.bindDefaultSearchTabEvents = function() {
    this.modal.querySelectorAll('.window-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const windowId = parseInt(tab.dataset.windowId);
            this.scrollToWindowInDefaultSearch(windowId);

            // 更新Tab选中状态
            this.updateWindowTabSelection(tab);
        });
    });
    }

    // 在默认搜索页面中滚动到指定窗口的tab

SearchModal.prototype.scrollToWindowInDefaultSearch = function(windowId) {
    const resultItems = this.modal.querySelectorAll('.result-item');
    let targetItem = null;

    // 找到第一个属于指定窗口的tab
    for (let i = 0; i < resultItems.length; i++) {
        const result = this.results[i];
        if (result && result.type === 'tab' && result.windowId === windowId) {
            targetItem = resultItems[i];
            break;
        }
    }

    if (targetItem) {
        // 获取Tab导航的高度
        const tabsContainer = this.modal.querySelector('.window-tabs-container');
        const tabsHeight = tabsContainer ? tabsContainer.offsetHeight : 0;

        // 计算目标位置
        const targetPosition = targetItem.offsetTop - tabsHeight - 20;

        // 使用正确的滚动容器：results-section
        const scrollContainer = this.modal.querySelector('.results-section');
        if (scrollContainer) {
            scrollContainer.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }
    }

    // 绑定tab相关事件

SearchModal.prototype.bindTabEvents = function() {
    // 添加窗口名称编辑事件
    this.modal.querySelectorAll('.window-title').forEach(titleElement => {
        titleElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editWindowName(titleElement);
        });
    });

    // 添加窗口菜单事件
    this.modal.querySelectorAll('.window-menu-btn').forEach(menuBtn => {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const windowGroups = this.rebuildWindowGroups();
            this.showWindowMenu(menuBtn, windowGroups);
        });
    });

    // 添加点击事件
    this.modal.querySelectorAll('.tab-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // 如果点击的是关闭按钮，不切换标签页
            if (e.target.classList.contains('close-tab-btn')) {
                e.stopPropagation();
                return;
            }

            const tabId = parseInt(item.dataset.tabId);
            const windowId = parseInt(item.dataset.windowId);
            this.switchToTab(tabId, windowId);
        });
    });

    // 添加关闭按钮事件
    this.modal.querySelectorAll('.close-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = parseInt(btn.dataset.tabId);
            this.closeTab(tabId);
        });
    });
    }

    // 导航过滤器选项
})();
