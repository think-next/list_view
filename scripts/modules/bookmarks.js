// bookmarks.js - Auto-extracted module for SearchModal
// Part of the List View Chrome extension

(function() {
    'use strict';

// Bookmark sort state: 'name' or 'date'
SearchModal.prototype.bookmarkSortBy = 'date';

SearchModal.prototype.toggleBookmarkSort = function() {
    this.bookmarkSortBy = this.bookmarkSortBy === 'date' ? 'name' : 'date';
    // Re-display with current bookmarks
    const currentBookmarks = this.currentSelectedFolder
        ? this.allBookmarks.filter(b => b.folderPath === this.currentSelectedFolder)
        : this.allBookmarks;
    this.displayBookmarkResults(currentBookmarks);
};

SearchModal.prototype.loadAllBookmarks = async function() {
    try {
        console.log('开始加载所有书签');
        this.showLoading();

        // 通过消息传递请求background script获取所有书签
        const response = await this.sendMessageToBackground({
            action: 'getAllBookmarks'
        });

        if (response.success) {
            console.log('获取书签成功:', response.results);
            this.allBookmarks = response.results; // 保存所有书签数据
            this.displayBookmarkResults(response.results);
        } else {
            console.error('获取书签失败:', response.error);
            this.showError('Failed to load bookmarks. Please try again.');
        }
    } catch (error) {
        console.error('加载书签出错:', error);
        this.showError('Error loading bookmarks.');
    }
    }

    // 显示书签结果

SearchModal.prototype.displayBookmarkResults = function(bookmarks) {
    console.log('显示书签结果:', bookmarks);
    const loadingIndicator = this.modal.querySelector('#loadingIndicator');
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    const historyStatsSection = this.modal.querySelector('#historyStatsSection');

    loadingIndicator.style.display = 'none';

    // 隐藏历史统计区域
    if (historyStatsSection) {
        historyStatsSection.style.display = 'none';
    }

    // 保存书签结果
    this.results = [];
    this.selectedIndex = -1; // 重置选中状态

    // 将所有书签展平到results数组中，用于键盘导航
    bookmarks.forEach(bookmark => {
        this.results.push({
            ...bookmark,
            type: 'bookmark'
        });
    });

    // 构建HTML内容
    let htmlContent = '';

    // 如果有选定的分组，显示分组状态指示器
    if (this.currentSelectedFolder) {
        htmlContent += `
            <div class="folder-status-indicator">
                <div class="folder-status-content">
                    <span class="folder-status-icon">📁</span>
                    <span class="folder-status-text">Selected: ${this.escapeHtml(this.currentSelectedFolder)}</span>
                    <button class="folder-status-close" title="Clear folder filter">×</button>
                </div>
            </div>
        `;
    }

    if (!bookmarks || bookmarks.length === 0) {
        htmlContent += `
            <div class="no-results">
                <p>📚 No bookmarks</p>
                <p>Your saved pages will appear here</p>
            </div>
        `;
        resultsContainer.innerHTML = htmlContent;

        // 绑定关闭按钮事件
        this.bindFolderStatusEvents();
        return;
    }

    // Sort bookmarks
    const sorted = [...bookmarks].sort((a, b) => {
        if (this.bookmarkSortBy === 'name') {
            return (a.title || '').localeCompare(b.title || '');
        } else {
            return (b.dateAdded || 0) - (a.dateAdded || 0);
        }
    });

    // Add bookmark current page button
    htmlContent += `
        <div style="display:flex;justify-content:flex-end;margin-bottom:8px;gap:8px;">
            <button id="bookmarkSortBtn" style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;color:#475569;">Sort: ${this.bookmarkSortBy === 'date' ? 'Date ↓' : 'Name A-Z'}</button>
            <button id="bookmarkCurrentPageBtn" style="background:#dbeafe;border:1px solid #bae6fd;border-radius:6px;padding:4px 12px;font-size:12px;cursor:pointer;color:#2563eb;">+ Bookmark Current Page</button>
        </div>
    `;

    const bookmarksHTML = sorted.map((bookmark, index) => `
        <div class="bookmark-item" 
             data-url="${bookmark.url}" 
             data-bookmark-id="${bookmark.id}"
             data-index="${index}">
            <div class="result-header">
                <div class="result-header-left">
                    <span class="result-type">Bookmark</span>
                    <span class="result-title">${this.escapeHtml(bookmark.title)}</span>
                    ${bookmark.folderPath ? `<span class="bookmark-folder" data-folder-path="${this.escapeHtml(bookmark.folderPath)}">📁 ${this.escapeHtml(bookmark.folderPath)}</span>` : ''}
                </div>
                <div class="bookmark-actions">
                    <button class="delete-bookmark-btn" data-bookmark-id="${bookmark.id}" title="Delete bookmark">×</button>
                </div>
            </div>
        </div>
    `).join('');

    // 添加书签列表
    htmlContent += `
        <div class="bookmarks-list">
            ${bookmarksHTML}
        </div>
    `;

    // 设置HTML内容
    resultsContainer.innerHTML = htmlContent;

    // 绑定书签事件和分组状态事件
    this.bindBookmarkEvents();
    this.bindFolderStatusEvents();

    // Bind sort button
    const sortBtn = document.getElementById('bookmarkSortBtn');
    if (sortBtn) sortBtn.addEventListener('click', () => this.toggleBookmarkSort());

    // Bind bookmark current page button
    const addBtn = document.getElementById('bookmarkCurrentPageBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.bookmarks.create({ title: tabs[0].title, url: tabs[0].url }, () => {
                        addBtn.textContent = '✓ Bookmarked!';
                        setTimeout(() => { addBtn.textContent = '+ Bookmark Current Page'; }, 1500);
                    });
                }
            });
        });
    }
    }

    // 绑定分组状态事件

