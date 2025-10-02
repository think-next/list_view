// 选项页面脚本
document.addEventListener('DOMContentLoaded', function () {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const maxResultsSlider = document.getElementById('maxResults');
    const sliderValue = document.getElementById('sliderValue');
    const aiRecommendationToggle = document.getElementById('aiRecommendation');
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

    // 滑块值更新
    maxResultsSlider.addEventListener('input', function () {
        sliderValue.textContent = this.value;
    });

    // 保存设置
    saveBtn.addEventListener('click', function () {
        const maxResults = parseInt(maxResultsSlider.value);
        const aiRecommendation = aiRecommendationToggle.checked;

        // 保存到chrome存储
        chrome.storage.local.set({
            maxResults: maxResults,
            aiRecommendation: aiRecommendation
        }, function () {
            if (chrome.runtime.lastError) {
                showStatus('保存失败: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('设置已保存！', 'success');
            }
        });
    });

    // 加载设置
    function loadSettings() {
        chrome.storage.local.get(['maxResults', 'aiRecommendation'], function (result) {
            if (result.maxResults) {
                maxResultsSlider.value = result.maxResults;
                sliderValue.textContent = result.maxResults;
            }
            // 默认启用AI推荐（如果用户未设置过）
            aiRecommendationToggle.checked = result.aiRecommendation !== false;
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
