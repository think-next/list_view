# List View v1.2.3 Release Notes

## Version Information
- **Version**: 1.2.3
- **Release Date**: May 2, 2026
- **Package Size**: 253 KB

## What's New

### 🎨 UI Improvements
- **Red Theme Options Page**: Completely redesigned options page with a vibrant red color scheme
- Enhanced visual consistency across all UI elements

### 🔧 Bug Fixes
- **Sessions API**: Added `sessions` permission to fix "getRecentlyClosed" functionality
- **Tab Display**: Restored default behavior to show all tabs when opening the extension
- Fixed selection issues in tab removal scenarios

### 📦 Included Features from v1.2.2
- Quick action buttons (Copy URL, Open in new window)
- Improved app icon with 3D depth and lightning glow
- Fixed window switching state management
- Enhanced scroll behavior with overflow handling

## Installation Instructions

1. Download `list-view-v1.2.3.zip`
2. Verify integrity using SHA256 checksum:
   ```
   aad3990a665c2e1f04aa63752d73e0d92b6880511ded5af1ed3db1e502f5c512
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the extracted folder

## File Structure
```
list-view-v1.2.3/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── options.html          # Options page (new red theme!)
├── styles/
│   └── modal.css         # Modal styling
├── scripts/
│   ├── modal.js
│   ├── options.js
│   ├── content.js
│   ├── logger.js
│   └── modules/
│       ├── modal-core.js
│       ├── search.js
│       ├── bookmarks.js
│       ├── tabs.js
│       ├── ui-components.js
│       └── ai-recommendations.js
└── images/
    ├── icon-16.png
    ├── icon-32.png
    ├── icon-48.png
    ├── icon-128.png
    ├── alipay-qr.png
    └── wechat-qr.png
```

## System Requirements
- Google Chrome / Chromium-based browser
- Chrome Extensions Manifest V3 support

## Support
For issues, questions, or feedback:
- Email: f2493393471@gmail.com
- GitHub: https://github.com/think-next/list_view

## License
MIT License - See LICENSE file for details