SearchModal.prototype.bindFolderStatusEvents = function() {
    const closeBtn = this.modal.querySelector('.folder-status-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            this.clearFolderFilter();
        });
    }
    }

    // 绑定书签事件

SearchModal.prototype.bindBookmarkEvents = function() {
    // 绑定书签点击事件
    this.modal.querySelectorAll('.bookmark-item').forEach((item, index) => {
        // 绑定整个书签项的点击事件，但排除分组标签和删除按钮
        item.addEventListener('click', (e) => {
            // 如果点击的是分组标签或删除按钮，不处理
            if (e.target.classList.contains('bookmark-folder') ||
                e.target.classList.contains('delete-bookmark-btn')) {
                return;
            }

            const url = item.dataset.url;
            if (url) {
                // 通过消息传递让background script创建标签页
                this.sendMessageToBackground({
                    action: 'createTab',
                    url: url
                }).then(() => {
                    this.close();
                }).catch(error => {
                    console.error('创建标签页失败:', error);
                });
            }
        });

        // 添加键盘导航支持
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const url = item.dataset.url;
                if (url) {
                    // 通过消息传递让background script创建标签页
                    this.sendMessageToBackground({
                        action: 'createTab',
                        url: url
                    }).then(() => {
                        this.close();
                    }).catch(error => {
                        console.error('创建标签页失败:', error);
                    });
                }
            }
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

    // 绑定书签分组点击事件
    this.modal.querySelectorAll('.bookmark-folder').forEach(folder => {
        folder.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderPath = folder.dataset.folderPath;
            if (folderPath) {
                this.filterBookmarksByFolder(folderPath);
            }
        });
    });
    }

    // 按分组过滤书签

SearchModal.prototype.filterBookmarksByFolder = function(folderPath) {
    console.log('按分组过滤书签:', folderPath);

    // 设置当前选定的分组
    this.currentSelectedFolder = folderPath;

    // 过滤书签数据
    const filteredBookmarks = this.allBookmarks.filter(bookmark =>
        bookmark.folderPath === folderPath
    );

    // 显示过滤后的书签
    this.displayBookmarkResults(filteredBookmarks);

    // 显示分组状态
    this.showFolderFilterState(folderPath);

    console.log(`显示分组 "${folderPath}" 下的 ${filteredBookmarks.length} 个书签`);
    }

    // 显示分组过滤状态

