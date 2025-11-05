# Auto-Fill Test Suite - Quick Start Guide

**Fast track to running the comprehensive auto-fill test suite.**

---

## Prerequisites (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Build native module
npm run build:native

# 4. Grant accessibility permissions
# Open System Preferences → Privacy & Security → Accessibility
# Add and enable BrainDump
```

---

## Running Tests

### Option 1: Quick Validation (2 minutes)

Run all automated tests to verify functionality:

```bash
# Run all unit tests with coverage
npm run test:coverage
```

**Expected output:**
```
Test Suites: 2 passed, 2 total
Tests:       90+ passed, 90+ total
Coverage:    >90% for all metrics
```

---

### Option 2: Performance Validation (5 minutes)

Verify performance meets targets (<100ms):

```bash
# Run with garbage collection enabled
node --expose-gc node_modules/.bin/jest tests/performance/autofill-performance.test.ts --verbose
```

**Look for:**
```
Average latency: <100ms ✅
P95 latency: <150ms ✅
Memory growth: <10MB ✅
```

---

### Option 3: E2E Compatibility (10 minutes)

Test across real applications:

```bash
# Run E2E tests
npm run test:e2e
```

**Note:** Many tests require manual verification. Follow on-screen instructions.

---

### Option 4: Complete Manual Testing (2-3 hours)

For comprehensive validation:

```bash
# 1. Open the manual test plan
open tests/manual/AUTOFILL_TEST_PLAN.md

# 2. Follow each test step-by-step

# 3. Record results in the test plan

# 4. Complete test results template
open tests/manual/TEST_RESULTS.md
```

---

## Quick Test Cheat Sheet

```bash
# All automated tests
npm test

# Unit tests only
npm test -- tests/services/ tests/managers/

# Single test file
npm test -- tests/services/accessibility_service.test.ts

# Watch mode (for development)
npm run test:watch

# E2E tests
npm run test:e2e

# E2E debug mode
npm run test:e2e:debug

# Performance tests
node --expose-gc node_modules/.bin/jest tests/performance/

# Type checking
npm run typecheck
```

---

## Interpreting Results

### ✅ PASS Criteria

**Unit Tests:**
```
✅ All tests passing
✅ Coverage >90%
✅ No errors in console
```

**Performance Tests:**
```
✅ Average latency <100ms
✅ P95 latency <150ms
✅ Memory growth <10MB per 1000 operations
```

**E2E Tests:**
```
✅ 9/10 apps compatible (90%+)
✅ No crashes
✅ All edge cases handled
```

### ❌ FAIL Scenarios

**Common Issues:**

1. **"Cannot find module"**
   ```bash
   npm run build
   npm test
   ```

2. **"Native module not found"**
   ```bash
   npm run build:native
   npm test
   ```

3. **"Permission denied"**
   - Grant accessibility permissions in System Preferences
   - Restart BrainDump

4. **Performance tests fail**
   ```bash
   # Use --expose-gc flag
   node --expose-gc node_modules/.bin/jest tests/performance/
   ```

---

## Test Suite Structure

```
tests/
├── services/
│   └── accessibility_service.test.ts    # 562 lines, 40+ tests
├── managers/
│   └── autofill_manager.test.ts         # 654 lines, 50+ tests
├── e2e/
│   └── autofill-compatibility.spec.ts   # 522 lines, 30+ tests
├── performance/
│   └── autofill-performance.test.ts     # 628 lines, 30+ tests
├── manual/
│   ├── AUTOFILL_TEST_PLAN.md            # 12 main tests, 32 total
│   └── TEST_RESULTS.md                  # Results template
└── README.md                             # Full documentation
```

**Total:** 2,366 lines of automated tests + comprehensive manual test plan

---

## Success Criteria Checklist

Before closing Issue #30, verify:

- [ ] Unit tests pass with >90% coverage
- [ ] Performance tests meet <100ms target
- [ ] E2E tests show 90%+ app compatibility
- [ ] All edge cases handled
- [ ] Manual tests completed and documented
- [ ] No critical issues (P0) found

---

## Need Help?

1. **Full Documentation:** `tests/README.md`
2. **Test Summary:** `tests/TEST_SUITE_SUMMARY.md`
3. **Manual Test Plan:** `tests/manual/AUTOFILL_TEST_PLAN.md`
4. **Issue Tracking:** GitHub Issue #30

---

## One-Line Test Commands

```bash
# The essentials
npm test                                  # All unit tests
npm run test:coverage                     # With coverage
npm run test:e2e                          # E2E tests
node --expose-gc jest tests/performance/  # Performance

# For development
npm run test:watch                        # Watch mode
npm run typecheck                         # Type checking
npm run lint                              # Linting

# For CI/CD
npm run build && npm test && npm run test:e2e  # Full pipeline
```

---

**Quick Start Complete! For detailed information, see `tests/README.md`**
