// 模态框管理类
class SearchModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.init();
    }

    // 初始化模态框
    init() {
        this.createModal();
        this.bindEvents();
    }

    // 创建模态框HTML
    createModal() {
        // 创建模态框容器
        this.modal = document.createElement('div');
        this.modal.id = 'searchModal';
        this.modal.className = 'modal-overlay';
        this.modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-body">
                    <div class="search-section">
                        <div class="input-group">
                            <input type="text" id="searchInput" placeholder="输入搜索关键词..." autocomplete="off">
                            <button id="searchBtn">搜索</button>
                        </div>
                    </div>
                    
                    <div class="results-section">
                        <div id="loadingIndicator" class="loading" style="display: none;">
                            <div class="spinner"></div>
                            <span>搜索中...</span>
                        </div>
                        
                        <!-- 历史统计区域 -->
                        <div id="historyStatsSection" class="history-stats-section" style="display: none;">
                            <div class="stats-header">
                                <h3>📊 过去7天访问统计</h3>
                                <p>按域名分组，显示访问最多的路径</p>
                            </div>
                            <div id="statsContainer" class="stats-container"></div>
                        </div>
                        
                        <div id="resultsContainer" class="results-container">
                            <div class="welcome-message">
                                <p>输入关键词开始搜索您的书签和浏览历史</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <small>显示最近12条匹配结果</small>
                </div>
            </div>
        `;

        // 添加CSS样式
        this.addStyles();

        // 添加到页面
        document.body.appendChild(this.modal);
    }

    // 添加CSS样式
    addStyles() {
        if (document.getElementById('searchModalStyles')) return;

        const style = document.createElement('style');
        style.id = 'searchModalStyles';
        style.textContent = `
            /* 模态框遮罩层 - 半透明背景 */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: flex-start; /* 改为顶部对齐 */
                justify-content: center;
                z-index: 999999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(4px);
                padding-top: 6.67vh; /* 距离顶部1/6的位置 */
            }

            .modal-overlay.show {
                opacity: 1;
                visibility: visible;
            }

                /* 模态框容器 - 居中显示，距离顶部适当距离 */
                .modal-container {
                    width: 66.67%; /* 页面宽度的2/3 */
                    max-width: 800px; /* 最大宽度限制 */
                    min-width: 400px; /* 最小宽度限制 */
                    max-height: 80vh;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                    overflow: hidden;
                    transform: scale(0.9) translateY(-30px);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    margin-top: 16.67vh; /* 距离顶部1/6的位置 */
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    position: relative;
                    z-index: 1000000;
                }

            .modal-overlay.show .modal-container {
                transform: scale(1) translateY(0);
            }




            .modal-close:active {
                transform: scale(0.95);
            }

            /* 模态框主体 */
            .modal-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .search-section {
                padding: 20px;
                background: #f8f9fa;
                border-bottom: 1px solid #e9ecef;
                flex-shrink: 0;
            }

            .input-group {
                display: flex;
                gap: 10px;
            }

            #searchInput {
                flex: 1;
                padding: 12px 16px;
                border: 2px solid #e9ecef;
                border-radius: 10px;
                font-size: 14px;
                transition: all 0.3s ease;
                outline: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            #searchInput:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                transform: translateY(-1px);
            }

            #searchBtn {
                padding: 12px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            #searchBtn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }

            #searchBtn:active {
                transform: translateY(0);
            }

            /* 结果区域 */
            .results-section {
                flex: 1;
                overflow-y: auto;
                max-height: 400px;
            }

            .loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 20px;
                color: #667eea;
                font-weight: 500;
            }

            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #e9ecef;
                border-top: 2px solid #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .welcome-message {
                text-align: center;
                color: #6c757d;
                padding: 40px 20px;
            }

            .welcome-message p {
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
            }

            .results-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 20px;
            }

            .result-item {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 10px;
                padding: 12px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .result-item:hover {
                background: #e9ecef;
                border-color: #667eea;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .result-title {
                font-size: 14px;
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .result-url {
                font-size: 12px;
                color: #667eea;
                margin-bottom: 4px;
                word-break: break-all;
            }

            .result-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 11px;
                color: #6c757d;
            }

            .result-type {
                background: #667eea;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
            }

            .result-date {
                font-size: 11px;
            }

            .no-results {
                text-align: center;
                color: #6c757d;
                padding: 40px 20px;
            }

            .no-results p {
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
            }

            /* 模态框页脚 */
            .modal-footer {
                background: #f8f9fa;
                padding: 12px 20px;
                text-align: center;
                border-top: 1px solid #e9ecef;
                flex-shrink: 0;
                border-radius: 0 0 16px 16px;
            }

            .modal-footer small {
                color: #6c757d;
                font-size: 11px;
            }

            /* 历史统计区域样式 */
            .history-stats-section {
                padding: 20px;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-bottom: 1px solid #dee2e6;
            }

            .stats-header {
                text-align: center;
                margin-bottom: 20px;
            }

            .stats-header h3 {
                margin: 0 0 8px 0;
                color: #495057;
                font-size: 16px;
                font-weight: 600;
            }

            .stats-header p {
                margin: 0;
                color: #6c757d;
                font-size: 12px;
            }

            .stats-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .domain-group {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
                transition: all 0.3s ease;
            }

            .domain-group:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            }

            .domain-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e9ecef;
            }

            .domain-name {
                font-size: 14px;
                font-weight: 600;
                color: #495057;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .domain-icon {
                width: 16px;
                height: 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
            }

            .domain-visits {
                font-size: 12px;
                color: #6c757d;
                background: #f8f9fa;
                padding: 4px 8px;
                border-radius: 12px;
            }

            .paths-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .path-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background: #f8f9fa;
                border-radius: 8px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .path-item:hover {
                background: #e9ecef;
                transform: translateX(4px);
            }

            .path-info {
                flex: 1;
                min-width: 0;
            }

            .path-name {
                font-size: 13px;
                color: #495057;
                font-weight: 500;
                margin-bottom: 2px;
                word-break: break-all;
            }

            .path-title {
                font-size: 11px;
                color: #6c757d;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .path-count {
                font-size: 12px;
                color: #667eea;
                font-weight: 600;
                background: rgba(102, 126, 234, 0.1);
                padding: 4px 8px;
                border-radius: 12px;
                min-width: 40px;
                text-align: center;
            }

            .no-stats {
                text-align: center;
                color: #6c757d;
                padding: 20px;
                font-size: 14px;
            }

            .stats-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 20px;
                color: #667eea;
            }

            /* 滚动条样式 */
            .results-section::-webkit-scrollbar {
                width: 6px;
            }

            .results-section::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }

            .results-section::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }

            .results-section::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            /* 响应式设计 */
            @media (max-width: 480px) {
                .modal-container {
                    width: 95vw;
                    max-width: 300px;
                    margin: 20px;
                }
                
                
                .search-section {
                    padding: 15px;
                }
                
                .results-container {
                    padding: 15px;
                }
            }

                /* 防止页面滚动 */
                body.modal-open {
                    overflow: hidden;
                    position: fixed;
                    width: 100%;
                    top: 0;
                    left: 0;
                }

                /* 响应式设计 */
                @media (max-width: 768px) {
                    .modal-container {
                        width: 90%;
                        min-width: 300px;
                        margin-top: 10vh;
                    }
                    
                    .input-group {
                        flex-direction: column;
                    }
                    
                    .input-group button {
                        width: 100%;
                    }
                }
        `;
        document.head.appendChild(style);
    }


    // 绑定事件
    bindEvents() {
        // 点击遮罩层关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.close();
            }
        });

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // 搜索功能
        this.bindSearchEvents();
    }

    // 绑定搜索事件
    bindSearchEvents() {
        const searchInput = this.modal.querySelector('#searchInput');
        const searchBtn = this.modal.querySelector('#searchBtn');

        // 搜索按钮点击
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            this.searchBookmarksAndHistory(query);
        });

        // 回车搜索
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                this.searchBookmarksAndHistory(query);
            }
        });

        // 实时搜索（防抖）
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    this.searchBookmarksAndHistory(query);
                } else if (query.length === 0) {
                    this.showWelcomeMessage();
                }
            }, 300);
        });
    }

    // 显示模态框
    show() {
        if (this.isOpen) return;

        // 防止页面滚动
        document.body.classList.add('modal-open');

        // 保存当前滚动位置
        this.scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        this.modal.classList.add('show');
        this.isOpen = true;

        // 显示历史统计
        this.loadHistoryStats();

        // 聚焦到输入框
        setTimeout(() => {
            const searchInput = this.modal.querySelector('#searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 300);
    }

    // 关闭模态框
    close() {
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
    async searchBookmarksAndHistory(query) {
        if (!query.trim()) {
            this.showWelcomeMessage();
            return;
        }

        // 隐藏历史统计区域
        const historyStatsSection = this.modal.querySelector('#historyStatsSection');
        if (historyStatsSection) {
            historyStatsSection.style.display = 'none';
        }

        this.showLoading();

        try {
            // 通过消息传递请求background script进行搜索
            const response = await this.sendMessageToBackground({
                action: 'searchBookmarksAndHistory',
                query: query
            });

            if (response.success) {
                this.displayResults(response.results);
            } else {
                console.error('搜索失败:', response.error);
                this.showError('搜索时出现错误，请重试');
            }
        } catch (error) {
            console.error('搜索出错:', error);
            this.showError('搜索时出现错误，请重试');
        }
    }

    // 发送消息到background script
    async sendMessageToBackground(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    // 显示加载状态
    showLoading() {
        const loadingIndicator = this.modal.querySelector('#loadingIndicator');
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        loadingIndicator.style.display = 'flex';
        resultsContainer.innerHTML = '';
    }

    // 显示欢迎信息
    showWelcomeMessage() {
        const loadingIndicator = this.modal.querySelector('#loadingIndicator');
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        const historyStatsSection = this.modal.querySelector('#historyStatsSection');

        loadingIndicator.style.display = 'none';

        // 显示历史统计区域
        if (historyStatsSection) {
            historyStatsSection.style.display = 'block';
        }

        resultsContainer.innerHTML = `
            <div class="welcome-message">
                <p>输入关键词开始搜索您的书签和浏览历史</p>
            </div>
        `;
    }

    // 显示错误信息
    showError(message) {
        const loadingIndicator = this.modal.querySelector('#loadingIndicator');
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        loadingIndicator.style.display = 'none';
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>${message}</p>
            </div>
        `;
    }

    // 显示搜索结果
    displayResults(results) {
        const loadingIndicator = this.modal.querySelector('#loadingIndicator');
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        loadingIndicator.style.display = 'none';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>未找到匹配的结果</p>
                    <p>尝试使用不同的关键词</p>
                </div>
            `;
            return;
        }

        const resultsHTML = results.map(result => {
            const date = new Date(result.lastVisitTime || result.dateAdded);
            const formattedDate = this.formatDate(date);
            const typeLabel = result.type === 'bookmark' ? '书签' : '历史';

            return `
                <div class="result-item" data-url="${result.url}">
                    <div class="result-title">${this.escapeHtml(result.title)}</div>
                    <div class="result-url">${this.escapeHtml(result.url)}</div>
                    <div class="result-meta">
                        <span class="result-type">${typeLabel}</span>
                        <span class="result-date">${formattedDate}</span>
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHTML;

        // 添加点击事件
        this.modal.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                window.open(url, '_blank');
                this.close();
            });
        });
    }

    // 格式化日期
    formatDate(date) {
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return '今天';
        } else if (diffDays === 1) {
            return '昨天';
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}周前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 加载历史统计
    async loadHistoryStats() {
        const historyStatsSection = this.modal.querySelector('#historyStatsSection');
        const statsContainer = this.modal.querySelector('#statsContainer');

        // 显示统计区域
        historyStatsSection.style.display = 'block';

        // 显示加载状态
        statsContainer.innerHTML = `
            <div class="stats-loading">
                <div class="spinner"></div>
                <span>正在加载历史统计...</span>
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
                this.showStatsError('获取历史统计失败，请重试');
            }
        } catch (error) {
            console.error('历史统计请求出错:', error);
            this.showStatsError('获取历史统计时出现错误');
        }
    }

    // 显示历史统计
    displayHistoryStats(stats) {
        const statsContainer = this.modal.querySelector('#statsContainer');

        if (!stats || stats.length === 0) {
            statsContainer.innerHTML = `
                <div class="no-stats">
                    <p>📊 过去7天暂无访问记录</p>
                    <p>开始浏览网页后，这里会显示您的访问统计</p>
                </div>
            `;
            return;
        }

        const statsHTML = stats.map(domain => {
            const domainIcon = this.getDomainIcon(domain.domain);
            const pathsHTML = domain.paths.map(path => `
                <div class="path-item" data-path="${this.escapeHtml(path.path)}" data-domain="${this.escapeHtml(domain.domain)}">
                    <div class="path-info">
                        <div class="path-name">${this.escapeHtml(path.path)}</div>
                        <div class="path-title">${this.escapeHtml(path.title || '无标题')}</div>
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
                        <div class="domain-visits">总访问 ${domain.totalVisits} 次</div>
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
    getDomainIcon(domain) {
        // 提取域名首字母作为图标
        const firstChar = domain.charAt(0).toUpperCase();
        return firstChar;
    }

    // 显示统计错误
    showStatsError(message) {
        const statsContainer = this.modal.querySelector('#statsContainer');
        statsContainer.innerHTML = `
            <div class="no-stats">
                <p>❌ ${message}</p>
            </div>
        `;
    }
}

// 导出模态框类
window.SearchModal = SearchModal;