SearchModal.prototype.showFolderFilterState = function(folderPath) {
    const searchContainer = this.modal.querySelector('#searchContainer');
    if (!searchContainer) return;

    // 移除已存在的分组状态
    const existingState = searchContainer.querySelector('.folder-filter-state');
    if (existingState) {
        existingState.remove();
    }

    // 创建分组状态显示
    const folderState = document.createElement('div');
    folderState.className = 'folder-filter-state';
    folderState.innerHTML = `
        <div class="folder-filter-info">
            <span class="folder-icon">📁</span>
            <span class="folder-name">${this.escapeHtml(folderPath)}</span>
            <button class="close-folder-filter" title="Clear folder filter">×</button>
        </div>
    `;

    // 插入到搜索框下方
    searchContainer.appendChild(folderState);

    // 绑定关闭事件
    const closeBtn = folderState.querySelector('.close-folder-filter');
    closeBtn.addEventListener('click', () => {
        this.clearFolderFilter();
    });
    }

    // 清除分组过滤

SearchModal.prototype.clearFolderFilter = function() {
    console.log('清除分组过滤');
    this.currentSelectedFolder = null;

    // 移除搜索框下方的分组状态显示
    const folderState = this.modal.querySelector('.folder-filter-state');
    if (folderState) {
        folderState.remove();
    }

    // 移除内容区域顶部的分组状态指示器
    const folderStatusIndicator = this.modal.querySelector('.folder-status-indicator');
    if (folderStatusIndicator) {
        folderStatusIndicator.remove();
    }

    // 根据当前模式决定显示内容
    if (this.activeFilter === 'bookmark') {
        // 书签模式：显示所有书签
        this.displayBookmarkResults(this.allBookmarks);
    } else {
        // 默认搜索模式：返回到之前的搜索结果或欢迎消息
        if (this.previousSearchResults.length > 0) {
            // 恢复之前的搜索结果
            this.results = [...this.previousSearchResults];
            this.displayResults(this.results);

            // 恢复搜索框内容
            const searchInput = this.modal.querySelector('#searchInput');
            if (searchInput) {
                searchInput.value = this.previousSearchQuery;
            }

            // 清空保存的状态
            this.previousSearchResults = [];
            this.previousSearchQuery = '';
        } else {
            // 没有之前的搜索结果，显示欢迎消息
            this.showWelcomeMessage();
        }
    }
    }

    // 在分组内搜索

SearchModal.prototype.deleteBookmark = async function(bookmarkId) {
    try {
        const response = await this.sendMessageToBackground({
            action: 'deleteBookmark',
            bookmarkId: bookmarkId
        });

        if (response.success) {
            console.log('书签删除成功');
            // 重新加载书签列表
            this.loadAllBookmarks();
        } else {
            console.error('删除书签失败:', response.error);
            this.showError('Failed to delete bookmark. Please try again.');
        }
    } catch (error) {
        console.error('删除书签出错:', error);
        this.showError('Error deleting bookmark.');
    }
    }

    // 过滤标签页

SearchModal.prototype.enterBookmarkFolderView = async function(folderPath) {
    console.log('进入书签目录视图:', folderPath);

    // 保存当前的搜索结果和查询
    this.previousSearchResults = [...this.results];
    this.previousSearchQuery = this.modal.querySelector('#searchInput').value;

    // 设置当前选定的文件夹
    this.currentSelectedFolder = folderPath;

    // 清空搜索框
    const searchInput = this.modal.querySelector('#searchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    // 确保书签数据已加载
    if (this.allBookmarks.length === 0) {
        await this.loadAllBookmarks();
    }

    // 获取该文件夹下的所有书签
    const folderBookmarks = this.allBookmarks.filter(bookmark =>
        bookmark.folderPath === folderPath
    );

    // 显示该文件夹下的所有书签
    this.displayBookmarkResults(folderBookmarks);

    // 显示文件夹状态指示器
    this.showFolderFilterState(folderPath);

    console.log(`显示文件夹 "${folderPath}" 下的 ${folderBookmarks.length} 个书签`);
    }

    // 格式化日期
})();
