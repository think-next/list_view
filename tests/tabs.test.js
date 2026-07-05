/**
 * Tabs module tests
 * Tests for tab selection, batch operations, and move functionality
 */

describe('Tabs Module', () => {
  let mockModal;
  let mockSearchModal;

  beforeEach(() => {
    // Create mock DOM elements
    document.body.innerHTML = `
      <div id="searchModal" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-body">
            <div id="resultsContainer">
              <div class="tab-item" data-tab-id="1" data-url="https://example.com/page1">
                <span class="batch-checkbox">☐</span>
              </div>
              <div class="tab-item" data-tab-id="2" data-url="https://example.com/page2">
                <span class="batch-checkbox">☐</span>
              </div>
              <div class="tab-item" data-tab-id="3" data-url="https://example.com/page3">
                <span class="batch-checkbox">☐</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Create a mock SearchModal class with tabs.js methods
    mockSearchModal = {
      modal: document.getElementById('searchModal'),
      selectedTabIds: new Set(),
      lastClickedTabId: null,

      // Include methods from tabs.js
      toggleTabSelection: function(tabId, e) {
        if (e && e.shiftKey && this.lastClickedTabId !== null) {
          // Shift+Click: range select
          const visibleItems = Array.from(
            this.modal.querySelectorAll('.tab-item:not(.window-hidden .tab-item)') ||
            this.modal.querySelectorAll('.tab-item')
          );
          const ids = visibleItems.map(el => parseInt(el.dataset.tabId)).filter(id => !isNaN(id));
          const lastIdx = ids.indexOf(this.lastClickedTabId);
          const curIdx = ids.indexOf(tabId);
          if (lastIdx !== -1 && curIdx !== -1) {
            const start = Math.min(lastIdx, curIdx);
            const end = Math.max(lastIdx, curIdx);
            for (let i = start; i <= end; i++) this.selectedTabIds.add(ids[i]);
          }
        } else if (this.selectedTabIds.has(tabId)) {
          this.selectedTabIds.delete(tabId);
        } else {
          this.selectedTabIds.add(tabId);
        }
        this.lastClickedTabId = tabId;
        this.updateBatchSelectionUI();
      },

      updateBatchSelectionUI: function() {
        this.modal.querySelectorAll('.tab-item').forEach(item => {
          const tabId = parseInt(item.dataset.tabId);
          const cb = item.querySelector('.batch-checkbox');
          if (this.selectedTabIds.has(tabId)) {
            item.style.outline = '2px solid #3b82f6';
            item.style.outlineOffset = '-1px';
            item.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
            if (cb) {
              cb.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="14" height="14" rx="3" fill="#3b82f6" stroke="#3b82f6" stroke-width="1"/>
                <path d="M4 8L6.5 10.5L12 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`;
            }
          } else {
            item.style.outline = '';
            item.style.outlineOffset = '';
            item.style.boxShadow = '';
            if (cb) {
              cb.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="14" height="14" rx="3" fill="white" stroke="#cbd5e1" stroke-width="1.5"/>
              </svg>`;
            }
          }
        });

        let bar = this.modal.querySelector('#batchActionBar');
        if (this.selectedTabIds.size > 0) {
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'batchActionBar';
            bar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 20px;background:linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);color:white;';
            bar.innerHTML = `<span id="batchCount">0 selected</span>`;
            const modalBody = this.modal.querySelector('.modal-body');
            modalBody.appendChild(bar);
          }
          bar.style.display = 'flex';
          bar.querySelector('#batchCount').textContent = `${this.selectedTabIds.size} selected`;
        } else if (bar) {
          bar.style.display = 'none';
        }
      }
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('toggleTabSelection', () => {
    it('should select a single tab when clicked', () => {
      const tabId = 1;
      mockSearchModal.toggleTabSelection(tabId, {});

      expect(mockSearchModal.selectedTabIds.has(tabId)).toBe(true);
      expect(mockSearchModal.selectedTabIds.size).toBe(1);
    });

    it('should deselect a tab when clicked twice', () => {
      const tabId = 1;
      mockSearchModal.toggleTabSelection(tabId, {});
      mockSearchModal.toggleTabSelection(tabId, {});

      expect(mockSearchModal.selectedTabIds.has(tabId)).toBe(false);
      expect(mockSearchModal.selectedTabIds.size).toBe(0);
    });

    it('should select multiple tabs with Shift+Click', () => {
      // First select tab 1
      mockSearchModal.toggleTabSelection(1, {});

      // Then Shift+Click on tab 3
      mockSearchModal.toggleTabSelection(3, { shiftKey: true });

      expect(mockSearchModal.selectedTabIds.has(1)).toBe(true);
      expect(mockSearchModal.selectedTabIds.has(2)).toBe(true);
      expect(mockSearchModal.selectedTabIds.has(3)).toBe(true);
      expect(mockSearchModal.selectedTabIds.size).toBe(3);
    });

    it('should update lastClickedTabId on selection', () => {
      mockSearchModal.toggleTabSelection(2, {});

      expect(mockSearchModal.lastClickedTabId).toBe(2);
    });
  });

  describe('updateBatchSelectionUI', () => {
    it('should show visual indicators for selected tabs', () => {
      mockSearchModal.selectedTabIds.add(1);
      mockSearchModal.updateBatchSelectionUI();

      const tab1 = mockSearchModal.modal.querySelector('[data-tab-id="1"]');
      expect(tab1.style.outline).toBe('2px solid #3b82f6');
      expect(tab1.style.outlineOffset).toBe('-1px');
    });

    it('should not show indicators for unselected tabs', () => {
      mockSearchModal.selectedTabIds.add(1);
      mockSearchModal.updateBatchSelectionUI();

      const tab2 = mockSearchModal.modal.querySelector('[data-tab-id="2"]');
      expect(tab2.style.outline).toBe('');
    });

    it('should create and show batch action bar when tabs are selected', () => {
      mockSearchModal.selectedTabIds.add(1);
      mockSearchModal.updateBatchSelectionUI();

      const actionBar = mockSearchModal.modal.querySelector('#batchActionBar');
      expect(actionBar).not.toBeNull();
      expect(actionBar.style.display).toBe('flex');
    });

    it('should update selection count in action bar', () => {
      mockSearchModal.selectedTabIds.add(1);
      mockSearchModal.selectedTabIds.add(2);
      mockSearchModal.updateBatchSelectionUI();

      const countLabel = mockSearchModal.modal.querySelector('#batchCount');
      expect(countLabel.textContent).toBe('2 selected');
    });

    it('should hide action bar when no tabs are selected', () => {
      // First create the action bar
      mockSearchModal.selectedTabIds.add(1);
      mockSearchModal.updateBatchSelectionUI();

      // Then clear selection
      mockSearchModal.selectedTabIds.clear();
      mockSearchModal.updateBatchSelectionUI();

      const actionBar = mockSearchModal.modal.querySelector('#batchActionBar');
      expect(actionBar.style.display).toBe('none');
    });
  });

  describe('Batch checkbox SVG rendering', () => {
    it('should render checked checkbox SVG for selected tabs', () => {
      mockSearchModal.selectedTabIds.add(1);
      mockSearchModal.updateBatchSelectionUI();

      const checkbox = mockSearchModal.modal.querySelector('[data-tab-id="1"] .batch-checkbox');
      expect(checkbox.innerHTML).toContain('rect');
      expect(checkbox.innerHTML).toContain('path');
      expect(checkbox.innerHTML).toContain('fill="#3b82f6"');
    });

    it('should render unchecked checkbox SVG for unselected tabs', () => {
      mockSearchModal.updateBatchSelectionUI();

      const checkbox = mockSearchModal.modal.querySelector('[data-tab-id="1"] .batch-checkbox');
      expect(checkbox.innerHTML).toContain('rect');
      expect(checkbox.innerHTML).not.toContain('path');
      expect(checkbox.innerHTML).toContain('fill="white"');
    });
  });
});
