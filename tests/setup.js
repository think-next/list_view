// Jest setup file for List View extension tests

// Mock Chrome API
global.chrome = {
  tabs: {
    query: jest.fn(callback => callback([])),
    remove: jest.fn((tabId, callback) => callback && callback()),
    move: jest.fn((tabIds, moveProperties, callback) => callback && callback()),
    update: jest.fn((tabId, updateProperties, callback) => callback && callback()),
    create: jest.fn((createProperties, callback) => callback && callback()),
    get: jest.fn((tabId, callback) => callback && callback())
  },
  windows: {
    getAll: jest.fn(callback => callback([])),
    update: jest.fn((windowId, updateInfo, callback) => callback && callback()),
    create: jest.fn((createProperties, callback) => callback && callback()),
    remove: jest.fn((windowId, callback) => callback && callback()),
    current: jest.fn(callback => callback())
  },
  bookmarks: {
    getTree: jest.fn(callback => callback([])),
    search: jest.fn((query, callback) => callback([])),
    remove: jest.fn((id, callback) => callback && callback()),
    get: jest.fn((id, callback) => callback && callback())
  },
  history: {
    search: jest.fn((query, callback) => callback([]))
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((items, callback) => callback && callback())
    }
  },
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      setTimeout(() => callback && callback({ success: true }), 0);
      return true;
    }),
    getManifest: jest.fn(() => ({
      name: 'List View',
      version: '1.2.3'
    })),
    lastError: null
  },
  scripting: {
    executeScript: jest.fn((injectSpec, callback) => callback && callback())
  },
  commands: {
    onCommand: {
      addListener: jest.fn()
    }
  },
  action: {
    onClicked: {
      addListener: jest.fn()
    }
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock URL constructor
global.URL = class MockURL {
  constructor(url, base) {
    this.url = url;
    this.base = base;
    if (!url.startsWith('http')) {
      this.url = 'https://example.com/' + url;
    }
    const parsed = new global.URL.prototype.constructor(this.url);
    this.href = this.url;
    this.protocol = parsed.protocol;
    this.hostname = parsed.hostname || 'example.com';
    this.pathname = parsed.pathname;
    this.origin = parsed.origin;
    this.search = parsed.search;
    this.hash = parsed.hash;
  }
  toString() {
    return this.url;
  }
};

// Add custom matchers
expect.extend({
  toBeValidTabItem(received) {
    const pass = received &&
      typeof received.dataset.tabId !== 'undefined' &&
      received.dataset.url &&
      received.classList.contains('tab-item');
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be a valid tab item`
        : `Expected ${received} to be a valid tab item with tabId, url, and tab-item class`
    };
  }
});
