# BrainDump Auto-Fill Test Suite

Comprehensive testing suite for the auto-fill functionality of BrainDump Voice Processor.

---

## Overview

This test suite provides complete coverage of the auto-fill feature, including:

- **Unit Tests** - Test individual components in isolation
- **Integration Tests** - Test component interactions
- **E2E Tests** - Test complete workflows across applications
- **Performance Tests** - Verify latency and resource usage
- **Manual Tests** - Document real-world usage scenarios

---

## Test Structure

```
tests/
├── services/
│   └── accessibility_service.test.ts      # Unit tests for AccessibilityService
├── managers/
│   └── autofill_manager.test.ts           # Unit tests for AutoFillManager
├── e2e/
│   └── autofill-compatibility.spec.ts     # E2E app compatibility tests
├── performance/
│   └── autofill-performance.test.ts       # Performance benchmarks
├── manual/
│   ├── AUTOFILL_TEST_PLAN.md              # Manual test plan (12 tests)
│   └── TEST_RESULTS.md                    # Test results template
└── README.md                               # This file
```

---

## Quick Start

### Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Build native module:**
   ```bash
   npm run build:native
   ```

4. **Grant accessibility permissions:**
   - Open System Preferences → Privacy & Security → Accessibility
   - Add and enable BrainDump

### Running Tests

#### All Tests
```bash
# Run all unit and integration tests
npm test

# Run all tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Specific Test Suites
```bash
# Unit tests only
npm test -- tests/services/
npm test -- tests/managers/

# E2E tests
npm run test:e2e

# Performance tests (with garbage collection)
node --expose-gc node_modules/.bin/jest tests/performance/
```

#### Individual Test Files
```bash
# AccessibilityService unit tests
npm test -- tests/services/accessibility_service.test.ts

# AutoFillManager unit tests
npm test -- tests/managers/autofill_manager.test.ts

# E2E compatibility tests
npm run test:e2e -- tests/e2e/autofill-compatibility.spec.ts

# Performance tests
npm test -- tests/performance/autofill-performance.test.ts
```

---

## Test Coverage

### Unit Tests

#### AccessibilityService (`tests/services/accessibility_service.test.ts`)

**Coverage Areas:**
- ✅ Initialization and module loading
- ✅ Permission checking and requesting
- ✅ Monitoring lifecycle (start/stop)
- ✅ Text field focus event emission
- ✅ Text injection with validation
- ✅ State management
- ✅ Cleanup and resource disposal
- ✅ Error handling
- ✅ Edge cases

**Test Count:** 40+ tests

**Run:**
```bash
npm test -- tests/services/accessibility_service.test.ts
```

#### AutoFillManager (`tests/managers/autofill_manager.test.ts`)

**Coverage Areas:**
- ✅ Initialization and configuration
- ✅ Start/stop lifecycle
- ✅ Settings management and updates
- ✅ Auto-fill decision logic
- ✅ Blacklist functionality
- ✅ Debouncing
- ✅ Manual fill triggering
- ✅ Database integration
- ✅ Usage tracking
- ✅ Error handling
- ✅ Edge cases

**Test Count:** 50+ tests

**Run:**
```bash
npm test -- tests/managers/autofill_manager.test.ts
```

---

### E2E Tests

#### App Compatibility (`tests/e2e/autofill-compatibility.spec.ts`)

**Coverage Areas:**
- ✅ Permission flow
- ✅ Basic auto-fill functionality
- ✅ App compatibility matrix (10 apps)
- ✅ Blacklist functionality
- ✅ Settings persistence
- ✅ Manual trigger mode
- ✅ Performance
- ✅ Edge cases
- ✅ Error scenarios
- ✅ Integration workflows

**Apps Tested:**
- Google Chrome
- Safari
- Firefox
- VS Code
- TextEdit
- Notes
- Messages
- Mail
- Slack
- Notion

**Run:**
```bash
npm run test:e2e -- tests/e2e/autofill-compatibility.spec.ts
```

**Note:** Many E2E tests require manual verification due to cross-application accessibility testing limitations.

---

### Performance Tests

#### Performance Benchmarks (`tests/performance/autofill-performance.test.ts`)

**Metrics Measured:**
- ✅ Text injection latency (<100ms target)
- ✅ Large transcript handling (1K, 5K, 10K chars)
- ✅ Debouncing effectiveness
- ✅ Memory management (leak prevention)
- ✅ Database query performance
- ✅ Start/stop performance
- ✅ Concurrent operation handling

**Performance Targets:**
- Average latency: <100ms
- P95 latency: <150ms
- P99 latency: <200ms
- Memory growth: <10MB per 1000 operations
- Start time: <100ms
- Stop time: <50ms

**Run:**
```bash
# With garbage collection enabled
node --expose-gc node_modules/.bin/jest tests/performance/autofill-performance.test.ts
```

---

### Manual Tests

#### Manual Test Plan (`tests/manual/AUTOFILL_TEST_PLAN.md`)

**Test Scenarios:**
1. Permission Flow
2. Auto Mode - Google Chrome
3. Auto Mode - Safari
4. Manual Trigger Mode
5. Blacklist Functionality
6. Debouncing
7. App Compatibility Matrix (10 apps)
8. Performance Testing
9. Error Handling
10. Edge Cases
11. Settings Persistence
12. Usage Statistics

**How to Execute:**
1. Open `tests/manual/AUTOFILL_TEST_PLAN.md`
2. Follow each test step-by-step
3. Record results in the test plan
4. Document findings in `tests/manual/TEST_RESULTS.md`

**Target Success Criteria:**
- ✅ 90%+ app compatibility (9/10 apps working)
- ✅ <100ms average injection latency
- ✅ All edge cases handled gracefully
- ✅ No crashes during testing

---

## Acceptance Criteria

### Issue #30 Requirements

To close Issue #30, the following criteria must be met:

- [ ] ✅ **Unit coverage >90%**
  - AccessibilityService: >90%
  - AutoFillManager: >90%

- [ ] ✅ **E2E pass for 9/10 apps** (90%+ compatibility)
  - Tested across Chrome, Safari, Firefox, VS Code, TextEdit, Notes, Messages, Mail, Slack, Notion

- [ ] ✅ **Edge cases handled**
  - Empty transcripts
  - Special characters
  - Very long text (10,000 chars)
  - Multiline text
  - Rapid focus changes
  - Permission errors

- [ ] ✅ **Performance <100ms**
  - Average injection latency
  - Measured across various transcript sizes

- [ ] ✅ **Compatibility matrix documented**
  - App compatibility table completed
  - Test results documented

---

## Common Issues and Solutions

### Tests Failing

**Issue:** Unit tests fail with "Cannot find module"
**Solution:**
```bash
npm run build
npm test
```

**Issue:** Native module not found
**Solution:**
```bash
npm run build:native
npm test
```

**Issue:** E2E tests timeout
**Solution:**
Increase timeout in playwright.config.js:
```javascript
timeout: 60000 // 60 seconds
```

### Performance Tests

**Issue:** Memory tests fail
**Solution:**
Run with garbage collection:
```bash
node --expose-gc node_modules/.bin/jest tests/performance/
```

**Issue:** Performance targets not met
**Solution:**
- Close other applications
- Ensure native module is optimized build
- Check system resources

### E2E Tests

**Issue:** Accessibility permissions not working
**Solution:**
- Grant permissions in System Preferences
- Restart BrainDump
- Check permissions with:
  ```bash
  # In BrainDump console
  accessibilityService.ensurePermissions()
  ```

---

## Test Development

### Adding New Tests

#### Unit Test Template

```typescript
import { ComponentName } from '../../src/path/to/component';

