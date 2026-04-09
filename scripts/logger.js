// logger.js - 统一日志工具，生产环境静默
(function() {
    'use strict';

    const isDev = !('update_url' in chrome.runtime.getManifest());

    window.Logger = {
        info: isDev ? console.log.bind(console) : () => {},
        warn: isDev ? console.warn.bind(console) : () => {},
        error: console.error.bind(console), // error 始终输出
        debug: isDev ? console.log.bind(console) : () => {}
    };

    // 在 modal.js 加载前定义，确保所有模块可用
})();
