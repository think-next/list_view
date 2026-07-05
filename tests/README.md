# List View Extension Tests

This directory contains unit tests for the List View Chrome extension.

## Test Structure

- `setup.js` - Jest configuration and Chrome API mocks
- `tabs.test.js` - Tests for tab selection and batch operations
- `background.test.js` - Tests for background script message handling

## Running Tests

```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Writing New Tests

1. Create a new `.test.js` file in this directory
2. Import necessary modules
3. Use `describe` and `it` blocks to structure tests
4. Mock Chrome API calls using the provided `chrome` global object
5. Run tests to verify functionality

## Chrome API Mocking

The `setup.js` file provides comprehensive mocks for:

- `chrome.tabs` - Tab management
- `chrome.windows` - Window management
- `chrome.bookmarks` - Bookmark operations
- `chrome.history` - History operations
- `chrome.storage` - Storage operations
- `chrome.runtime` - Extension runtime

## Coverage Goals

- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%
