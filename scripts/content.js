// 全局变量
let searchModal = null;

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script收到消息:', request);

    if (request.action === 'ping') {
        // 响应ping消息，确认content script已加载
        sendResponse({ success: true, message: 'Content script已就绪' });
        return true;
    } else if (request.action === 'showModal') {
        showModal();
        sendResponse({ success: true, message: '模态框显示成功' });
        return true;
    } else if (request.action === 'hideModal') {
        hideModal();
        sendResponse({ success: true, message: '模态框隐藏成功' });
        return true;
    }

    // 如果没有匹配的action，返回错误
    sendResponse({ success: false, message: '未知的action' });
    return true;
});

// 显示模态框
function showModal() {
    try {
        console.log('开始显示模态框...');

        // 检查页面是否支持模态框
        if (!isPageCompatible()) {
            console.warn('当前页面不支持模态框');
            return;
        }

        // 如果模态框已存在，先移除
        if (searchModal) {
            console.log('移除现有模态框');
            searchModal.close();
            searchModal = null;
        }

        // 检查SearchModal类是否可用
        if (typeof SearchModal === 'undefined') {
            console.error('SearchModal类未定义');
            createFallbackModal();
            return;
        }

        // 创建新的模态框实例
        console.log('创建新模态框实例');
        searchModal = new SearchModal();

        // 显示模态框
        searchModal.show();
        console.log('模态框显示完成');

    } catch (error) {
        console.error('显示模态框失败:', error);
        console.error('错误堆栈:', error.stack);

        // 尝试备用方案：直接创建简单的模态框
        console.log('尝试备用方案...');
        createFallbackModal();
    }
}

// 检查页面兼容性
function isPageCompatible() {
    // 检查基本DOM支持
    if (!document.body) {
        console.warn('页面body未加载');
        return false;
    }

    // 检查是否在iframe中
    if (window !== window.top) {
        console.warn('页面在iframe中，可能不支持模态框');
        return false;
    }

    // 检查页面是否被冻结
    if (document.visibilityState === 'hidden') {
        console.warn('页面不可见，跳过模态框显示');
        return false;
    }

    return true;
}

// 隐藏模态框
function hideModal() {
    if (searchModal && searchModal.isOpen) {
        searchModal.close();
    }
}

// 备用模态框（如果SearchModal类不可用）
function createFallbackModal() {
    try {
        console.log('创建备用模态框...');

        // 移除现有模态框
        const existingModal = document.getElementById('searchModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建简单的模态框
        const modal = document.createElement('div');
        modal.id = 'searchModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            width: 300px;
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
            text-align: center;
        `;

        container.innerHTML = `
            <h2 style="margin: 0 0 20px 0; color: #333;">🔍 搜索功能</h2>
            <p style="color: #666; margin-bottom: 20px;">SearchModal类加载失败，请检查扩展配置。</p>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                关闭
            </button>
        `;

        modal.appendChild(container);
        document.body.appendChild(modal);

        console.log('备用模态框创建成功');

    } catch (fallbackError) {
        console.error('备用模态框创建失败:', fallbackError);
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('Content script initialized');

    // 发送就绪信号给background script
    chrome.runtime.sendMessage({
        action: 'contentScriptReady',
        url: window.location.href,
        title: document.title
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn('发送就绪信号失败:', chrome.runtime.lastError);
        }
    });
}