// ai-recommendations.js - Auto-extracted module for SearchModal
// Part of the List View Chrome extension

(function() {
    'use strict';

SearchModal.prototype.getAIRecommendations = async function(query) {
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
            console.log('✅ AI success, count:', response.recommendations?.length || 0);
            console.log('📋 Recommendations:', response.recommendations);
            this.displayAIRecommendations(response.recommendations);
        } else {
            console.log('❌ AI failed:', response.error);
            this.hideAILoadingState();
            this.showAIError(response.error || 'Unknown error');
        }
    } catch (error) {
        console.error('💥 AI error:', error);
        this.hideAILoadingState();
    } finally {
        // 重置AI调用状态
        this.aiCallInProgress = false;
        this.currentAIQuery = null;
    }
    }

    // 取消当前的AI调用

SearchModal.prototype.cancelCurrentAICall = async function() {
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

SearchModal.prototype.showAILoadingState = function() {
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
        <div class="result-item ai-loading-item">
            <div class="result-header">
                <div class="result-header-left">
                    <span class="result-type">AI</span>
                    <span class="result-title">AI analyzing your intent...</span>
                    <div class="ai-spinner"></div>
                </div>
            </div>
        </div>
    `;

    // 插入到结果容器顶部
    resultsContainer.insertBefore(aiLoading, resultsContainer.firstChild);
    }

    // 隐藏AI加载状态

SearchModal.prototype.hideAILoadingState = function() {
    const aiLoading = this.modal.querySelector('.ai-loading');
    if (aiLoading) {
        aiLoading.remove();
    }
    }

    // 显示AI推荐结果

SearchModal.prototype.displayAIRecommendations = function(recommendations) {
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
        ${recommendations.map((rec, index) => `
            <div class="result-item ai-result-item" data-url="${rec.url}">
                <div class="result-header">
                    <div class="result-header-left">
                        <span class="result-type">AI</span>
                        <span class="result-title">${rec.title}</span>
                    </div>
                </div>
                <div class="result-url">${this.truncateUrl(rec.url, 60)}</div>
                <div class="ai-result-reason">${rec.reason}</div>
            </div>
        `).join('')}
    `;

    // 插入到结果容器顶部
    resultsContainer.insertBefore(aiRecommendations, resultsContainer.firstChild);

    // 绑定点击事件
    this.bindAIRecommendationEvents();
    }

    // 绑定AI推荐事件

SearchModal.prototype.bindAIRecommendationEvents = function() {
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

SearchModal.prototype.showAIError = function(message) {
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    if (!resultsContainer) return;

    // 移除之前的AI模块，避免重复
    const existingAI = resultsContainer.querySelector('.ai-recommendations');
    if (existingAI) {
        existingAI.remove();
    }

    const aiError = document.createElement('div');
    aiError.className = 'ai-recommendations ai-error';
    const friendlyMsg = message.includes('权限') || message.includes('permission')
        ? 'AI model access not authorized. Please enable it in Settings > AI.'
        : message.includes('超时') || message.includes('timeout')
            ? 'AI response timed out. Please try again later.'
            : message.includes('不可用') || message.includes('unavailable')
                ? 'AI model is not available on this device. It may require a newer browser version.'
                : 'AI is currently unavailable. You can still use regular search.';
    aiError.innerHTML = `
        <div class="result-item ai-error-item">
            <div class="result-header">
                <div class="result-header-left">
                    <span class="result-type ai-error-type">🤖</span>
                    <span class="result-title">AI Suggestion Unavailable</span>
                </div>
            </div>
            <div class="ai-error-content">
                <p style="margin:4px 0;font-size:12px;color:#6b7280;">${friendlyMsg}</p>
                <div class="ai-error-actions">
                    <button class="ai-settings-btn" id="aiSettingsBtn">
                        Open Settings
                    </button>
                    <button class="ai-check-btn" id="aiCheckBtn">
                        Check Status
                    </button>
                </div>
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

SearchModal.prototype.bindAISettingsButton = function() {
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

SearchModal.prototype.openOptionsPageFallback = function() {
    try {
        // 尝试直接打开选项页面
        const optionsUrl = chrome.runtime.getURL('options.html');
        window.open(optionsUrl, '_blank');
        console.log('使用备选方案打开选项页面');
    } catch (error) {
        console.error('备选方案也失败:', error);
        // 最后的备选方案：显示提示信息
        alert('Open extension settings to configure AI.');
    }
    }

    // 绑定AI检查按钮事件

SearchModal.prototype.bindAICheckButton = function() {
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
                    let message = `AI Recommendations: ${response.enabled ? 'Enabled' : 'Disabled'}\nAI Permission: ${response.permission ? 'Granted' : 'Not granted'}`;

                    if (!response.permission) {
                        message += `\n\nPermission Error: ${response.permissionError || 'Unknown error'}`;
                        message += '\n\nPossible Solutions:\n';
                        message += '1. Check Chrome version supports AI features\n';
                        message += '2. Check extension permissions in chrome://extensions/\n';
                        message += '3. Enable AI experimental features in chrome://flags/\n';
                        message += '4. Try restarting Chrome browser\n';
                        message += '5. Ensure Chrome is up to date';
                    }

                    this.showTerminalStatus(message);
                } else {
                    this.showTerminalStatus('Check failed: ' + response.error);
                }
            } catch (error) {
                console.error('检查AI状态失败:', error);
                alert('Check failed. See console for details.');
            }
        });
    } else {
        console.error('未找到AI检查按钮');
    }
    }

    // 显示Terminal样式状态信息

SearchModal.prototype.showTerminalStatus = function(message) {
    // 移除已存在的状态显示
    const existingStatus = this.modal.querySelector('.ai-terminal-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    // 创建terminal样式容器
    const terminalStatus = document.createElement('div');
    terminalStatus.className = 'ai-terminal-status';
    terminalStatus.innerHTML = `
        <div class="terminal-header">
            <span class="terminal-title">AI Status Check</span>
            <button class="terminal-close-btn" id="terminalCloseBtn">×</button>
        </div>
        <div class="terminal-content">
            <pre>${message}</pre>
        </div>
    `;

    // 找到AI错误容器的父块（保持按钮区域不变高），插入到整个状态行下方
    const aiErrorContainer = this.modal.querySelector('.ai-error-item');
    if (aiErrorContainer && aiErrorContainer.parentNode) {
        aiErrorContainer.parentNode.insertBefore(terminalStatus, aiErrorContainer.nextSibling);
    } else {
        // 回退：若未找到，仍插在按钮后方
        const checkBtn = this.modal.querySelector('#aiCheckBtn');
        if (checkBtn && checkBtn.parentNode) {
            checkBtn.parentNode.insertBefore(terminalStatus, checkBtn.nextSibling);
        }
    }

    // 绑定关闭按钮事件
    const closeBtn = terminalStatus.querySelector('#terminalCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            terminalStatus.remove();
        });
    }

    // 5秒后自动关闭
    setTimeout(() => {
        if (terminalStatus.parentNode) {
            terminalStatus.remove();
        }
    }, 5000);
    }

    // 显示搜索结果

SearchModal.prototype.checkAIEnabled = async function() {
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
                // 默认关闭：aiRecommendation === true
                const enabled = result && result.aiRecommendation === true;
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

SearchModal.prototype.removeAIUI = function() {
    const resultsContainer = this.modal.querySelector('#resultsContainer');
    if (!resultsContainer) return;
    const aiElems = resultsContainer.querySelectorAll('.ai-detection, .ai-recommendations');
    aiElems.forEach(el => el.remove());
    }

    // 隐藏过滤器下拉列表

SearchModal.prototype.showDownloadPrompt = function() {
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
                <h3 class="ai-download-title">AI Recommendations</h3>
                <p class="ai-download-description">First time use requires downloading an AI model for smart recommendations</p>
            </div>
        </div>
        <div class="ai-download-features">
            <div class="ai-feature-item">
                <span class="ai-feature-icon">✨</span>
                <span class="ai-feature-text">Smart search intent analysis</span>
            </div>
            <div class="ai-feature-item">
                <span class="ai-feature-icon">🎯</span>
                <span class="ai-feature-text">Precise link recommendations</span>
            </div>
            <div class="ai-feature-item">
                <span class="ai-feature-icon">⚡</span>
                <span class="ai-feature-text">Fast response, improved efficiency</span>
            </div>
        </div>
        <div class="ai-download-actions">
            <button class="ai-download-primary-btn" id="aiDownloadBtn">
                <span class="ai-btn-icon">📥</span>
                <span class="ai-btn-text">Start Download</span>
            </button>
            <button class="ai-download-secondary-btn" id="aiCancelBtn">
                <span class="ai-btn-text">Later</span>
            </button>
        </div>
    `;

    resultsContainer.insertBefore(aiDownload, resultsContainer.firstChild);
    this.bindDownloadButton();
    this.bindCancelButton();
    }

    // 显示下载中提示

SearchModal.prototype.showDownloadingPrompt = function() {
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
                <span class="ai-title">AI Model Downloading</span>
                <span class="ai-subtitle">Preparing smart recommendations for you</span>
            </div>
        </div>
        <div class="ai-content">
            <div class="ai-progress-container">
                <div class="ai-progress-info">
                    <span class="ai-progress-label">Download Progress</span>
                    <span class="ai-progress-percentage" id="aiProgressText">0%</span>
                </div>
                <div class="ai-progress-bar">
                    <div class="ai-progress-fill" id="aiProgressFill" style="width: 0%"></div>
                    <div class="ai-progress-glow" id="aiProgressGlow"></div>
                </div>
                <div class="ai-progress-details">
                    <span class="ai-progress-status">Downloading model files...</span>
                </div>
            </div>
        </div>
    `;

    resultsContainer.insertBefore(aiDownloading, resultsContainer.firstChild);

    // 监听Download Progress
    this.listenDownloadProgress();
    }

    // 绑定下载按钮

SearchModal.prototype.bindDownloadButton = function() {
    const downloadBtn = this.modal.querySelector('#aiDownloadBtn');
    if (!downloadBtn) return;

    downloadBtn.addEventListener('click', async () => {
        console.log('📥 用户点击Start Download');
        console.log('📥 准备发送downloadAIModel消息到background script');

        // 立即移除下载提示模块
        const existingAI = this.modal.querySelector('.ai-recommendations');
        if (existingAI) {
            existingAI.remove();
        }

        // 显示Download Progress模块
        this.showDownloadingPrompt();

        try {
            console.log('📤 发送downloadAIModel消息...');
            const response = await this.sendMessageToBackground({
                action: 'downloadAIModel'
            });
            console.log('📨 收到downloadAIModel响应:', response);

            if (response.success) {
                console.log('✅ 下载请求成功');
                // Download Progress模块已经在上面显示了
            } else {
                console.error('❌ 下载请求失败:', response.error);
                // 移除Download Progress模块，显示错误
                const downloadingAI = this.modal.querySelector('.ai-recommendations');
                if (downloadingAI) {
                    downloadingAI.remove();
                }
                this.showAIError(`Download failed: ${response.error}`);
            }
        } catch (error) {
            console.error('❌ 下载请求异常:', error);
            // 移除Download Progress模块，显示错误
            const downloadingAI = this.modal.querySelector('.ai-recommendations');
            if (downloadingAI) {
                downloadingAI.remove();
            }
            this.showAIError(`Request failed: ${error.message}`);
        }
    });
    }

    // 绑定取消按钮

SearchModal.prototype.bindCancelButton = function() {
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

    // 监听Download Progress

SearchModal.prototype.listenDownloadProgress = function() {
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
                        progressStatus.textContent = 'Initializing download...';
                    } else if (message.progress < 70) {
                        progressStatus.textContent = 'Downloading model files...';
                    } else if (message.progress < 95) {
                        progressStatus.textContent = 'Completing download...';
                    } else {
                        progressStatus.textContent = 'Almost done...';
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

SearchModal.prototype.showAIModelDetectionModal = function(query) {
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
            <div class="ai-detection-title">AI Recommendations</div>
        </div>
        <div class="ai-status-row">
            <div class="ai-status-container">
                <div class="ai-status-text">AI ready, click to start recommendations</div>
            </div>
            <div class="ai-actions">
                <button id="aiCheckBtn" class="ai-btn ai-btn-primary">Start AI</button>
            </div>
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

SearchModal.prototype.bindAIDetectionButtons = function(query) {
    const checkBtn = this.modal.querySelector('#aiCheckBtn');

    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            this.getAIRecommendations(query);
            const aiDetection = this.modal.querySelector('.ai-detection');
            if (aiDetection) {
                aiDetection.remove();
            }
        });
    }
    }
})();