describe('ComponentName', () => {
  let component: ComponentName;

  beforeEach(() => {
    component = new ComponentName();
  });

  afterEach(() => {
    component.cleanup();
  });

  describe('functionality', () => {
    it('should do something', () => {
      expect(component.method()).toBe(expectedValue);
    });
  });
});
```

#### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should perform action', async () => {
    // Test implementation
    expect(result).toBeTruthy();
  });
});
```

### Test Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up resources in `afterEach`
3. **Mocking:** Mock external dependencies
4. **Assertions:** Use specific assertions (not just `toBeTruthy`)
5. **Documentation:** Add comments for complex test logic

---

## Continuous Integration

### GitHub Actions (if configured)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm run build:native
      - run: npm run test:coverage
      - run: npm run test:e2e
```

---

## Performance Benchmarking

### Running Benchmarks

```bash
# Full performance suite
node --expose-gc node_modules/.bin/jest tests/performance/autofill-performance.test.ts

# With verbose output
node --expose-gc node_modules/.bin/jest tests/performance/autofill-performance.test.ts --verbose
```

### Interpreting Results

**Good Performance:**
```
Average latency: 45.23ms
P95: 78.12ms
P99: 92.45ms
Memory growth: 2.3MB
```

**Needs Investigation:**
```
Average latency: 150ms+  ❌ (Target: <100ms)
P95: 250ms+              ❌ (Target: <150ms)
Memory growth: 15MB+     ❌ (Target: <10MB)
```

---

## Manual Testing Guide

### Preparation

1. Build the app: `npm run build`
2. Launch BrainDump: `npm start`
3. Grant accessibility permissions
4. Open `tests/manual/AUTOFILL_TEST_PLAN.md`
5. Prepare test applications (Chrome, Safari, TextEdit, etc.)

### Execution

1. Follow each test in sequence
2. Record results in the test plan
3. Note any issues or unexpected behavior
4. Complete the compatibility matrix
5. Sign off on completed tests

### Reporting

1. Complete `tests/manual/TEST_RESULTS.md`
2. Document all issues found
3. Provide recommendations
4. Submit for review

---

## Resources

### Documentation
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

### Related Files
- `/src/services/accessibility_service.ts` - Service implementation
- `/src/managers/autofill_manager.ts` - Manager implementation
- `/build/Release/accessibility.node` - Native module
- `/config/default.json` - Configuration

### Issue Tracking
- **Primary Issue:** #30 - Comprehensive Test Suite for Auto-Fill
- **Related Issues:** #26, #27, #28, #29

---

## Questions and Support

For questions or issues with the test suite:

1. Check this README
2. Review test file comments
3. Check issue #30 on GitHub
4. Contact the development team

---

**Last Updated:** 2025-01-26
**Test Suite Version:** 1.0
**BrainDump Version:** 2.1.0
