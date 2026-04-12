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
    // 收集当前所有可选中的条目（统一基于DOM）
    let items;
    if (this.windowGroups && this.windowGroups.length > 0) {
        // Tab分组视图：只在当前可见窗口内
        items = this.modal.querySelectorAll('.window-group:not(.window-hidden) .result-item');
    } else if (this.activeFilter === 'bookmark') {
        items = this.modal.querySelectorAll('.bookmark-item:not(.hidden)');
    } else {
        // 默认搜索模式：AI推荐 + 普通结果，按DOM顺序
        items = this.modal.querySelectorAll('.ai-result-item, .result-item:not(.ai-result-item)');
    }

    const total = items.length;
    if (total === 0) return;

    // 清除之前所有选中态
    this.modal.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    // 计算新索引
    if (direction > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % total;
    } else {
        this.selectedIndex = this.selectedIndex <= 0 ? total - 1 : this.selectedIndex - 1;
    }

    // 选中
    const target = items[this.selectedIndex];
    if (target) {
        target.classList.add('selected');
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    }

    // 清除所有选中态（供外部调用）
    SearchModal.prototype.clearSelection = function() {
        this.selectedIndex = -1;
        this.modal.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    }

    // updateSelectedItem 保留用于向后兼容，但内部统一使用 navigateResults
    SearchModal.prototype.updateSelectedItem = function(index) {
        if (index < 0) {
            this.modal.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        }
    }

    // 打开选中的结果

SearchModal.prototype.openSelectedResult = function() {
    // 统一基于DOM获取选中项
    const selected = this.modal.querySelector('.result-item.selected, .bookmark-item.selected, .ai-result-item.selected');
    if (!selected) return;

    const url = selected.dataset.url;
    const tabId = selected.dataset.tabId ? parseInt(selected.dataset.tabId) : null;
    const windowId = selected.dataset.windowId ? parseInt(selected.dataset.windowId) : null;

    if (tabId && windowId) {
        // Tab类型：切换到对应标签页
        this.switchToTab(tabId, windowId);
    } else if (url) {
        // 书签、历史、AI推荐：打开新标签页
        window.open(url, '_blank');
        this.close();
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
