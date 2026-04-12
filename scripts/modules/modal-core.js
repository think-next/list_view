// modal-core.js - Auto-extracted module for SearchModal
// Part of the List View Chrome extension

(function() {
    'use strict';

SearchModal.prototype.bindEvents = function() {
    // 点击遮罩层关闭
    this.modal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            this.close();
        }
    });

    // 皮肤切换按钮
    const skinToggle = this.modal.querySelector('#skinToggle');
    if (skinToggle) {
        skinToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = this.modal.querySelector('.modal-container');
            const currentSkin = container.getAttribute('data-skin') || 'default';
            const newSkin = currentSkin === 'compact' ? 'default' : 'compact';
            if (newSkin === 'default') {
                container.removeAttribute('data-skin');
            } else {
                container.setAttribute('data-skin', newSkin);
            }
            skinToggle.textContent = newSkin === 'compact' ? '⊞' : '⊡';
            chrome.storage.local.set({ skin: newSkin });
        });
    }

    // 键盘事件处理
    document.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;

        // ESC键关闭
        if (e.key === 'Escape') {
            this.close();
            return;
        }

        // 检查是否显示过滤器下拉框
        const dropdown = this.modal.querySelector('#filterDropdown');
        const isDropdownVisible = dropdown && dropdown.style.display !== 'none';

        if (isDropdownVisible) {
            // 过滤器下拉框导航
            if (e.key === 'ArrowDown' || e.key === 'Tab') {
                e.preventDefault();
                this.navigateFilterOptions(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateFilterOptions(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.selectCurrentFilterOption();
            }
        } else if (this.results.length > 0 || this.windowGroups || this.activeFilter === 'bookmark') {
            // 多窗口左右切换（仅在tab视图且有多个窗口时生效）
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && this.windowGroups && this.windowGroups.length > 1) {
                e.preventDefault();
                const windowTabs = this.modal.querySelectorAll('.window-tab');
                if (windowTabs.length > 0) {
                    if (e.key === 'ArrowRight') {
                        this.activeWindowIndex = (this.activeWindowIndex + 1) % windowTabs.length;
                    } else {
                        this.activeWindowIndex = (this.activeWindowIndex - 1 + windowTabs.length) % windowTabs.length;
                    }
                    this.switchToWindowGroup(this.activeWindowIndex);
                    this.updateWindowTabSelection(windowTabs[this.activeWindowIndex]);
                }
                return;
            }

            // 搜索结果导航（包括list tab视图和书签视图）
            if (e.key === 'ArrowDown' || e.key === 'Tab') {
                e.preventDefault();
                this.navigateResults(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateResults(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.openSelectedResult();
            }
        }
    });


    // 搜索功能
    this.bindSearchEvents();
    }

    // 绑定搜索事件

SearchModal.prototype.bindSearchEvents = function() {
    const searchInput = this.modal.querySelector('#searchInput');
    const searchBtn = this.modal.querySelector('#searchBtn');

    // 搜索按钮点击
    searchBtn.addEventListener('click', async () => {
        const query = searchInput.value.trim();
        await this.searchBookmarksAndHistory(query);
    });

    // 回车搜索
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            await this.searchBookmarksAndHistory(query);
        }
    });

    // 实时搜索（防抖）
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.trim();

            // 自动触发搜索
            if (query.length > 0) {
                this.searchBookmarksAndHistory(query);
            } else {
                // 如果输入为空，根据当前过滤器状态显示相应内容
                if (this.activeFilter === 'history') {
                    // 历史记录模式下，空输入时显示最近20条历史记录
                    Logger.info('历史记录模式下输入为空，显示最近20条历史记录');
                    this.loadRecentHistory();
                } else {
                    // 其他模式下显示欢迎信息
                    this.showWelcomeMessage();
                }
            }

            // 同时处理输入变化（用于AI推荐等）
            this.handleInputChange(query);
        }, 300); // 增加防抖时间到300ms，避免过于频繁的搜索
    });
    }

    // 显示模态框

