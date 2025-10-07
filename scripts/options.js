// 选项页面脚本
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const maxResultsInput = document.getElementById('maxResults');
    const aiRecommendationToggle = document.getElementById('aiRecommendation');
    const aiTimeoutInput = document.getElementById('aiTimeout');
    const saveBtn = document.getElementById('saveSettings');
    const statusMessage = document.getElementById('statusMessage');

    // 导航切换
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            const section = this.dataset.section;

            // 更新导航状态
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // 更新内容显示
            contentSections.forEach(section => section.classList.remove('active'));
            document.getElementById(section).classList.add('active');
        });
    });

    // 数值边界与步进（防御）
    maxResultsInput.addEventListener('input', function () {
        const num = Math.max(5, Math.min(50, parseInt(this.value || '12', 10)));
        this.value = isNaN(num) ? 12 : num;
    });

    // AI超时时间边界检查
    aiTimeoutInput.addEventListener('input', function () {
        const num = Math.max(100, Math.min(3000, parseInt(this.value || '30000', 10)));
        this.value = isNaN(num) ? 30000 : num;
    });

    // 保存设置
    saveBtn.addEventListener('click', function () {
        // 添加点击反馈效果
        saveBtn.classList.add('saving');
        saveBtn.textContent = 'SAVING...';

        let maxResults = parseInt(maxResultsInput.value);
        const aiRecommendation = aiRecommendationToggle.checked;
        let aiTimeout = parseInt(aiTimeoutInput.value);

        // 边界检查
        if (isNaN(maxResults) || maxResults < 5) {
            maxResults = 5;
        } else if (maxResults > 50) {
            maxResults = 50;
        }
        maxResultsInput.value = maxResults;

        if (isNaN(aiTimeout) || aiTimeout < 100) {
            aiTimeout = 100;
        } else if (aiTimeout > 3000) {
            aiTimeout = 3000;
        }
        aiTimeoutInput.value = aiTimeout;

        // 保存到chrome存储
        chrome.storage.local.set({
            maxResults: maxResults,
            aiRecommendation: aiRecommendation,
            aiTimeout: aiTimeout
        }, function () {
            if (chrome.runtime.lastError) {
                // 保存失败，显示错误状态
                setTimeout(() => {
                    saveBtn.classList.remove('saving');
                    saveBtn.textContent = 'ERROR';
                    saveBtn.style.background = 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)';

                    // 2秒后恢复
                    setTimeout(() => {
                        saveBtn.textContent = 'SAVE';
                        saveBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
                    }, 2000);
                }, 800);
            } else {
                // 保存成功，显示成功状态
                setTimeout(() => {
                    saveBtn.classList.remove('saving');
                    saveBtn.textContent = 'SUCCESS';
                    saveBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

                    // 1.5秒后恢复
                    setTimeout(() => {
                        saveBtn.textContent = 'SAVE';
                        saveBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
                    }, 1500);
                }, 800);
            }
        });
    });

    // 加载设置
    function loadSettings() {
        chrome.storage.local.get(['maxResults', 'aiRecommendation', 'aiTimeout'], function (result) {
            if (result.maxResults) {
                maxResultsInput.value = result.maxResults;
            }
            // 默认关闭AI推荐（需要用户手动开启）
            aiRecommendationToggle.checked = result.aiRecommendation === true;
            // 默认AI超时时间30000ms（如果用户未设置过）
            aiTimeoutInput.value = result.aiTimeout || 30000;
        });
    }

    // 页面加载时获取设置
    loadSettings();

    // 显示状态消息
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';

        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }


    // 加载插件信息
    function loadExtensionInfo() {
        // 获取插件版本
        const manifest = chrome.runtime.getManifest();
        document.getElementById('extensionVersion').textContent = manifest.version;

        // 获取最后更新时间
        const lastUpdate = new Date().toLocaleDateString('zh-CN');
        document.getElementById('lastUpdate').textContent = lastUpdate;

        // 加载使用统计
        chrome.storage.local.get(['totalSearches', 'mostUsedFeature'], function (result) {
            document.getElementById('totalSearches').textContent = result.totalSearches || 0;
            document.getElementById('mostUsedFeature').textContent = result.mostUsedFeature || '历史记录搜索';
        });
    }

    // 初始化
    loadSettings();
    loadExtensionInfo();
});
