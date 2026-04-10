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
            this.selectedIndex = -1;
            this.results = [];
            this.activeFilter = null;
            this.filterDropdown = null;
            this.filterSelectedIndex = -1;
            this.allTabs = null;
            this.currentSelectedFolder = null;
            this.allBookmarks = [];
            this.previousSearchResults = [];
            this.previousSearchQuery = '';
            this.aiCallInProgress = false;
            this.currentAIQuery = null;
            this.aiCallAbortController = null;
            this.aiCallPromise = null;
            this.aiEnabled = null;
            this.activeWindowIndex = 0;

            // 移除已存在的模态框 DOM（防止重复注入）
            const existingModal = document.getElementById('searchModal');
            if (existingModal) existingModal.remove();

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
                            <button id="skinToggle" class="skin-toggle-btn" title="切换展示风格">⊞</button>
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