SearchModal.prototype.show = function() {
    if (this.isOpen) return;

    // Apply theme & skin
    chrome.storage.local.get(['theme', 'skin'], (result) => {
        const theme = result.theme || 'auto';
        const skin = result.skin || 'default';
        const container = this.modal.querySelector('.modal-container');
        if (container) {
            // Theme
            if (theme === 'dark') {
                container.setAttribute('data-theme', 'dark');
            } else if (theme === 'light') {
                container.removeAttribute('data-theme');
            } else {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    container.setAttribute('data-theme', 'dark');
                } else {
                    container.removeAttribute('data-theme');
                }
            }
            // Skin
            if (skin === 'compact') {
                container.setAttribute('data-skin', 'compact');
            } else {
                container.removeAttribute('data-skin');
            }
            const skinToggle = this.modal.querySelector('#skinToggle');
            if (skinToggle) {
                skinToggle.textContent = skin === 'compact' ? '⊞' : '⊡';
            }
        }
    });

    // 防止页面滚动
    document.body.classList.add('modal-open');

    // 保存当前滚动位置
    this.scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    this.modal.classList.add('show');
    this.isOpen = true;

    // 加载窗口名称缓存
    this.loadWindowNames();

    // 监听窗口名称变化
    this._cleanupStorageListener = () => {
        if (this._storageListener) {
            chrome.storage.onChanged.removeListener(this._storageListener);
        }
    };
    if (!this._storageListener) {
        this._storageListener = (changes, area) => {
            if (area === 'local' && changes.windowNames) {
                this.windowNamesCache = changes.windowNames.newValue || {};
            }
        };
        chrome.storage.onChanged.addListener(this._storageListener);
    }

    // 初始化时获取并显示当前的maxResults配置
    this.loadCurrentMaxResults();

    // 预加载AI开关配置（不阻塞UI）
    this.checkAIEnabled().catch(() => { });

    // 默认显示list tab内容，但保持搜索框为默认状态
    this.loadAllTabs();

    // 检查是否要通过命令触发统计（从存储中读取）
    chrome.storage.local.get(['showStatsOnOpen'], (result) => {
        if (result.showStatsOnOpen) {
            chrome.storage.local.set({ showStatsOnOpen: false });
            this.loadHistoryStats();
        }
    });

    // 聚焦到输入框
    setTimeout(() => {
        const searchInput = this.modal.querySelector('#searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }, 300);
    }

    // 关闭模态框

SearchModal.prototype.close = function() {
    if (!this.isOpen) return;

    // 恢复页面滚动
    document.body.classList.remove('modal-open');

    // 恢复滚动位置
    if (this.scrollTop !== undefined) {
        window.scrollTo(0, this.scrollTop);
    }

    this.modal.classList.remove('show');
    this.isOpen = false;
    }

    // 搜索功能

SearchModal.prototype.showWelcomeMessage = function() {
    const loadingIndicator = this.modal.querySelector('#loadingIndicator');
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    const historyStatsSection = this.modal.querySelector('#historyStatsSection');

    loadingIndicator.style.display = 'none';

    // 隐藏历史统计区域
    if (historyStatsSection) {
        historyStatsSection.style.display = 'none';
    }

    // 根据当前过滤器状态决定显示内容
    if (this.activeFilter === 'bookmark') {
        // 如果是书签模式，检查是否有分组过滤
        if (this.currentSelectedFolder) {
            // 有分组过滤，显示该分组下的书签
            const filteredBookmarks = this.allBookmarks.filter(bookmark =>
                bookmark.folderPath === this.currentSelectedFolder
            );
            this.displayBookmarkResults(filteredBookmarks);
            this.showFolderFilterState(this.currentSelectedFolder);
        } else {
            // 没有分组过滤，显示所有书签
            this.loadAllBookmarks();
        }
    } else if (this.activeFilter === 'history') {
        // 如果是历史记录模式，显示最近20条历史记录
        Logger.info('历史记录模式下显示欢迎信息，加载最近20条历史记录');
        this.loadRecentHistory();
    } else {
        // Default: try to show search history, fall back to tabs
        this.showSearchHistory();
    }
    }

    // 加载最近的历史记录

SearchModal.prototype.loadCurrentMaxResults = async function() {
    try {
        const response = await this.sendMessageToBackground({
            action: 'getMaxResults'
        });
        if (response.success) {
            // maxResults配置已获取，但不再需要更新UI显示
        }
    } catch (error) {
        Logger.error('获取maxResults配置失败:', error);
        // 使用默认值，但不再需要更新UI显示
    }
    }

    // 获取AI推荐

// Render results grouped by type with visual section headers
SearchModal.prototype.groupResultsByType = function(results, query, existingHTML) {
    const typeOrder = ['tab', 'bookmark', 'history'];
    const typeLabels = { tab: '🏷️ Open Tabs', bookmark: '🔖 Bookmarks', history: '📊 History' };
    const sections = new Map();
    typeOrder.forEach(t => sections.set(t, []));
    for (const r of results) {
        if (sections.has(r.type)) sections.get(r.type).push(r);
    }
    const activeSections = typeOrder.filter(t => sections.get(t).length > 0);
    if (activeSections.length <= 1) return existingHTML;

    let idx = 0;
    const items = existingHTML.split(/(?=<div class="result-item )/);
    let output = '';
    for (const type of activeSections) {
        const count = sections.get(type).length;
        output += `<div class="result-section-header"><span>${typeLabels[type]}</span><span class="section-count">${count}</span></div>`;
        for (let i = 0; i < count && idx < items.length; i++, idx++) {
            output += items[idx];
        }
    }
    return output;
};

SearchModal.prototype.displayResults = function(results, query = '') {
    const loadingIndicator = this.modal.querySelector('#loadingIndicator');
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    loadingIndicator.style.display = 'none';

    // 保存搜索结果
    this.results = results;
    this.windowGroups = null; // 清除Tab分组状态，避免键盘导航走错分支
    this.selectedIndex = -1; // 重置选中状态

    // 保存AI推荐模块（如果存在）
    const aiDetection = resultsContainer.querySelector('.ai-detection');

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon">🔍</div>
                <p>No results found</p>
                <p class="no-results-hint">Try different keywords or switch filters</p>
            </div>
        `;

        // 如果有AI推荐模块，重新插入到最前面
        if (aiDetection) {
            resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
        }
        return;
    }

    // 检查是否有多个窗口的tab，如果有则添加Tab导航
    let windowTabsHTML = '';
    const tabResults = results.filter(result => result.type === 'tab');
    if (tabResults.length > 0) {
        const windowIds = [...new Set(tabResults.map(result => result.windowId))];
        if (windowIds.length > 1) {
            // 按窗口分组tab结果
            const windowGroups = windowIds.map(windowId => {
                const windowTabs = tabResults.filter(result => result.windowId === windowId);
                const firstTab = windowTabs[0];
                return {
                    windowId: windowId,
                    windowTitle: firstTab.windowTitle || `Window ${windowId}`,
                    tabs: windowTabs
                };
            });

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
    }

    const resultsHTML = results.map(result => {
        const date = new Date(result.lastVisitTime || result.dateAdded);
        const formattedDate = this.formatDate(date);
        const typeLabel = this.getTypeLabel(result.type);
        const truncatedUrl = this.truncateUrl(result.url);

        // 对于tab类型，添加窗口标签到标题栏右侧
        let windowTag = '';
        if (result.type === 'tab' && result.windowId) {
            // 获取用户自定义的窗口名称
            const customWindowName = this.getWindowName(result.windowId, result.windowTitle);
            windowTag = `<span class="window-tag">${this.escapeHtml(customWindowName)}</span>`;
        }

        // 为不同类型的搜索结果添加相应的功能按钮
        let actionButtons = '';
        let folderInfo = '';

        if (result.type === 'tab') {
            // Tab类型：添加关闭按钮
            actionButtons = `
                <div class="tab-actions">
                    <button class="close-tab-btn" data-tab-id="${result.tabId}" title="Close tab">×</button>
                </div>
            `;
        } else if (result.type === 'bookmark') {
            // Bookmark类型：添加书签目录和删除按钮
            if (result.folderPath) {
                folderInfo = `<span class="bookmark-folder" data-folder-path="${this.escapeHtml(result.folderPath)}">📁 ${this.escapeHtml(result.folderPath)}</span>`;
            }
            actionButtons = `
                <div class="bookmark-actions">
                    <button class="delete-bookmark-btn" data-bookmark-id="${result.id}" title="Delete bookmark">×</button>
                </div>
            `;
        }

        return `
            <div class="result-item ${result.type}-type" data-url="${result.url}" ${result.type === 'tab' ? `data-tab-id="${result.tabId}" data-window-id="${result.windowId}"` : ''} ${result.type === 'bookmark' ? `data-bookmark-id="${result.id}"` : ''}>
                <div class="result-header">
                    <div class="result-header-left">
                        <span class="result-type">${typeLabel}</span>
                        <span class="result-title">${this.highlightText(result.title, query)}</span>
                        ${folderInfo}
                    </div>
                    <div class="result-header-right">
                        ${actionButtons}
                        ${windowTag}
                        <span class="result-date">${formattedDate}</span>
                    </div>
                </div>
                <div class="result-url">${this.escapeHtml(truncatedUrl)}</div>
            </div>
        `;
    }).join('');

    // Group results by type with section headers
    const groupedHTML = this.groupResultsByType(results, query, resultsHTML);
    resultsContainer.innerHTML = windowTabsHTML + groupedHTML;

    // 如果有AI推荐模块，重新插入到最前面
    if (aiDetection) {
        resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
    }

    // 绑定窗口Tab导航事件（如果有的话）
    if (windowTabsHTML) {
        this.bindWindowTabEvents();
        // 为默认搜索页面的Tab导航添加特殊的滚动处理
        this.bindDefaultSearchTabEvents();
    }

    // 添加点击事件
    this.modal.querySelectorAll('.result-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            // 如果点击的是功能按钮，不处理主点击事件
            if (e.target.classList.contains('close-tab-btn') ||
                e.target.classList.contains('delete-bookmark-btn') ||
                e.target.classList.contains('bookmark-folder')) {
                return;
            }

            const result = this.results[index];
            if (result.type === 'tab') {
                // 标签页类型：切换到对应标签页（使用与键盘导航相同的逻辑）
                this.switchToTab(result.tabId, result.windowId);
            } else {
                // 书签和历史类型：打开新标签页
                window.open(result.url, '_blank');
                this.close();
            }
        });
    });

    // 绑定关闭标签页按钮事件
    this.modal.querySelectorAll('.close-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = parseInt(btn.dataset.tabId);
            this.closeTab(tabId);
        });
    });

    // 绑定删除书签按钮事件
    this.modal.querySelectorAll('.delete-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookmarkId = btn.dataset.bookmarkId;
            if (bookmarkId) {
                this.deleteBookmark(bookmarkId);
            }
        });
    });

    // 绑定书签目录点击事件
    this.modal.querySelectorAll('.bookmark-folder').forEach(folder => {
        folder.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderPath = folder.dataset.folderPath;
            if (folderPath) {
                // 在默认搜索场景下，进入书签目录视图
                this.enterBookmarkFolderView(folderPath);
            }
        });
    });
    }

    // 在默认搜索场景下进入书签目录视图

SearchModal.prototype.showFilterDropdown = function() {
    const dropdown = this.modal.querySelector('#filterDropdown');

    if (!dropdown) {
        Logger.error('未找到过滤器下拉列表元素');
        return;
    }

    // 重置选中索引
    this.filterSelectedIndex = -1;

    dropdown.innerHTML = `
        <div class="filter-option" data-filter="history">
            <span>📊 list history</span>
            <small>History only</small>
        </div>
        <div class="filter-option" data-filter="tab">
            <span>📑 list tab</span>
            <small>Tabs only</small>
        </div>
        <div class="filter-option" data-filter="bookmark">
            <span>🔖 list bookmark</span>
            <small>Bookmarks only</small>
        </div>
    `;

    dropdown.style.display = 'block';
    this.filterDropdown = dropdown;

    // 添加点击事件
    dropdown.querySelectorAll('.filter-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const filter = e.currentTarget.dataset.filter;
            this.selectFilter(filter);
        });
    });
    }

    // 检查AI推荐是否开启（缓存，避免频繁读存储）

SearchModal.prototype.hideFilterDropdown = function() {
    const dropdown = this.modal.querySelector('#filterDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
    }

    // 选择过滤器

SearchModal.prototype.selectFilter = function(filter) {
    this.activeFilter = filter;
    this.hideFilterDropdown();
    this.updateFilterTag();

    // 清空输入框，让用户重新输入搜索内容
    const searchInput = this.modal.querySelector('#searchInput');
    searchInput.value = '';
    searchInput.focus();

    // 移除任何现有的AI UI，因为list模式下不显示AI推荐
    this.removeAIUI();

    // 如果是标签页过滤器，立即显示所有标签页
    if (filter === 'tab') {
        Logger.info('选择标签页过滤器，立即显示所有标签页');
        this.loadAllTabs();
    }

    // 如果是书签过滤器，立即显示所有书签
    if (filter === 'bookmark') {
        Logger.info('选择书签过滤器，立即显示所有书签');
        this.loadAllBookmarks();
    }

    // 如果是历史记录过滤器，立即显示最近20条历史记录
    if (filter === 'history') {
        Logger.info('选择历史记录过滤器，立即显示最近20条历史记录');
        this.loadRecentHistory();
    }
    }

    // 更新过滤器标签

SearchModal.prototype.updateFilterTag = function() {
    Logger.info('更新过滤器标签，当前过滤器:', this.activeFilter);
    const filterTag = this.modal.querySelector('#activeFilterTag');
    Logger.info('找到过滤器标签元素:', filterTag);

    if (!filterTag) {
        Logger.error('未找到过滤器标签元素');
        return;
    }

    if (this.activeFilter) {
        const filterNames = {
            'history': 'History',
            'tab': 'Tabs',
            'bookmark': 'Bookmarks'
        };

        filterTag.textContent = `[${filterNames[this.activeFilter]}]`;
        filterTag.style.display = 'block';
        Logger.info('过滤器标签已显示:', filterTag.textContent);

        // 添加点击清除事件
        filterTag.onclick = () => {
            Logger.info('点击清除过滤器');
            this.clearFilter();
        };
    } else {
        filterTag.style.display = 'none';
        Logger.info('过滤器标签已隐藏');
    }
    }

    // 清除过滤器

SearchModal.prototype.clearFilter = function() {
    this.activeFilter = null;
    this.updateFilterTag();
    this.showWelcomeMessage();
    }

    // 获取类型标签

SearchModal.prototype.refreshSimpleResultsDisplay = function(query = '') {
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    if (!resultsContainer) return;

    // 重新生成HTML
    const resultsHTML = this.results.map(result => {
        const date = new Date(result.lastVisitTime || result.dateAdded);
        const formattedDate = this.formatDate(date);
        const typeLabel = this.getTypeLabel(result.type);
        const truncatedUrl = this.truncateUrl(result.url);

        // 对于tab类型，添加窗口标签到标题栏右侧
        let windowTag = '';
        if (result.type === 'tab' && result.windowId) {
            // 获取用户自定义的窗口名称
            const customWindowName = this.getWindowName(result.windowId, result.windowTitle);
            windowTag = `<span class="window-tag">${this.escapeHtml(customWindowName)}</span>`;
        }

        // 为不同类型的搜索结果添加相应的功能按钮
        let actionButtons = '';
        let folderInfo = '';

        if (result.type === 'tab') {
            // Tab类型：添加关闭按钮
            actionButtons = `
                <div class="tab-actions">
                    <button class="close-tab-btn" data-tab-id="${result.tabId}" title="Close tab">×</button>
                </div>
            `;
        } else if (result.type === 'bookmark') {
            // Bookmark类型：添加书签目录和删除按钮
            if (result.folderPath) {
                folderInfo = `<span class="bookmark-folder" data-folder-path="${this.escapeHtml(result.folderPath)}">📁 ${this.escapeHtml(result.folderPath)}</span>`;
            }
            actionButtons = `
                <div class="bookmark-actions">
                    <button class="delete-bookmark-btn" data-bookmark-id="${result.id}" title="Delete bookmark">×</button>
                </div>
            `;
        }

        return `
            <div class="result-item ${result.type}-type" data-url="${result.url}" ${result.type === 'tab' ? `data-tab-id="${result.tabId}" data-window-id="${result.windowId}"` : ''} ${result.type === 'bookmark' ? `data-bookmark-id="${result.id}"` : ''}>
                <div class="result-header">
                    <div class="result-header-left">
                        <span class="result-type">${typeLabel}</span>
                        <span class="result-title">${this.highlightText(result.title, query)}</span>
                        ${folderInfo}
                    </div>
                    <div class="result-header-right">
                        ${actionButtons}
                        ${windowTag}
                        <span class="result-date">${formattedDate}</span>
                    </div>
                </div>
                <div class="result-url">${this.escapeHtml(truncatedUrl)}</div>
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = resultsHTML;

    // 重新绑定点击事件
    this.modal.querySelectorAll('.result-item').forEach((item, index) => {
        item.addEventListener('click', (e) => {
            // 如果点击的是功能按钮，不处理主点击事件
            if (e.target.classList.contains('close-tab-btn') ||
                e.target.classList.contains('delete-bookmark-btn') ||
                e.target.classList.contains('bookmark-folder')) {
                return;
            }

            const result = this.results[index];
            if (result.type === 'tab') {
                // 标签页类型：切换到对应标签页
                chrome.tabs.update(result.tabId, { active: true });
            } else {
                // 书签和历史类型：打开新标签页
                window.open(result.url, '_blank');
            }
            this.close();
        });
    });

    // 绑定关闭标签页按钮事件
    this.modal.querySelectorAll('.close-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = parseInt(btn.dataset.tabId);
            this.closeTab(tabId);
        });
    });

    // 绑定删除书签按钮事件
    this.modal.querySelectorAll('.delete-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const bookmarkId = btn.dataset.bookmarkId;
            if (bookmarkId) {
                this.deleteBookmark(bookmarkId);
            }
        });
    });

    // 绑定书签目录点击事件
    this.modal.querySelectorAll('.bookmark-folder').forEach(folder => {
        folder.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderPath = folder.dataset.folderPath;
            if (folderPath) {
                // 在默认搜索场景下，进入书签目录视图
                this.enterBookmarkFolderView(folderPath);
            }
        });
    });
    }

    // 重新构建windowGroups数据

