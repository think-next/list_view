// modal.js - Main SearchModal class definition
// Part of the List View Chrome extension
// CSS is loaded from styles/modal.css
// Methods are added via modules in scripts/modules/

(function() {
    'use strict';

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

            // 默认搜索状态管理
            this.previousSearchResults = []; // 存储之前的搜索结果
            this.previousSearchQuery = ''; // 存储之前的搜索查询

            // AI调用状态管理
            this.aiCallInProgress = false;
            this.currentAIQuery = null;
            this.aiCallAbortController = null;
            this.aiCallPromise = null;  // 存储当前的AI调用Promise

            // AI设置缓存
            this.aiEnabled = null;

            // 窗口切换状态
            this.activeWindowIndex = 0; // 当前选中的窗口索引

            this.init();
        }

        // 初始化模态框
        init() {
            this.loadStyles();
            this.createModal();
            this.bindEvents();
        }

        // 加载CSS样式（从外部CSS文件注入）
        loadStyles() {
            if (document.getElementById('searchModalStyles')) return;
            const link = document.createElement('link');
            link.id = 'searchModalStyles';
            link.rel = 'stylesheet';
            link.href = chrome.runtime.getURL('styles/modal.css');
            document.head.appendChild(link);
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
                                        <input type="text" id="searchInput" placeholder="Search..." autocomplete="off">
                                    </div>
                                    <div id="filterDropdown" class="filter-dropdown" style="display: none;"></div>
                                </div>
                                <button id="searchBtn">Search</button>
                            </div>
                        </div>
                        
                        <div class="results-section">
                            <div id="loadingIndicator" class="loading" style="display: none;">
                                <div class="spinner"></div>
                                <span>Searching...</span>
                            </div>
                            
                            <!-- History stats section -->
                            <div id="historyStatsSection" class="history-stats-section" style="display: none;">
                                <div class="stats-header">
                                    <h3>📊 Last 7 Days Activity</h3>
                                    <p>Grouped by domain. Top paths.</p>
                                </div>
                                <div id="statsContainer" class="stats-container"></div>
                            </div>
                            
                            <div id="resultsContainer" class="results-container">
                                <div class="welcome-message">
                                    <p>Type to search bookmarks and history</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            `;

            // 添加到页面
            document.body.appendChild(this.modal);
        }
    }

    // 导出模态框类
    window.SearchModal = SearchModal;

})();
