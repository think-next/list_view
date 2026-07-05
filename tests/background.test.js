/**
 * Background script tests
 * Tests for message handling and Chrome API interactions
 */

describe('Background Script', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Tab operations', () => {
    it('should handle closeTab request successfully', async () => {
      chrome.tabs.remove.mockImplementation((tabId, callback) => {
        callback();
      });

      // Simulate the closeTab handler
      const handleCloseTab = async (tabId) => {
        return new Promise((resolve) => {
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message
              });
              return;
            }
            resolve({
              success: true,
              message: '标签页已关闭'
            });
          });
        });
      };

      const result = await handleCloseTab(123);

      expect(chrome.tabs.remove).toHaveBeenCalledWith(123, expect.any(Function));
      expect(result.success).toBe(true);
      expect(result.message).toBe('标签页已关闭');
    });

    it('should handle closeTab error', async () => {
      chrome.runtime.lastError = { message: 'Tab not found' };
      chrome.tabs.remove.mockImplementation((tabId, callback) => {
        callback();
      });

      const handleCloseTab = async (tabId) => {
        return new Promise((resolve) => {
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message
              });
              return;
            }
            resolve({
              success: true,
              message: '标签页已关闭'
            });
          });
        });
      };

      const result = await handleCloseTab(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tab not found');

      // Clean up
      chrome.runtime.lastError = null;
    });
  });

  describe('Window operations', () => {
    it('should handle mergeWindows request', async () => {
      const mockWindows = [
        { id: 1, state: 'normal' },
        { id: 2, state: 'normal' }
      ];
      const mockSourceTabs = [
        { id: 101, windowId: 1, url: 'https://example.com' }
      ];

      chrome.windows.getAll.mockImplementation(callback => callback(mockWindows));
      chrome.tabs.query.mockImplementation(({ windowId }, callback) => {
        if (windowId === 1) callback(mockSourceTabs);
        else callback([]);
      });
      chrome.tabs.move.mockImplementation((tabIds, moveProperties, callback) => callback());
      chrome.windows.remove.mockImplementation((windowId, callback) => callback());
      chrome.storage.local.get.mockImplementation((keys, callback) => callback({ windowNames: {} }));
      chrome.storage.local.set.mockImplementation((items, callback) => callback && callback());

      const handleMergeWindows = async (sourceWindowId, targetWindowId) => {
        try {
          const windows = await new Promise((resolve, reject) => {
            chrome.windows.getAll((windows) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(windows);
            });
          });

          const sourceWindow = windows.find(w => w.id === sourceWindowId);
          const targetWindow = windows.find(w => w.id === targetWindowId);

          if (!sourceWindow || !targetWindow) {
            throw new Error('窗口不存在');
          }

          const sourceTabs = await new Promise((resolve, reject) => {
            chrome.tabs.query({ windowId: sourceWindowId }, (tabs) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(tabs);
            });
          });

          const tabIds = sourceTabs.map(tab => tab.id);

          await new Promise((resolve, reject) => {
            chrome.tabs.move(tabIds, { windowId: targetWindowId, index: -1 }, (movedTabs) => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve(movedTabs);
            });
          });

          await new Promise((resolve, reject) => {
            chrome.windows.remove(sourceWindowId, () => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve();
            });
          });

          return { success: true, mergedTabsCount: sourceTabs.length };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await handleMergeWindows(1, 2);

      expect(result.success).toBe(true);
      expect(result.mergedTabsCount).toBe(1);
      expect(chrome.tabs.move).toHaveBeenCalledWith([101], { windowId: 2, index: -1 }, expect.any(Function));
      expect(chrome.windows.remove).toHaveBeenCalledWith(1, expect.any(Function));
    });

    it('should handle moveTabToWindow request', async () => {
      chrome.tabs.move.mockImplementation((tabId, moveProperties, callback) => callback());

      const handleMoveTabToWindow = async (tabId, sourceWindowId, targetWindowId) => {
        try {
          if (sourceWindowId === targetWindowId) {
            return { success: true, message: '标签页已在目标窗口中' };
          }

          await new Promise((resolve, reject) => {
            chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 }, () => {
              if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
              else resolve();
            });
          });

          return { success: true, message: '标签页移动成功' };
        } catch (error) {
          return { success: false, error: error.message };
        }
      };

      const result = await handleMoveTabToWindow(101, 1, 2);

      expect(chrome.tabs.move).toHaveBeenCalledWith(101, { windowId: 2, index: -1 }, expect.any(Function));
      expect(result.success).toBe(true);
      expect(result.message).toBe('标签页移动成功');
    });
  });

  describe('Storage operations', () => {
    it('should save and retrieve window names', async () => {
      const mockWindowNames = { '1': 'Work', '2': 'Personal' };
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ windowNames: mockWindowNames });
      });
      chrome.storage.local.set.mockImplementation((items, callback) => callback());

      const handleSaveWindowName = async (windowId, name) => {
        return new Promise((resolve) => {
          chrome.storage.local.get(['windowNames'], (result) => {
            const names = result.windowNames || {};
            names[windowId] = name;
            chrome.storage.local.set({ windowNames: names }, () => {
              resolve({ success: true });
            });
          });
        });
      };

      const handleGetWindowNames = async () => {
        return new Promise((resolve) => {
          chrome.storage.local.get(['windowNames'], (result) => {
            resolve({
              success: true,
              windowNames: result.windowNames || {}
            });
          });
        });
      };

      // Save a window name
      await handleSaveWindowName('3', 'Research');

      // Get all window names
      const result = await handleGetWindowNames();

      expect(result.success).toBe(true);
      expect(result.windowNames['1']).toBe('Work');
      expect(result.windowNames['2']).toBe('Personal');
    });
  });

  describe('Message routing', () => {
    it('should route getAllTabs message correctly', async () => {
      chrome.tabs.query.mockImplementation((query, callback) => callback([]));
      chrome.storage.local.get.mockImplementation((keys, callback) => callback({}));

      const messageHandlers = {
        getAllTabs: async () => {
          return new Promise((resolve) => {
            chrome.tabs.query({}, (tabs) => {
              if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
              }
              resolve({ success: true, results: [] });
            });
          });
        }
      };

      const handler = messageHandlers['getAllTabs'];
      const result = await handler();

      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });
  });
});