SearchModal.prototype.navigateFilterOptions = function(direction) {
    const options = this.modal.querySelectorAll('.filter-option');
    if (options.length === 0) return;

    // 移除之前的选中状态
    this.updateFilterOptionSelection(-1);

    // 计算新的选中索引
    if (direction > 0) {
        // 向下或Tab键
        this.filterSelectedIndex = (this.filterSelectedIndex + 1) % options.length;
    } else {
        // 向上键
        this.filterSelectedIndex = this.filterSelectedIndex <= 0 ? options.length - 1 : this.filterSelectedIndex - 1;
    }

    // 更新选中状态
    this.updateFilterOptionSelection(this.filterSelectedIndex);
    }

    // 更新过滤器选项选中状态

SearchModal.prototype.updateFilterOptionSelection = function(index) {
    const options = this.modal.querySelectorAll('.filter-option');

    options.forEach((option, i) => {
        if (i === index) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    }

    // 选择当前过滤器选项

SearchModal.prototype.selectCurrentFilterOption = function() {
    const options = this.modal.querySelectorAll('.filter-option');
    if (this.filterSelectedIndex >= 0 && this.filterSelectedIndex < options.length) {
        const selectedOption = options[this.filterSelectedIndex];
        const filter = selectedOption.dataset.filter;
        this.selectFilter(filter);
    }
    }

    // 加载历史统计

SearchModal.prototype.editWindowName = function(titleElement) {
    const windowId = titleElement.dataset.windowId;
    const currentName = titleElement.textContent;

    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'window-name-input';
    input.maxLength = 20;

    // 替换标题元素
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(input, titleElement);

    // 聚焦并选中文本
    input.focus();
    input.select();

    // 保存函数
    const saveName = () => {
        const newName = input.value.trim() || currentName;
        titleElement.textContent = newName;
        titleElement.style.display = 'block';
        input.remove();

        // 保存到localStorage
        this.saveWindowName(windowId, newName);
    };

    // 取消函数
    const cancelEdit = () => {
        titleElement.style.display = 'block';
        input.remove();
    };

    // 绑定事件
    input.addEventListener('blur', saveName);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveName();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
    }

    // 保存窗口名称到chrome.storage.local（通过background）

SearchModal.prototype.saveWindowName = function(windowId, name) {
    try {
        // 更新本地缓存
        this.windowNamesCache = this.windowNamesCache || {};
        this.windowNamesCache[windowId] = name;
        // 通过background保存
        chrome.runtime.sendMessage({ action: 'saveWindowName', windowId, name });
    } catch (error) {
        Logger.error('保存窗口名称失败:', error);
    }
    }

    // 从background加载所有窗口名称到缓存

SearchModal.prototype.loadWindowNames = async function() {
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getWindowNames' });
        if (response && response.success) {
            this.windowNamesCache = response.windowNames || {};
        }
    } catch (error) {
        Logger.error('加载窗口名称失败:', error);
        this.windowNamesCache = this.windowNamesCache || {};
    }
    }

    // 获取保存的窗口名称（从缓存同步读取）

SearchModal.prototype.getWindowName = function(windowId, defaultName) {
    try {
        const savedNames = this.windowNamesCache || {};
        return savedNames[windowId] || defaultName;
    } catch (error) {
        Logger.error('获取窗口名称失败:', error);
        return defaultName;
    }
    }

    // 对指定窗口按 URL 执行排序（direction: 'asc' | 'desc'）并在真实窗口内应用顺序

SearchModal.prototype.applySortForWindow = function(windowId, direction, btn) {
    try {
        const groupEl = this.modal.querySelector(`.window-group .tabs-list`) && Array.from(this.modal.querySelectorAll('.window-group')).find(w => {
            const title = w.querySelector('.window-title');
            return title && parseInt(title.dataset.windowId) === windowId;
        });

        if (!groupEl) return;

        const tabsListEl = groupEl.querySelector('.tabs-list');
        if (!tabsListEl) return;

        // 获取所有tab items
        const items = Array.from(tabsListEl.querySelectorAll('.tab-item'));

        // 按去掉?参数的URL比较并根据direction排序
        items.sort((a, b) => {
            const urlA = (a.dataset.url || '').split('?')[0].toLowerCase();
            const urlB = (b.dataset.url || '').split('?')[0].toLowerCase();
            if (urlA < urlB) return direction === 'asc' ? -1 : 1;
            if (urlA > urlB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        // 重新附加到DOM
        items.forEach(it => tabsListEl.appendChild(it));

        // 可选：为按钮设置一个活跃样式
        if (btn) {
            btn.classList.add('active');
            setTimeout(() => btn.classList.remove('active'), 300);
        }

        // 收集当前tabs顺序对应的tabIds
        const currentItems = Array.from(tabsListEl.querySelectorAll('.tab-item'));
        const tabIds = currentItems.map(it => parseInt(it.dataset.tabId)).filter(id => !isNaN(id));

        // 发送消息给background，请求在真实窗口中重排（仅同窗口内）
        chrome.runtime.sendMessage({
            action: 'reorderTabsInWindow',
            windowId: windowId,
            tabIds: tabIds
        }, (resp) => {
            if (chrome.runtime.lastError) {
                Logger.error('发送重排请求失败:', chrome.runtime.lastError);
                return;
            }

            if (!resp || !resp.success) {
                Logger.warn('Reorder failed:', resp && resp.error ? resp.error : 'unknown');
            }
        });

    } catch (error) {
        Logger.error('应用窗口排序失败:', error);
    }
    }

    // 显示窗口菜单

SearchModal.prototype.showWindowMenu = function(menuBtn, windowGroups) {
    const currentWindowId = parseInt(menuBtn.dataset.windowId);

    // 移除已存在的菜单
    this.hideWindowMenu();

    // 检查是否有其他窗口可以合并
    const otherWindows = windowGroups.filter(group => group.windowId !== currentWindowId);

    // 如果只有一个窗口，不显示菜单
    if (otherWindows.length === 0) {
        Logger.info('只有一个窗口，不显示合并菜单');
        return;
    }

    // 创建菜单
    const menu = document.createElement('div');
    menu.className = 'window-menu';
    menu.innerHTML = `
        <div class="window-menu-header">Window actions</div>
        <div class="window-menu-items">
            ${otherWindows.map(group => {
        const targetName = this.getWindowName(group.windowId, group.windowTitle);
        return `
                    <div class="window-menu-item" data-target-window="${group.windowId}">
                        <span class="menu-icon">🔄</span>
                        <span class="menu-text">Merge to "${this.escapeHtml(targetName)}"</span>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    // 定位菜单
    const rect = menuBtn.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.zIndex = '1000002';

    // 添加到页面
    document.body.appendChild(menu);

    // 绑定菜单项点击事件
    menu.querySelectorAll('.window-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetWindowId = parseInt(item.dataset.targetWindow);
            this.mergeWindows(currentWindowId, targetWindowId);
            this.hideWindowMenu();
        });
    });

    // 点击外部关闭菜单
    setTimeout(() => {
        document.addEventListener('click', this.hideWindowMenu.bind(this), { once: true });
    }, 0);
    }

    // 隐藏窗口菜单

SearchModal.prototype.hideWindowMenu = function() {
    const existingMenu = document.querySelector('.window-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    }

    // 合并窗口

SearchModal.prototype.mergeWindows = async function(sourceWindowId, targetWindowId) {
    try {
        Logger.info(`合并窗口: ${sourceWindowId} -> ${targetWindowId}`);

        // 通过消息传递到background script处理
        const response = await this.sendMessageToBackground({
            action: 'mergeWindows',
            sourceWindowId: sourceWindowId,
            targetWindowId: targetWindowId
        });

        if (response.success) {
            Logger.info('窗口合并成功');
            // 重新加载标签页列表
            this.loadAllTabs();
        } else {
            Logger.error('窗口合并失败:', response.error);
            alert('Merge failed: ' + response.error);
        }
    } catch (error) {
        Logger.error('窗口合并出错:', error);
        alert('Merge error');
    }
    }

    // 显示下载提示
})();
