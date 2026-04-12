// ui-components.js - Auto-extracted module for SearchModal
// Part of the List View Chrome extension

(function() {
    'use strict';

SearchModal.prototype.showLoading = function() {
    const loadingIndicator = this.modal.querySelector('#loadingIndicator');
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    loadingIndicator.style.display = 'flex';
    resultsContainer.innerHTML = '';
    }

    // 显示欢迎信息

SearchModal.prototype.showError = function(message) {
    const loadingIndicator = this.modal.querySelector('#loadingIndicator');
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    loadingIndicator.style.display = 'none';
    resultsContainer.innerHTML = `
        <div class="no-results">
            <p>${message}</p>
        </div>
    `;
    }

    // 辅助方法：获取tab基础URL（去查询参数和hash）

SearchModal.prototype.getBaseUrl = function(url) {
    return url.split('?')[0].split('#')[0].toLowerCase();
    }

    // 辅助方法：从URL提取域名，用于favicon

SearchModal.prototype.getFaviconUrl = function(url) {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
    } catch (e) {
        return '';
    }
    }

    // 辅助方法：检测sortedTabs中的重复URL

SearchModal.prototype.findDuplicateUrls = function(sortedTabs) {
    const urlCount = new Map();
    sortedTabs.forEach(tab => {
        const baseUrl = this.getBaseUrl(tab.url);
        urlCount.set(baseUrl, (urlCount.get(baseUrl) || 0) + 1);
    });
    return urlCount;
    }

    // 显示分组结果（标签页按窗口分组）

SearchModal.prototype.formatDate = function(date) {
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}w ago`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
    }

    // HTML转义

SearchModal.prototype.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
    }

    // 高亮搜索匹配文本
    SearchModal.prototype.highlightText = function(text, query) {
        if (!text || !query || !query.trim()) return this.escapeHtml(text);
        const escaped = this.escapeHtml(text);
        const queryTerms = query.trim().split(/\s+/).filter(Boolean);
        // Build regex with all terms, matching whole tokens
        const pattern = queryTerms.map(term =>
            term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        ).join('|');
        if (!pattern) return escaped;
        const regex = new RegExp(`(${pattern})`, 'gi');
        return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // URL截取

SearchModal.prototype.truncateUrl = function(url, maxLength = 300) {
    if (!url) return '';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
    }

    // 导航搜索结果

SearchModal.prototype.navigateResults = function(direction) {
    // [DEBUG] 临时调试
    console.log('[navigateResults] direction:', direction, 'windowGroups:', !!this.windowGroups, 'results.length:', this.results?.length, 'activeFilter:', this.activeFilter);

    // Tab分组视图：只在当前可见窗口内导航
    if (this.windowGroups && this.windowGroups.length > 0) {
        const visibleItems = this.modal.querySelectorAll('.window-group:not(.window-hidden) .result-item');
        const totalVisible = visibleItems.length;
        if (totalVisible === 0) return;

        this.updateSelectedItem(-1);

        if (direction > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % totalVisible;
        } else {
            this.selectedIndex = this.selectedIndex <= 0 ? totalVisible - 1 : this.selectedIndex - 1;
        }

        // 只在可见元素上操作
        visibleItems.forEach((item, i) => {
            if (i === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
        return;
    }

    // 书签模式
    let totalItems = 0;
    if (this.activeFilter === 'bookmark') {
        const bookmarkItems = this.modal.querySelectorAll('.bookmark-item:not(.hidden)');
        totalItems = bookmarkItems.length;
    } else {
        totalItems = this.results ? this.results.length : 0;
    }

    // 在默认搜索模式下，需要包含AI推荐项
    if (!this.activeFilter) {
        const aiItems = this.modal.querySelectorAll('.ai-result-item');
        totalItems += aiItems.length;
    }

    if (totalItems === 0) return;

    // 移除之前的选中状态
    this.updateSelectedItem(-1);

    // 计算新的选中索引
    if (direction > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % totalItems;
    } else {
        this.selectedIndex = this.selectedIndex <= 0 ? totalItems - 1 : this.selectedIndex - 1;
    }

    // 更新选中状态
    this.updateSelectedItem(this.selectedIndex);
    }

    // 更新选中项

SearchModal.prototype.updateSelectedItem = function(index) {
    // [DEBUG] 临时调试
    console.log('[updateSelectedItem] index:', index, 'activeFilter:', this.activeFilter, 'windowGroups:', !!this.windowGroups);

    // Tab分组视图下不使用此函数（navigateResults 中直接处理）
    if (this.windowGroups && this.windowGroups.length > 0) return;

    // 书签模式：只处理 bookmark-item
    if (this.activeFilter === 'bookmark') {
        const bookmarkItems = this.modal.querySelectorAll('.bookmark-item:not(.hidden)');
        bookmarkItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
        return;
    }

    const resultItems = this.modal.querySelectorAll('.result-item:not(.ai-result-item)');
    const aiItems = this.modal.querySelectorAll('.ai-result-item');

    // 在默认搜索模式下，AI推荐项优先显示
    if (!this.activeFilter && aiItems.length > 0) {
        const aiItemsCount = aiItems.length;

        aiItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });

        resultItems.forEach((item, i) => {
            const adjustedIndex = i + aiItemsCount;
            if (adjustedIndex === index) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    } else {
        resultItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }
    }

    // 打开选中的结果

SearchModal.prototype.openSelectedResult = function() {
    // Tab分组视图：直接从可见DOM获取选中项
    if (this.windowGroups && this.windowGroups.length > 0) {
        const visibleItems = this.modal.querySelectorAll('.window-group:not(.window-hidden) .result-item.selected');
        if (visibleItems.length > 0) {
            const item = visibleItems[0];
            const tabId = parseInt(item.dataset.tabId);
            const windowId = parseInt(item.dataset.windowId);
            this.switchToTab(tabId, windowId);
        }
        return;
    }

    // 书签模式
    if (this.activeFilter === 'bookmark') {
        const bookmarkItems = this.modal.querySelectorAll('.bookmark-item:not(.hidden)');
        if (this.selectedIndex >= 0 && this.selectedIndex < bookmarkItems.length) {
            const selectedItem = bookmarkItems[this.selectedIndex];
            const url = selectedItem.dataset.url;
            if (url) {
                chrome.tabs.create({ url: url });
                this.close();
            }
        }
        return;
    }

    // 默认搜索模式
    const aiItems = this.modal.querySelectorAll('.ai-result-item');
    const aiItemsCount = aiItems.length;

    // 优先处理AI推荐项
    if (aiItemsCount > 0 && this.selectedIndex < aiItemsCount) {
        const selectedAIItem = aiItems[this.selectedIndex];
        const url = selectedAIItem.dataset.url;
        if (url) {
            window.open(url, '_blank');
            this.close();
        }
        return;
    }

    // 处理常规搜索结果项
    let adjustedIndex = this.selectedIndex;
    if (aiItemsCount > 0) {
        adjustedIndex = this.selectedIndex - aiItemsCount;
    }

    if (adjustedIndex >= 0 && adjustedIndex < this.results.length) {
        const selectedResult = this.results[adjustedIndex];
        if (selectedResult.type === 'tab') {
            this.switchToTab(selectedResult.tabId, selectedResult.windowId);
        } else {
            window.open(selectedResult.url, '_blank');
            this.close();
        }
    }
    }

    // 处理输入变化

SearchModal.prototype.getTypeLabel = function(type) {
    const typeLabels = {
        'bookmark': 'Bookmark',
        'history': 'History',
        'tab': 'Tab'
    };
    return typeLabels[type] || 'Unknown';
    }

    // 加载所有标签页
})();
