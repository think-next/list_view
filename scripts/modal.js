// 模态框管理类
class SearchModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.selectedIndex = -1; // 当前选中的结果索引
        this.results = []; // 存储搜索结果
        this.activeFilter = null; // 当前激活的过滤器：'history', 'tab', 'bookmark'
        this.filterDropdown = null; // 过滤器下拉列表
        this.filterSelectedIndex = -1; // 当前选中的过滤器选项索引
        this.allTabs = null; // 存储所有标签页数据

        // 书签分组状态管理
        this.currentSelectedFolder = null; // 当前选定的书签分组
        this.allBookmarks = []; // 存储所有书签的原始数据

        // AI调用状态管理
        this.aiCallInProgress = false;
        this.currentAIQuery = null;
        this.aiCallAbortController = null;
        this.aiCallPromise = null;  // 存储当前的AI调用Promise

        // AI设置缓存
        this.aiEnabled = null;

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
                            <div class="filter-container">
                                <div class="input-row">
                                    <div id="activeFilterTag" class="filter-tag" style="display: none;"></div>
                                    <input type="text" id="searchInput" placeholder="输入搜索关键词..." autocomplete="off">
                                </div>
                                <div id="filterDropdown" class="filter-dropdown" style="display: none;"></div>
                            </div>
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
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: flex-start; /* 改为顶部对齐 */
                justify-content: center;
                z-index: 999999 !important;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(4px);
                padding-top: 6.67vh; /* 距离顶部1/6的位置 */
                /* 确保不受网页样式影响 */
                margin: 0 !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                transform: none !important;
                box-sizing: border-box !important;
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
                    /* 确保居中定位 */
                    margin-left: auto !important;
                    margin-right: auto !important;
                    position: relative !important;
                    box-sizing: border-box !important;
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





            /* 书签样式 */
            .bookmark-item {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                margin-bottom: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .bookmark-item:hover {
                background: #f1f5f9;
                border-color: #2563eb;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
            }

            .bookmark-item.selected {
                background: #dbeafe;
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            }

            .result-url {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
                word-break: break-all;
                opacity: 0.8;
            }

            .bookmark-actions {
                display: flex;
                gap: 4px;
                align-items: center;
            }

            .delete-bookmark-btn {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                color: #64748b;
                cursor: pointer;
                padding: 6px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
                min-width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .delete-bookmark-btn:hover {
                background: #fef2f2;
                border-color: #fca5a5;
                color: #dc2626;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
            }

            .delete-bookmark-btn:active {
                transform: translateY(0);
                box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
            }

            .bookmark-folder {
                background: #e0f2fe;
                color: #0369a1;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 500;
                margin-left: 8px;
                border: 1px solid #bae6fd;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .bookmark-folder:hover {
                background: #bae6fd;
                color: #0c4a6e;
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(3, 105, 161, 0.2);
            }

            .folder-filter-state {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 8px;
                padding: 8px 12px;
                margin-top: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .folder-filter-info {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .folder-icon {
                font-size: 14px;
            }

            .folder-name {
                font-size: 13px;
                font-weight: 500;
                color: #0369a1;
            }

            .close-folder-filter {
                background: transparent;
                border: none;
                color: #64748b;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                transition: all 0.2s ease;
            }

            .close-folder-filter:hover {
                background: #fef2f2;
                color: #dc2626;
            }

            .folder-status-indicator {
                background: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .folder-status-content {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
            }

            .folder-status-icon {
                font-size: 16px;
            }

            .folder-status-text {
                font-size: 14px;
                font-weight: 500;
                color: #0369a1;
                flex: 1;
            }

            .folder-status-close {
                background: transparent;
                border: none;
                color: #64748b;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 16px;
                font-weight: bold;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .folder-status-close:hover {
                background: #fef2f2;
                color: #dc2626;
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
                background: #f8fafc;
                border-bottom: 1px solid #e2e8f0;
                flex-shrink: 0;
            }

            .input-group {
                display: flex;
                gap: 10px;
            }

            .filter-container {
                position: relative;
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: stretch;
            }

            .input-row {
                display: flex;
                align-items: stretch;
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                position: relative;
            }

            .input-row::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }

            .input-row:focus-within {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1);
                transform: translateY(-1px);
            }

            .input-row:focus-within::before {
                opacity: 1;
            }

            .filter-tag {
                background: #dbeafe;
                color: #2563eb;
                padding: 12px 16px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                gap: 6px;
                border-right: 1px solid rgba(37, 99, 235, 0.2);
                position: relative;
            }

            .filter-tag::before {
                content: '';
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                width: 1px;
                background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.3), transparent);
            }

            .filter-tag:hover {
                background: #f1f8ff;
                transform: translateX(2px);
            }

            .filter-tag:active {
                transform: translateX(1px) scale(0.98);
            }

            .filter-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                z-index: 1000002;
                margin-top: 4px;
                width: 100%;
                overflow: hidden;
            }

            .filter-option {
                padding: 10px 16px;
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                align-items: center;
                gap: 8px;
                position: relative;
                min-height: 40px;
            }

            .filter-option:last-child {
                border-bottom: none;
            }

            .filter-option:hover {
                background: #f1f5f9;
            }

            .filter-option.selected {
                background: #dbeafe;
                color: #2563eb;
            }

            .filter-option span {
                font-size: 13px;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                color: #475569;
            }

            .filter-option small {
                font-size: 11px;
                opacity: 0.6;
                font-weight: 400;
                margin-left: auto;
                white-space: nowrap;
                color: #64748b;
            }

            .filter-option.selected small {
                opacity: 0.9;
            }

            /* 窗口分组样式 */
            .window-group {
                margin-bottom: 20px;
                background: #f1f5f9;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }

            .window-header {
                background: #dbeafe;
                color: #475569;
                padding: 12px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .window-title-container {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }

            .window-title {
                cursor: pointer;
                position: relative;
                padding: 4px 8px;
                border-radius: 6px;
                transition: all 0.2s ease;
                border: 1px solid transparent;
            }

            .window-menu-btn {
                background: #2563eb;
                border: 1px solid #2563eb;
                color: white;
                padding: 6px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 600;
                transition: all 0.2s ease;
                opacity: 0.9;
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 50px;
                height: 28px;
                position: relative;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .window-menu-btn:hover {
                background: #1d4ed8;
                border-color: #1d4ed8;
                opacity: 1;
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(30, 64, 175, 0.3);
            }

            .window-menu-btn:active {
                transform: translateY(0);
                background: #1e3a8a;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }


            .window-header h4 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
            }

            .window-title {
                cursor: pointer;
                position: relative;
                padding: 4px 8px;
                border-radius: 6px;
                transition: all 0.2s ease;
                border: 1px solid transparent;
            }

            .window-title:hover {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }

            .window-title::after {
                content: '✏️';
                opacity: 0.6;
                margin-left: 6px;
                font-size: 10px;
                transition: opacity 0.2s ease;
                position: relative;
            }

            .window-title.has-menu::before {
                content: '';
                position: absolute;
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 1px;
                height: 16px;
                background: #2563eb;
            }

            .window-title:hover::after {
                opacity: 0.9;
            }

            .window-name-input {
                background: rgba(255, 255, 255, 0.9);
                border: 2px solid #2563eb;
                border-radius: 6px;
                padding: 4px 8px;
                font-size: 14px;
                font-weight: 600;
                color: #475569;
                outline: none;
                width: 100%;
                max-width: 200px;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
            }

            .window-name-input:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            /* 窗口菜单样式 */
            .window-menu {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                overflow: hidden;
                backdrop-filter: blur(10px);
                min-width: 200px;
            }

            .window-menu-header {
                background: #dbeafe;
                color: #2563eb;
                padding: 8px 12px;
                font-size: 12px;
                font-weight: 600;
                text-align: center;
            }

            .window-menu-items {
                padding: 4px 0;
            }

            .window-menu-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                border-bottom: 1px solid #f1f5f9;
                gap: 8px;
            }

            .window-menu-item:last-child {
                border-bottom: none;
            }

            .window-menu-item:hover {
                background: #f1f5f9;
                transform: translateX(4px);
            }

            .menu-icon {
                font-size: 14px;
                opacity: 0.7;
            }

            .menu-text {
                font-size: 13px;
                color: #495057;
                font-weight: 500;
            }

            .tab-count {
                font-size: 12px;
                opacity: 0.9;
                background: rgba(255, 255, 255, 0.2);
                padding: 4px 8px;
                border-radius: 12px;
            }

            .tabs-list {
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .tab-item {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                transition: all 0.2s ease;
            }

            .tab-item:hover {
                border-color: #2563eb;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .tab-item.active {
                border-color: #28a745;
                background: #dcfce7;
            }

            .tab-item.pinned {
                border-left: 4px solid #ffc107;
            }


            .pinned-indicator {
                margin-left: 4px;
                font-size: 12px;
            }

            .tab-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .close-tab-btn {
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                transition: all 0.2s ease;
                opacity: 0.7;
            }

            .close-tab-btn:hover {
                background: #c82333;
                opacity: 1;
                transform: scale(1.1);
            }

            .close-tab-btn:active {
                transform: scale(0.95);
            }

            #searchInput {
                flex: 1;
                padding: 12px 16px;
                border: none;
                border-radius: 0;
                font-size: 14px;
                transition: all 0.3s ease;
                outline: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-width: 0;
                background: transparent;
                color: #475569;
            }

            #searchInput::placeholder {
                color: #9ca3af;
                font-weight: 400;
            }

            #searchInput:focus {
                background: rgba(102, 126, 234, 0.02);
            }

            #searchBtn {
                padding: 12px 20px;
                background: #dbeafe;
                color: #2563eb;
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
                color: #2563eb;
                font-weight: 500;
            }

            .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #e2e8f0;
                border-top: 2px solid #2563eb;
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
                position: relative;
                z-index: 1;
            }

            .result-item {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .result-item:hover {
                background: #e2e8f0;
                border-color: #2563eb;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .result-item.selected {
                background: #2563eb;
                border-color: #2563eb;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .result-item.selected .result-title {
                color: white;
            }

            .result-item.selected .result-url {
                color: rgba(255, 255, 255, 0.8);
            }

            .result-item.selected .result-date {
                color: rgba(255, 255, 255, 0.7);
            }

            .result-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
            }

            .result-header-left {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                min-width: 0;
            }

            .result-title {
                font-size: 14px;
                font-weight: 600;
                color: #475569;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
                flex: 1;
                min-width: 0;
            }

            .result-url {
                font-size: 12px;
                color: #2563eb;
                word-break: break-all;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .result-type {
                background: #2563eb;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 600;
                flex-shrink: 0;
            }

            .result-date {
                font-size: 11px;
                color: #6c757d;
                flex-shrink: 0;
                margin-left: 8px;
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
                background: #f8fafc;
                padding: 12px 20px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
                flex-shrink: 0;
                border-radius: 0 0 16px 16px;
            }

            .modal-footer small {
                color: #6c757d;
                font-size: 11px;
            }

            /* AI推荐样式 */
            .ai-recommendations {
                background: #f1f8ff;
                border-radius: 12px;
                margin-bottom: 20px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .ai-header {
                display: flex;
                align-items: center;
                padding: 16px 20px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-weight: 600;
                font-size: 14px;
            }

            .ai-icon {
                font-size: 18px;
                margin-right: 8px;
            }

            .ai-title {
                flex: 1;
            }

            .ai-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-left: 8px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .ai-results {
                padding: 0;
            }

            .ai-result-item {
                display: flex;
                align-items: center;
                padding: 16px 20px;
                background: white;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: all 0.2s ease;
                position: relative;
            }

            .ai-result-item:last-child {
                border-bottom: none;
            }

            .ai-result-item:hover {
                background: #f8fafc;
                transform: translateX(4px);
            }

            .ai-result-content {
                flex: 1;
                min-width: 0;
            }

            .ai-result-title {
                font-weight: 600;
                color: #475569;
                margin-bottom: 4px;
                font-size: 14px;
                line-height: 1.4;
            }

            .ai-result-reason {
                color: #666;
                font-size: 12px;
                margin-bottom: 4px;
                line-height: 1.3;
            }

            .ai-result-url {
                color: #999;
                font-size: 11px;
                font-family: monospace;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .ai-result-badge {
                background: #f1f8ff;
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 10px;
                font-weight: 600;
                margin-left: 12px;
                white-space: nowrap;
            }

            /* AI下载样式 */
            .ai-download {
                background: #f1f8ff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
            }

            .ai-download-header {
                display: flex;
                align-items: center;
                padding: 24px 24px 16px 24px;
                background: rgba(255, 255, 255, 0.1);
            }

            .ai-download-icon {
                margin-right: 16px;
                flex-shrink: 0;
            }

            .ai-download-icon-bg {
                width: 48px;
                height: 48px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            }

            .ai-download-emoji {
                font-size: 24px;
            }

            .ai-download-content {
                flex: 1;
            }

            .ai-download-title {
                color: white;
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 4px 0;
            }

            .ai-download-description {
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                margin: 0;
                line-height: 1.4;
            }

            .ai-download-features {
                padding: 16px 24px;
                background: rgba(255, 255, 255, 0.05);
            }

            .ai-feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                color: rgba(255, 255, 255, 0.9);
                font-size: 13px;
            }

            .ai-feature-item:last-child {
                margin-bottom: 0;
            }

            .ai-feature-icon {
                margin-right: 8px;
                font-size: 14px;
            }

            .ai-feature-text {
                font-weight: 500;
            }

            .ai-download-actions {
                padding: 20px 24px 24px 24px;
                display: flex;
                gap: 12px;
            }

            .ai-download-primary-btn {
                flex: 1;
                background: #22c55e;
                color: white;
                border: none;
                border-radius: 12px;
                padding: 14px 20px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                box-shadow: 0 4px 16px rgba(46, 213, 115, 0.3);
            }

            .ai-download-primary-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(46, 213, 115, 0.4);
            }

            .ai-download-primary-btn:active {
                transform: translateY(0);
            }

            .ai-download-secondary-btn {
                background: rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 14px 20px;
                font-weight: 500;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }

            .ai-download-secondary-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                transform: translateY(-1px);
            }

            .ai-btn-icon {
                font-size: 16px;
            }

            .ai-btn-text {
                font-weight: inherit;
            }

            /* AI检测弹框样式 - 与搜索记录风格统一 */
            .ai-detection {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 0;
                transition: all 0.2s ease;
            }

            .ai-detection-header {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
            }

            .ai-detection-icon {
                width: 32px;
                height: 32px;
                background: #2563eb;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                font-size: 16px;
                color: white;
            }

            .ai-detection-title {
                color: #475569;
                font-size: 14px;
                font-weight: 600;
                margin: 0;
            }

            .ai-detection-content {
                padding: 0;
            }

            .ai-status-container {
                display: flex;
                align-items: center;
                margin-bottom: 16px;
                padding: 12px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            }

            .ai-status-icon {
                font-size: 18px;
                margin-right: 10px;
                flex-shrink: 0;
            }

            .ai-status-text {
                color: #666;
                font-size: 13px;
                font-weight: 500;
                line-height: 1.4;
                margin: 0;
            }

            .ai-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .ai-btn {
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 500;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid;
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 100px;
                justify-content: center;
            }

            .ai-btn-primary {
                background: #2563eb;
                color: white;
                border-color: #2563eb;
            }

            .ai-btn-primary:hover {
                background: #2563eb;
                border-color: #2563eb;
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .ai-btn-primary:active {
                transform: translateY(0);
            }

            .ai-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .ai-btn-secondary {
                background: #ffffff;
                color: #666;
                border-color: #e2e8f0;
            }

            .ai-btn-secondary:hover {
                background: #f8fafc;
                border-color: #2563eb;
                color: #2563eb;
                transform: translateY(-1px);
            }

            .ai-btn-secondary:active {
                transform: translateY(0);
            }

            .ai-downloading {
                background: #f1f8ff;
                position: relative;
                overflow: hidden;
            }

            .ai-downloading::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                animation: shimmer 2s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            .ai-downloading-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                height: 40px;
                margin-right: 15px;
                flex-shrink: 0;
            }

            .ai-spinner-download {
                width: 24px;
                height: 24px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .ai-title-section {
                display: flex;
                flex-direction: column;
                flex: 1;
                justify-content: center;
                min-height: 40px;
            }

            .ai-subtitle {
                font-size: 12px;
                opacity: 0.8;
                margin-top: 2px;
                font-weight: 400;
            }

            .ai-download-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }

            .ai-download-btn, .ai-cancel-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .ai-download-btn {
                background: #2ed573;
                color: white;
            }

            .ai-download-btn:hover {
                background: #26d065;
                transform: translateY(-2px);
            }

            .ai-cancel-btn {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }

            .ai-cancel-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .ai-progress-container {
                margin-top: 20px;
                padding: 0 20px 20px 20px;
            }

            .ai-progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .ai-progress-label {
                font-size: 14px;
                font-weight: 500;
                opacity: 0.9;
            }

            .ai-progress-percentage {
                font-size: 16px;
                font-weight: 600;
                color: #fff;
            }

            .ai-progress-bar {
                position: relative;
                width: 100%;
                height: 12px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .ai-progress-fill {
                height: 100%;
                background: #22c55e;
                border-radius: 6px;
                transition: width 0.5s ease;
                position: relative;
            }

            .ai-progress-glow {
                position: absolute;
                top: 0;
                right: 0;
                width: 20px;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6));
                border-radius: 0 6px 6px 0;
                animation: glow 1.5s ease-in-out infinite alternate;
            }

            @keyframes glow {
                0% { opacity: 0.3; }
                100% { opacity: 0.8; }
            }

            .ai-progress-details {
                text-align: center;
                margin-top: 8px;
            }

            .ai-progress-status {
                font-size: 12px;
                opacity: 0.8;
                font-style: italic;
                display: inline-block;
                padding: 4px 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
            }

            .ai-error {
                background: #fef2f2;
            }

            .ai-error-content {
                padding: 16px 20px;
                background: white;
                color: #475569;
            }

            .ai-error-content p {
                margin: 0 0 12px 0;
                font-size: 14px;
                line-height: 1.4;
            }

            .ai-error-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .ai-settings-btn, .ai-check-btn, .ai-permission-btn {
                background: #fef2f2;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ai-check-btn {
                background: #f1f8ff;
            }

            .ai-permission-btn {
                background: #dcfce7;
            }

            .ai-settings-btn:hover, .ai-check-btn:hover, .ai-permission-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }

            /* 历史统计区域样式 */
            .history-stats-section {
                padding: 20px;
                background: #f8fafc;
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
                border: 1px solid #e2e8f0;
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
                border-bottom: 1px solid #e2e8f0;
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
                background: #f1f8ff;
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
                background: #f8fafc;
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
                background: #f8fafc;
                border-radius: 8px;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .path-item:hover {
                background: #e2e8f0;
                transform: translateX(4px);
            }

            .path-info {
                flex: 1;
                min-width: 0;
            }

            .path-title {
                font-size: 13px;
                color: #495057;
                font-weight: 500;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                line-height: 1.4;
            }

            .path-count {
                font-size: 12px;
                color: #2563eb;
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
                color: #2563eb;
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
    bindSearchEvents() {
        const searchInput = this.modal.querySelector('#searchInput');
        const searchBtn = this.modal.querySelector('#searchBtn');

        // 搜索按钮点击
        searchBtn.addEventListener('click', async () => {
            console.log('🖱️ 搜索按钮被点击');
            const query = searchInput.value.trim();
            console.log('🔍 搜索查询:', query);
            await this.searchBookmarksAndHistory(query);
        });

        // 回车搜索
        searchInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                console.log('⌨️ Enter键被按下');
                const query = searchInput.value.trim();
                console.log('🔍 搜索查询:', query);
                await this.searchBookmarksAndHistory(query);
            }
        });

        // 实时搜索（防抖）
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                console.log('🔍 用户输入触发搜索:', query);

                // 自动触发搜索
                if (query.length > 0) {
                    this.searchBookmarksAndHistory(query);
                } else {
                    // 如果输入为空，显示欢迎信息
                    this.showWelcomeMessage();
                }

                // 同时处理输入变化（用于AI推荐等）
                this.handleInputChange(query);
            }, 300); // 增加防抖时间到300ms，避免过于频繁的搜索
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

        // 初始化时获取并显示当前的maxResults配置
        this.loadCurrentMaxResults();

        // 预加载AI开关配置（不阻塞UI）
        this.checkAIEnabled().catch(() => { });

        // 默认显示list tab内容，但保持搜索框为默认状态
        this.loadAllTabs();

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
            // 如果有选定的分组且是书签模式，在分组内搜索
            if (this.currentSelectedFolder && this.activeFilter === 'bookmark') {
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
                if (response.isGrouped) {
                    this.displayGroupedResults(response.results);
                } else if (this.activeFilter === 'bookmark') {
                    // 书签模式下使用书签展示方式
                    this.displayBookmarkResults(response.results);
                } else {
                    this.displayResults(response.results);
                }

                // 注意：AI推荐现在只在手动触发时调用
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
    async sendMessageToBackground(message, retryCount = 0) {
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
        } else {
            // 默认显示list tab内容（与插件启动时相同）
            this.loadAllTabs();
        }
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

    // 显示分组结果（标签页按窗口分组）
    displayGroupedResults(windowGroups) {
        console.log('显示分组结果:', windowGroups);
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
            console.log('没有找到窗口组');
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>未找到匹配的标签页</p>
                    <p>尝试使用不同的关键词</p>
                </div>
            `;

            // 如果有AI推荐模块，重新插入到最前面
            if (aiDetection) {
                resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
            }
            return;
        }

        const groupsHTML = windowGroups.map((group, groupIndex) => {
            // 对当前窗口组内的tabs按URL排序
            const sortedTabs = [...group.tabs].sort((a, b) => {
                // 去掉URL中?的部分进行排序
                const urlA = a.url.split('?')[0].toLowerCase();
                const urlB = b.url.split('?')[0].toLowerCase();
                return urlA.localeCompare(urlB);
            });

            const tabsHTML = sortedTabs.map((tab, tabIndex) => {
                const truncatedUrl = this.truncateUrl(tab.url);
                const isActive = tab.active ? 'active' : '';
                const isPinned = tab.pinned ? 'pinned' : '';

                return `
                    <div class="result-item tab-item ${isActive} ${isPinned}" 
                         data-url="${tab.url}" 
                         data-tab-id="${tab.tabId}" 
                         data-window-id="${tab.windowId}">
                        <div class="result-header">
                            <div class="result-header-left">
                                <span class="result-type">标签页</span>
                                <span class="result-title">${this.escapeHtml(tab.title)}</span>
                                ${tab.pinned ? '<span class="pinned-indicator">📌</span>' : ''}
                            </div>
                            <div class="tab-actions">
                                <button class="close-tab-btn" data-tab-id="${tab.tabId}" title="关闭标签页">×</button>
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
                            <h4 class="window-title${hasMultipleWindows ? ' has-menu' : ''}" data-window-id="${group.windowId}" title="点击编辑窗口名称">${this.escapeHtml(displayName)}</h4>
                            ${hasMultipleWindows ? `<button class="window-menu-btn" data-window-id="${group.windowId}" title="合并窗口">merge</button>` : ''}
                        </div>
                        <span class="tab-count">${group.tabs.length} 个标签页</span>
                    </div>
                    <div class="tabs-list">
                        ${tabsHTML}
                    </div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = groupsHTML;

        // 如果有AI推荐模块，重新插入到最前面
        if (aiDetection) {
            resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
        }

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

    // 加载当前的maxResults配置
    async loadCurrentMaxResults() {
        try {
            const response = await this.sendMessageToBackground({
                action: 'getMaxResults'
            });
            if (response.success) {
                // maxResults配置已获取，但不再需要更新UI显示
            }
        } catch (error) {
            console.error('获取maxResults配置失败:', error);
            // 使用默认值，但不再需要更新UI显示
        }
    }

    // 获取AI推荐
    async getAIRecommendations(query) {
        console.log('🤖 开始AI推荐分析，查询:', query);

        try {
            // 设置AI调用状态
            this.aiCallInProgress = true;
            this.currentAIQuery = query;

            // 创建AbortController
            this.aiCallAbortController = new AbortController();

            // 显示AI加载状态
            this.showAILoadingState();

            console.log('📤 发送AI推荐请求到background script...');

            // 创建AI调用Promise
            this.aiCallPromise = this.sendMessageToBackground({
                action: 'getAIRecommendations',
                query: query
            });

            const response = await this.aiCallPromise;
            console.log('📥 收到AI推荐响应呃呃:', response);

            // 检查是否已被取消
            if (!this.aiCallInProgress || this.currentAIQuery !== query) {
                console.log('⚠️ AI调用已被取消，忽略响应');
                return;
            }

            console.log('📥 收到AI推荐响应:', response);

            if (response.success) {
                console.log('✅ AI推荐成功，推荐数量:', response.recommendations?.length || 0);
                console.log('📋 推荐内容:', response.recommendations);
                this.displayAIRecommendations(response.recommendations);
            } else {
                console.log('❌ AI推荐失败:', response.error);
                this.hideAILoadingState();
                this.showAIError(`AI推荐失败: ${response.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('💥 获取AI推荐失败:', error);
            this.hideAILoadingState();
        } finally {
            // 重置AI调用状态
            this.aiCallInProgress = false;
            this.currentAIQuery = null;
        }
    }

    // 取消当前的AI调用
    async cancelCurrentAICall() {
        if (this.aiCallInProgress) {
            console.log('🛑 取消当前AI调用');

            // 1. 设置取消标志
            this.aiCallInProgress = false;
            this.currentAIQuery = null;

            // 2. 触发AbortController
            if (this.aiCallAbortController) {
                this.aiCallAbortController.abort();
                console.log('📡 已发送取消信号到background script');
            }

            // 3. 等待当前调用完成（如果可能）
            if (this.aiCallPromise) {
                try {
                    await Promise.race([
                        this.aiCallPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('取消超时')), 100))
                    ]);
                } catch (error) {
                    console.log('⏰ AI调用取消完成或超时');
                }
            }

            // 4. 清理状态
            this.aiCallAbortController = null;
            this.aiCallPromise = null;
            this.hideAILoadingState();
        }
    }

    // 显示AI加载状态
    showAILoadingState() {
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (!resultsContainer) return;

        // 移除之前的AI状态
        const existingAI = resultsContainer.querySelector('.ai-recommendations');
        if (existingAI) {
            existingAI.remove();
        }

        const aiLoading = document.createElement('div');
        aiLoading.className = 'ai-recommendations ai-loading';
        aiLoading.innerHTML = `
            <div class="ai-header">
                <span class="ai-icon">🤖</span>
                <span class="ai-title">AI 正在分析您的搜索意图...</span>
                <div class="ai-spinner"></div>
            </div>
        `;

        // 插入到结果容器顶部
        resultsContainer.insertBefore(aiLoading, resultsContainer.firstChild);
    }

    // 隐藏AI加载状态
    hideAILoadingState() {
        const aiLoading = this.modal.querySelector('.ai-loading');
        if (aiLoading) {
            aiLoading.remove();
        }
    }

    // 显示AI推荐结果
    displayAIRecommendations(recommendations) {
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (!resultsContainer || !recommendations || recommendations.length === 0) {
            this.hideAILoadingState();
            return;
        }

        // 移除加载状态
        this.hideAILoadingState();

        const aiRecommendations = document.createElement('div');
        aiRecommendations.className = 'ai-recommendations';
        aiRecommendations.innerHTML = `
            <div class="ai-header">
                <span class="ai-icon">🤖</span>
                <span class="ai-title">AI 智能推荐</span>
            </div>
            <div class="ai-results">
                ${recommendations.map((rec, index) => `
                    <div class="ai-result-item" data-url="${rec.url}">
                        <div class="ai-result-content">
                            <div class="ai-result-title">${rec.title}</div>
                            <div class="ai-result-reason">${rec.reason}</div>
                            <div class="ai-result-url">${this.truncateUrl(rec.url, 60)}</div>
                        </div>
                        <div class="ai-result-badge">AI推荐</div>
                    </div>
                `).join('')}
            </div>
        `;

        // 插入到结果容器顶部
        resultsContainer.insertBefore(aiRecommendations, resultsContainer.firstChild);

        // 绑定点击事件
        this.bindAIRecommendationEvents();
    }

    // 绑定AI推荐事件
    bindAIRecommendationEvents() {
        const aiItems = this.modal.querySelectorAll('.ai-result-item');
        aiItems.forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                    this.close();
                }
            });
        });
    }

    // 显示AI错误信息
    showAIError(message) {
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (!resultsContainer) return;

        // 移除之前的AI模块，避免重复
        const existingAI = resultsContainer.querySelector('.ai-recommendations');
        if (existingAI) {
            existingAI.remove();
        }

        const aiError = document.createElement('div');
        aiError.className = 'ai-recommendations ai-error';
        aiError.innerHTML = `
            <div class="ai-header">
                <span class="ai-icon">⚠️</span>
                <span class="ai-title">AI 推荐不可用</span>
            </div>
            <div class="ai-error-content">
                <p>${message}</p>
                <div class="ai-error-actions">
                    <button class="ai-settings-btn" id="aiSettingsBtn">
                        打开设置
                    </button>
                    <button class="ai-check-btn" id="aiCheckBtn">
                        检查状态
                    </button>
                </div>
            </div>
        `;

        // 插入到结果容器顶部
        resultsContainer.insertBefore(aiError, resultsContainer.firstChild);

        // 绑定按钮事件
        this.bindAISettingsButton();
        this.bindAICheckButton();
    }

    // 绑定AI设置按钮事件
    bindAISettingsButton() {
        const settingsBtn = this.modal.querySelector('#aiSettingsBtn');
        if (settingsBtn) {
            console.log('绑定AI设置按钮事件');
            settingsBtn.addEventListener('click', () => {
                console.log('AI设置按钮被点击');
                // 通过消息传递到background script打开选项页面
                chrome.runtime.sendMessage({
                    action: 'openOptionsPage'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('打开选项页面失败:', chrome.runtime.lastError);
                        // 备选方案：直接打开选项页面URL
                        this.openOptionsPageFallback();
                    } else {
                        console.log('选项页面打开成功');
                    }
                });
            });
        } else {
            console.error('未找到AI设置按钮');
        }
    }

    // 备选方案：直接打开选项页面
    openOptionsPageFallback() {
        try {
            // 尝试直接打开选项页面
            const optionsUrl = chrome.runtime.getURL('options.html');
            window.open(optionsUrl, '_blank');
            console.log('使用备选方案打开选项页面');
        } catch (error) {
            console.error('备选方案也失败:', error);
            // 最后的备选方案：显示提示信息
            alert('请手动打开扩展设置页面来配置AI推荐功能');
        }
    }

    // 绑定AI检查按钮事件
    bindAICheckButton() {
        const checkBtn = this.modal.querySelector('#aiCheckBtn');
        if (checkBtn) {
            console.log('绑定AI检查按钮事件');
            checkBtn.addEventListener('click', async () => {
                console.log('AI检查按钮被点击');
                try {
                    // 检查当前设置状态
                    const response = await this.sendMessageToBackground({
                        action: 'checkAISettings'
                    });

                    if (response.success) {
                        let message = `AI推荐状态：${response.enabled ? '已启用' : '已禁用'}\nAI权限：${response.permission ? '已授权' : '未授权'}`;

                        if (!response.permission) {
                            message += `\n\n权限错误：${response.permissionError || '未知错误'}`;
                            message += '\n\n可能的解决方案：\n';
                            message += '1. 检查Chrome版本是否支持AI功能\n';
                            message += '2. 在chrome://extensions/ 中检查扩展权限\n';
                            message += '3. 在chrome://flags/ 中启用AI相关实验性功能\n';
                            message += '4. 尝试重启Chrome浏览器\n';
                            message += '5. 检查Chrome是否是最新版本';
                        }

                        alert(message);
                    } else {
                        alert('检查失败：' + response.error);
                    }
                } catch (error) {
                    console.error('检查AI状态失败:', error);
                    alert('检查AI状态失败，请查看控制台');
                }
            });
        } else {
            console.error('未找到AI检查按钮');
        }
    }



    // 显示搜索结果
    displayResults(results) {
        const loadingIndicator = this.modal.querySelector('#loadingIndicator');
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        loadingIndicator.style.display = 'none';

        // 保存搜索结果
        this.results = results;
        this.selectedIndex = -1; // 重置选中状态

        // 保存AI推荐模块（如果存在）
        const aiDetection = resultsContainer.querySelector('.ai-detection');

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>未找到匹配的结果</p>
                    <p>尝试使用不同的关键词</p>
                </div>
            `;

            // 如果有AI推荐模块，重新插入到最前面
            if (aiDetection) {
                resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
            }
            return;
        }

        const resultsHTML = results.map(result => {
            const date = new Date(result.lastVisitTime || result.dateAdded);
            const formattedDate = this.formatDate(date);
            const typeLabel = this.getTypeLabel(result.type);
            const truncatedUrl = this.truncateUrl(result.url);

            return `
                <div class="result-item" data-url="${result.url}">
                    <div class="result-header">
                        <div class="result-header-left">
                            <span class="result-type">${typeLabel}</span>
                            <span class="result-title">${this.escapeHtml(result.title)}</span>
                        </div>
                        <span class="result-date">${formattedDate}</span>
                    </div>
                    <div class="result-url">${this.escapeHtml(truncatedUrl)}</div>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = resultsHTML;

        // 如果有AI推荐模块，重新插入到最前面
        if (aiDetection) {
            resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
        }

        // 添加点击事件
        this.modal.querySelectorAll('.result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
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

    // URL截取
    truncateUrl(url, maxLength = 300) {
        if (!url) return '';
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength) + '...';
    }

    // 导航搜索结果
    navigateResults(direction) {
        let totalItems = this.results.length;

        // 如果是书签模式，使用书签项的数量
        if (this.activeFilter === 'bookmark') {
            const bookmarkItems = this.modal.querySelectorAll('.bookmark-item');
            totalItems = bookmarkItems.length;
        }

        if (totalItems === 0) return;

        // 移除之前的选中状态
        this.updateSelectedItem(-1);

        // 计算新的选中索引
        if (direction > 0) {
            // 向下或Tab键
            this.selectedIndex = (this.selectedIndex + 1) % totalItems;
        } else {
            // 向上键
            this.selectedIndex = this.selectedIndex <= 0 ? totalItems - 1 : this.selectedIndex - 1;
        }

        // 更新选中状态
        this.updateSelectedItem(this.selectedIndex);
    }

    // 更新选中项
    updateSelectedItem(index) {
        const resultItems = this.modal.querySelectorAll('.result-item');
        const bookmarkItems = this.modal.querySelectorAll('.bookmark-item');

        // 处理搜索结果项
        resultItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });

        // 处理书签项
        bookmarkItems.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // 打开选中的结果
    openSelectedResult() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.results.length) {
            const selectedResult = this.results[this.selectedIndex];
            if (selectedResult.type === 'tab') {
                // 标签页类型：切换到对应标签页
                this.switchToTab(selectedResult.tabId, selectedResult.windowId);
            } else {
                // 书签和历史类型：打开新标签页
                window.open(selectedResult.url, '_blank');
                this.close();
            }
        } else if (this.activeFilter === 'bookmark') {
            // 处理书签模式下的选中项
            const bookmarkItems = this.modal.querySelectorAll('.bookmark-item');
            if (this.selectedIndex >= 0 && this.selectedIndex < bookmarkItems.length) {
                const selectedItem = bookmarkItems[this.selectedIndex];
                const url = selectedItem.dataset.url;
                if (url) {
                    chrome.tabs.create({ url: url });
                    this.close();
                }
            }
        }
    }

    // 处理输入变化
    handleInputChange(query) {
        console.log('输入变化:', query, '当前过滤器:', this.activeFilter);

        // 检查是否以 "list" 开头
        if (query === 'list') {
            console.log('检测到list关键词，显示过滤器下拉列表');
            this.showFilterDropdown();
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
            // 仅当开启AI推荐时，才显示AI相关UI
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
    showFilterDropdown() {
        console.log('显示过滤器下拉列表');
        const dropdown = this.modal.querySelector('#filterDropdown');
        console.log('找到下拉列表元素:', dropdown);

        if (!dropdown) {
            console.error('未找到过滤器下拉列表元素');
            return;
        }

        // 重置选中索引
        this.filterSelectedIndex = -1;

        dropdown.innerHTML = `
            <div class="filter-option" data-filter="history">
                <span>📊 list history</span>
                <small>仅搜索历史记录</small>
            </div>
            <div class="filter-option" data-filter="tab">
                <span>📑 list tab</span>
                <small>仅搜索当前标签页</small>
            </div>
            <div class="filter-option" data-filter="bookmark">
                <span>🔖 list bookmark</span>
                <small>仅搜索书签</small>
            </div>
        `;

        dropdown.style.display = 'block';
        this.filterDropdown = dropdown;
        console.log('下拉列表已显示');

        // 添加点击事件
        dropdown.querySelectorAll('.filter-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const filter = e.currentTarget.dataset.filter;
                console.log('选择过滤器:', filter);
                this.selectFilter(filter);
            });
        });
    }

    // 检查AI推荐是否开启（缓存，避免频繁读存储）
    async checkAIEnabled() {
        if (this.aiEnabled !== null) return this.aiEnabled;
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(['aiRecommendation'], (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('读取AI开关失败:', chrome.runtime.lastError);
                        this.aiEnabled = false;
                        resolve(false);
                        return;
                    }
                    // 默认启用：aiRecommendation !== false
                    const enabled = result && result.aiRecommendation !== false;
                    this.aiEnabled = enabled;
                    resolve(enabled);
                });
            } catch (e) {
                console.warn('读取AI开关异常:', e);
                this.aiEnabled = false;
                resolve(false);
            }
        });
    }

    // 移除页面上已有的AI相关UI
    removeAIUI() {
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (!resultsContainer) return;
        const aiElems = resultsContainer.querySelectorAll('.ai-detection, .ai-recommendations');
        aiElems.forEach(el => el.remove());
    }

    // 隐藏过滤器下拉列表
    hideFilterDropdown() {
        const dropdown = this.modal.querySelector('#filterDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // 选择过滤器
    selectFilter(filter) {
        this.activeFilter = filter;
        this.hideFilterDropdown();
        this.updateFilterTag();

        // 清空输入框，让用户重新输入搜索内容
        const searchInput = this.modal.querySelector('#searchInput');
        searchInput.value = '';
        searchInput.focus();

        // 如果是标签页过滤器，立即显示所有标签页
        if (filter === 'tab') {
            console.log('选择标签页过滤器，立即显示所有标签页');
            this.loadAllTabs();
        }

        // 如果是书签过滤器，立即显示所有书签
        if (filter === 'bookmark') {
            console.log('选择书签过滤器，立即显示所有书签');
            this.loadAllBookmarks();
        }
    }

    // 更新过滤器标签
    updateFilterTag() {
        console.log('更新过滤器标签，当前过滤器:', this.activeFilter);
        const filterTag = this.modal.querySelector('#activeFilterTag');
        console.log('找到过滤器标签元素:', filterTag);

        if (!filterTag) {
            console.error('未找到过滤器标签元素');
            return;
        }

        if (this.activeFilter) {
            const filterNames = {
                'history': '历史',
                'tab': '标签页',
                'bookmark': '书签'
            };

            filterTag.textContent = `[${filterNames[this.activeFilter]}]`;
            filterTag.style.display = 'block';
            console.log('过滤器标签已显示:', filterTag.textContent);

            // 添加点击清除事件
            filterTag.onclick = () => {
                console.log('点击清除过滤器');
                this.clearFilter();
            };
        } else {
            filterTag.style.display = 'none';
            console.log('过滤器标签已隐藏');
        }
    }

    // 清除过滤器
    clearFilter() {
        this.activeFilter = null;
        this.updateFilterTag();
        this.showWelcomeMessage();
    }

    // 获取类型标签
    getTypeLabel(type) {
        const typeLabels = {
            'bookmark': '书签',
            'history': '历史',
            'tab': '标签页'
        };
        return typeLabels[type] || '未知';
    }

    // 加载所有标签页
    async loadAllTabs() {
        try {
            console.log('开始加载所有标签页');
            this.showLoading();

            // 通过消息传递请求background script获取所有标签页
            const response = await this.sendMessageToBackground({
                action: 'getAllTabs'
            });

            if (response.success) {
                console.log('获取标签页成功:', response.results);
                this.allTabs = response.results; // 保存所有标签页数据
                this.displayGroupedResults(response.results);
            } else {
                console.error('获取标签页失败:', response.error);
                this.showError('获取标签页失败，请重试');
            }
        } catch (error) {
            console.error('加载标签页出错:', error);
            this.showError('加载标签页时出现错误');
        }
    }

    // 加载所有书签
    async loadAllBookmarks() {
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
                this.showError('获取书签失败，请重试');
            }
        } catch (error) {
            console.error('加载书签出错:', error);
            this.showError('加载书签时出现错误');
        }
    }

    // 显示书签结果
    displayBookmarkResults(bookmarks) {
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
                        <span class="folder-status-text">当前选中: ${this.escapeHtml(this.currentSelectedFolder)}</span>
                        <button class="folder-status-close" title="关闭分组过滤">×</button>
                    </div>
                </div>
            `;
        }

        if (!bookmarks || bookmarks.length === 0) {
            htmlContent += `
                <div class="no-results">
                    <p>📚 暂无书签</p>
                    <p>开始收藏网页后，这里会显示您的书签</p>
                </div>
            `;
            resultsContainer.innerHTML = htmlContent;

            // 绑定关闭按钮事件
            this.bindFolderStatusEvents();
            return;
        }

        const bookmarksHTML = bookmarks.map((bookmark, index) => `
            <div class="bookmark-item" 
                 data-url="${bookmark.url}" 
                 data-bookmark-id="${bookmark.id}"
                 data-index="${index}">
                <div class="result-header">
                    <div class="result-header-left">
                        <span class="result-type">书签</span>
                        <span class="result-title">${this.escapeHtml(bookmark.title)}</span>
                        ${bookmark.folderPath ? `<span class="bookmark-folder" data-folder-path="${this.escapeHtml(bookmark.folderPath)}">📁 ${this.escapeHtml(bookmark.folderPath)}</span>` : ''}
                    </div>
                    <div class="bookmark-actions">
                        <button class="delete-bookmark-btn" data-bookmark-id="${bookmark.id}" title="删除书签">×</button>
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
    }

    // 绑定分组状态事件
    bindFolderStatusEvents() {
        const closeBtn = this.modal.querySelector('.folder-status-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.clearFolderFilter();
            });
        }
    }

    // 绑定书签事件
    bindBookmarkEvents() {
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

            // 设置tabindex以支持键盘导航
            item.setAttribute('tabindex', '0');
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
    filterBookmarksByFolder(folderPath) {
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
    showFolderFilterState(folderPath) {
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
                <button class="close-folder-filter" title="关闭分组过滤">×</button>
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
    clearFolderFilter() {
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

        // 显示所有书签
        this.displayBookmarkResults(this.allBookmarks);
    }

    // 在分组内搜索
    searchInFolder(query) {
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
    async deleteBookmark(bookmarkId) {
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
                this.showError('删除书签失败，请重试');
            }
        } catch (error) {
            console.error('删除书签出错:', error);
            this.showError('删除书签时出现错误');
        }
    }

    // 过滤标签页
    filterTabs(query) {
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
    async switchToTab(tabId, windowId) {
        try {
            console.log('请求切换标签页:', tabId, '窗口:', windowId);

            // 通过消息传递到background script处理
            const response = await this.sendMessageToBackground({
                action: 'switchToTab',
                tabId: tabId,
                windowId: windowId
            });

            if (response.success) {
                console.log('成功切换到标签页:', tabId);
                this.close();
            } else {
                console.error('切换标签页失败:', response.error);
            }
        } catch (error) {
            console.error('切换标签页出错:', error);
        }
    }

    // 关闭标签页
    async closeTab(tabId) {
        try {
            console.log('请求关闭标签页:', tabId);

            // 通过消息传递到background script处理
            const response = await this.sendMessageToBackground({
                action: 'closeTab',
                tabId: tabId
            });

            if (response.success) {
                console.log('成功关闭标签页:', tabId);
                // 关闭后重新加载标签页列表
                this.loadAllTabs();
            } else {
                console.error('关闭标签页失败:', response.error);
            }
        } catch (error) {
            console.error('关闭标签页出错:', error);
        }
    }

    // 导航过滤器选项
    navigateFilterOptions(direction) {
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
    updateFilterOptionSelection(index) {
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
    selectCurrentFilterOption() {
        const options = this.modal.querySelectorAll('.filter-option');
        if (this.filterSelectedIndex >= 0 && this.filterSelectedIndex < options.length) {
            const selectedOption = options[this.filterSelectedIndex];
            const filter = selectedOption.dataset.filter;
            this.selectFilter(filter);
        }
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

    // 编辑窗口名称
    editWindowName(titleElement) {
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

    // 保存窗口名称到localStorage
    saveWindowName(windowId, name) {
        try {
            const savedNames = JSON.parse(localStorage.getItem('windowNames') || '{}');
            savedNames[windowId] = name;
            localStorage.setItem('windowNames', JSON.stringify(savedNames));
        } catch (error) {
            console.error('保存窗口名称失败:', error);
        }
    }

    // 获取保存的窗口名称
    getWindowName(windowId, defaultName) {
        try {
            const savedNames = JSON.parse(localStorage.getItem('windowNames') || '{}');
            return savedNames[windowId] || defaultName;
        } catch (error) {
            console.error('获取窗口名称失败:', error);
            return defaultName;
        }
    }

    // 显示窗口菜单
    showWindowMenu(menuBtn, windowGroups) {
        const currentWindowId = parseInt(menuBtn.dataset.windowId);

        // 移除已存在的菜单
        this.hideWindowMenu();

        // 检查是否有其他窗口可以合并
        const otherWindows = windowGroups.filter(group => group.windowId !== currentWindowId);

        // 如果只有一个窗口，不显示菜单
        if (otherWindows.length === 0) {
            console.log('只有一个窗口，不显示合并菜单');
            return;
        }

        // 创建菜单
        const menu = document.createElement('div');
        menu.className = 'window-menu';
        menu.innerHTML = `
            <div class="window-menu-header">窗口操作</div>
            <div class="window-menu-items">
                ${otherWindows.map(group => {
            const targetName = this.getWindowName(group.windowId, group.windowTitle);
            return `
                        <div class="window-menu-item" data-target-window="${group.windowId}">
                            <span class="menu-icon">🔄</span>
                            <span class="menu-text">合并到 "${this.escapeHtml(targetName)}"</span>
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
    hideWindowMenu() {
        const existingMenu = document.querySelector('.window-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
    }

    // 合并窗口
    async mergeWindows(sourceWindowId, targetWindowId) {
        try {
            console.log(`合并窗口: ${sourceWindowId} -> ${targetWindowId}`);

            // 通过消息传递到background script处理
            const response = await this.sendMessageToBackground({
                action: 'mergeWindows',
                sourceWindowId: sourceWindowId,
                targetWindowId: targetWindowId
            });

            if (response.success) {
                console.log('窗口合并成功');
                // 重新加载标签页列表
                this.loadAllTabs();
            } else {
                console.error('窗口合并失败:', response.error);
                alert('窗口合并失败: ' + response.error);
            }
        } catch (error) {
            console.error('窗口合并出错:', error);
            alert('窗口合并时出现错误');
        }
    }

    // 显示下载提示
    showDownloadPrompt() {
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (!resultsContainer) return;

        // 移除之前的AI状态
        const existingAI = resultsContainer.querySelector('.ai-recommendations');
        if (existingAI) {
            existingAI.remove();
        }

        const aiDownload = document.createElement('div');
        aiDownload.className = 'ai-recommendations ai-download';
        aiDownload.innerHTML = `
            <div class="ai-download-header">
                <div class="ai-download-icon">
                    <div class="ai-download-icon-bg">
                        <span class="ai-download-emoji">🤖</span>
                    </div>
                </div>
                <div class="ai-download-content">
                    <h3 class="ai-download-title">AI 智能推荐</h3>
                    <p class="ai-download-description">首次使用需要下载AI模型，为您提供智能推荐服务</p>
                </div>
            </div>
            <div class="ai-download-features">
                <div class="ai-feature-item">
                    <span class="ai-feature-icon">✨</span>
                    <span class="ai-feature-text">智能分析搜索意图</span>
                </div>
                <div class="ai-feature-item">
                    <span class="ai-feature-icon">🎯</span>
                    <span class="ai-feature-text">精准推荐相关链接</span>
                </div>
                <div class="ai-feature-item">
                    <span class="ai-feature-icon">⚡</span>
                    <span class="ai-feature-text">快速响应，提升效率</span>
                </div>
            </div>
            <div class="ai-download-actions">
                <button class="ai-download-primary-btn" id="aiDownloadBtn">
                    <span class="ai-btn-icon">📥</span>
                    <span class="ai-btn-text">开始下载</span>
                </button>
                <button class="ai-download-secondary-btn" id="aiCancelBtn">
                    <span class="ai-btn-text">稍后再说</span>
                </button>
            </div>
        `;

        resultsContainer.insertBefore(aiDownload, resultsContainer.firstChild);
        this.bindDownloadButton();
        this.bindCancelButton();
    }

    // 显示下载中提示
    showDownloadingPrompt() {
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (!resultsContainer) return;

        // 移除之前的AI状态
        const existingAI = resultsContainer.querySelector('.ai-recommendations');
        if (existingAI) {
            existingAI.remove();
        }

        const aiDownloading = document.createElement('div');
        aiDownloading.className = 'ai-recommendations ai-downloading';
        aiDownloading.innerHTML = `
            <div class="ai-header">
                <div class="ai-downloading-icon">
                    <div class="ai-spinner-download"></div>
                </div>
                <div class="ai-title-section">
                    <span class="ai-title">AI模型下载中</span>
                    <span class="ai-subtitle">正在为您准备智能推荐功能</span>
                </div>
            </div>
            <div class="ai-content">
                <div class="ai-progress-container">
                    <div class="ai-progress-info">
                        <span class="ai-progress-label">下载进度</span>
                        <span class="ai-progress-percentage" id="aiProgressText">0%</span>
                    </div>
                    <div class="ai-progress-bar">
                        <div class="ai-progress-fill" id="aiProgressFill" style="width: 0%"></div>
                        <div class="ai-progress-glow" id="aiProgressGlow"></div>
                    </div>
                    <div class="ai-progress-details">
                        <span class="ai-progress-status">正在下载模型文件...</span>
                    </div>
                </div>
            </div>
        `;

        resultsContainer.insertBefore(aiDownloading, resultsContainer.firstChild);

        // 监听下载进度
        this.listenDownloadProgress();
    }

    // 绑定下载按钮
    bindDownloadButton() {
        const downloadBtn = this.modal.querySelector('#aiDownloadBtn');
        if (!downloadBtn) return;

        downloadBtn.addEventListener('click', async () => {
            console.log('📥 用户点击开始下载');
            console.log('📥 准备发送downloadAIModel消息到background script');

            // 立即移除下载提示模块
            const existingAI = this.modal.querySelector('.ai-recommendations');
            if (existingAI) {
                existingAI.remove();
            }

            // 显示下载进度模块
            this.showDownloadingPrompt();

            try {
                console.log('📤 发送downloadAIModel消息...');
                const response = await this.sendMessageToBackground({
                    action: 'downloadAIModel'
                });
                console.log('📨 收到downloadAIModel响应:', response);

                if (response.success) {
                    console.log('✅ 下载请求成功');
                    // 下载进度模块已经在上面显示了
                } else {
                    console.error('❌ 下载请求失败:', response.error);
                    // 移除下载进度模块，显示错误
                    const downloadingAI = this.modal.querySelector('.ai-recommendations');
                    if (downloadingAI) {
                        downloadingAI.remove();
                    }
                    this.showAIError(`下载失败: ${response.error}`);
                }
            } catch (error) {
                console.error('❌ 下载请求异常:', error);
                // 移除下载进度模块，显示错误
                const downloadingAI = this.modal.querySelector('.ai-recommendations');
                if (downloadingAI) {
                    downloadingAI.remove();
                }
                this.showAIError(`下载请求异常: ${error.message}`);
            }
        });
    }

    // 绑定取消按钮
    bindCancelButton() {
        const cancelBtn = this.modal.querySelector('#aiCancelBtn');
        if (!cancelBtn) return;

        cancelBtn.addEventListener('click', () => {
            console.log('❌ 用户取消下载');
            // 移除下载提示框
            const existingAI = this.modal.querySelector('.ai-recommendations');
            if (existingAI) {
                existingAI.remove();
            }
        });
    }

    // 监听下载进度
    listenDownloadProgress() {
        // 监听来自background的进度更新
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'downloadProgress') {
                const progressFill = this.modal.querySelector('#aiProgressFill');
                const progressText = this.modal.querySelector('#aiProgressText');
                const progressStatus = this.modal.querySelector('.ai-progress-status');

                if (progressFill && progressText) {
                    progressFill.style.width = `${message.progress}%`;
                    progressText.textContent = `${message.progress}%`;

                    // 更新状态文本
                    if (progressStatus) {
                        if (message.progress < 30) {
                            progressStatus.textContent = '正在初始化下载...';
                        } else if (message.progress < 70) {
                            progressStatus.textContent = '正在下载模型文件...';
                        } else if (message.progress < 95) {
                            progressStatus.textContent = '正在完成下载...';
                        } else {
                            progressStatus.textContent = '即将完成...';
                        }
                    }
                }
            } else if (message.action === 'downloadComplete') {
                console.log('✅ 模型下载完成，重新尝试AI推荐');
                this.hideAILoadingState();
                // 重新尝试AI推荐
                this.getAIRecommendations(this.currentAIQuery);
            }
        });
    }

    // 显示AI模型检测弹框
    showAIModelDetectionModal(query) {
        // 移除之前的AI检测弹框
        const existingAI = this.modal.querySelector('.ai-detection');
        if (existingAI) {
            existingAI.remove();
        }

        const aiDetection = document.createElement('div');
        aiDetection.className = 'ai-detection';
        aiDetection.innerHTML = `
            <div class="ai-detection-header">
                <div class="ai-detection-icon">🤖</div>
                <div class="ai-detection-title">AI智能推荐</div>
            </div>
            <div class="ai-status-container">
                <div class="ai-status-icon">🤖</div>
                <div class="ai-status-text">AI智能推荐已就绪，点击开始推荐</div>
            </div>
            <div class="ai-actions">
                <button id="aiCheckBtn" class="ai-btn ai-btn-primary">开始AI推荐</button>
                <button id="aiCloseBtn" class="ai-btn ai-btn-secondary">关闭</button>
            </div>
        `;

        // 插入到结果容器的最前面，确保AI推荐始终在列表顶部
        const resultsContainer = this.modal.querySelector('#resultsContainer');
        if (resultsContainer) {
            // 移除欢迎消息（如果存在）
            const welcomeMessage = resultsContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }

            // 插入AI检测弹框到最前面
            resultsContainer.insertBefore(aiDetection, resultsContainer.firstChild);
        }

        this.bindAIDetectionButtons(query);
    }

    // 绑定AI检测弹框按钮
    bindAIDetectionButtons(query) {
        const checkBtn = this.modal.querySelector('#aiCheckBtn');
        const closeBtn = this.modal.querySelector('#aiCloseBtn');

        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                this.getAIRecommendations(query);
                const aiDetection = this.modal.querySelector('.ai-detection');
                if (aiDetection) {
                    aiDetection.remove();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const aiDetection = this.modal.querySelector('.ai-detection');
                if (aiDetection) {
                    aiDetection.remove();
                }
            });
        }
    }

}

// 导出模态框类
window.SearchModal = SearchModal;
