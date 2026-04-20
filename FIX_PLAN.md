# List View Bug Fix Plan

Created: 2026-04-20

## 🔴 Critical (1-4)

- [x] #1 quick-action-btn 选择器缺 `.` 导致复制/新窗口按钮失效
- [x] #2 handleHistoryStatsRequest 回调外 return 导致统计静默失败 → 改为 Promise
- [x] #3 handleGetRecentHistoryRequest 同样的回调外 return 问题 → 改为 Promise
- [x] #4 handleSwitchToTabRequest / handleCloseTabRequest / handleGetWindowNamesRequest 回调外 return → 改为 Promise

## 🟡 Medium (5-9)

- [x] #5 每次打开模态框默认加载所有 tabs → 改为默认显示搜索历史
- [x] #6 默认模式 vs filter 模式去重逻辑不一致 → 统一使用 toBaseUrl
- [x] #7 refreshSimpleResultsDisplay 与 displayResults 代码重复 → 委托给 displayResults
- [x] #8 默认模式空输入行为统一 → 已确认各模式行为一致
- [x] #9 AI 推荐设置标注优化 → Experimental 标签移到分组标题

## 🟢 Minor (10-15)

- [x] #10 Settings Save 按钮字号 0.66rem → 0.85rem
- [x] #11 中英文混杂 → UI 文案已统一英文，无需修改
- [x] #12 键盘快捷键提示 → 添加 chrome://extensions/shortcuts 链接
- [x] #13 Tab 视图切换窗口快捷键提示 → 添加 ← → 提示文字
- [x] #14 书签删除添加确认弹窗 → confirm() 二次确认
- [x] #15 窗口合并添加二次确认 → confirm() 二次确认

**状态：全部 15 项已修复 ✅**
