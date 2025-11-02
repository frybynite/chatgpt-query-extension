# Testing Issues and Fixes

**Created**: 2025-11-01
**Status**: In Progress

---

## Overview

This document tracks issues encountered during Priority 2 automated test implementation and the solutions applied.

## Priority Summary

### High Priority
- **Issue #2**: Save Not Updating Sidebar (✅ RESOLVED)
- **Issue #7**: Context Menu Specs Don't Verify Real Menus (zero coverage for core feature)
- **Issue #8**: Action Execution Tests Stop at Form Configuration (zero coverage for execution paths)
- **Issue #10**: Weak UI Assertions & Heavy Reliance on waitForTimeout (test reliability issues)
- **Issue #12**: Planned Suites Still Unimplemented (20+ missing tests)

### Medium Priority
- **Issue #3**: Error Banners Not Showing (affects 4 tests)
- **Issue #4**: Dialog Handling Issues (affects 2-3 tests)
- **Issue #11**: Validation Paths Lack Automated Coverage

### Low Priority
- **Issue #5**: Success Banners Not Visible (affects 2 tests)
- **Issue #6**: Action Deletion Not Completing (affects 1-2 tests)
- **Issue #9**: Shortcut Conflict Test Title Mismatch (documentation issue)

---

## Issue #2: Save Not Updating Sidebar

### Problem

**Priority**: High  
**Severity**: High - Was affecting 5 tests  
**Status**: ✅ **RESOLVED**

After saving a menu, the sidebar doesn't immediately reflect the new menu name or newly created menu.

### Root Cause

**Timing issue**: Tests were checking the sidebar immediately after clicking save, before:
1. The async `saveConfig()` operation completed
2. `renderMenuList()` was called to update the DOM
3. The browser finished rendering the updated sidebar

Even though `renderMenuList()` is called synchronously after save (line 1116 in `options.js`), Playwright needs to wait for the save operation to complete and the DOM to update before checking for sidebar changes.

### Evidence

Tests showed console output like:
```
✓ Menu count increased to 2
✘ Error: Menu "New Context Menu" not visible in sidebar
```

### Solution

**Status**: ✅ **IMPLEMENTED** - Added `waitForSave()` helper and updated all affected tests

**Approach**: Wait for success banner to appear before checking sidebar updates

**Changes Made**:

1. **Added `waitForSave()` helper** to `tests/fixtures/extension.js`:
   - Waits for success banner (`#success-banner`) to become visible
   - Includes small additional wait (100ms) to ensure DOM updates are complete
   - Provides consistent way to wait for save operations across all tests

2. **Updated affected tests** to use `waitForSave()` after save clicks:
   - `tests/context-menu/dynamic-update.spec.js:18` - Added wait before checking new menu appears
   - `tests/context-menu/dynamic-update.spec.js:176` - Added waits for both save operations (original name and updated name)
   - `tests/ui/edit-menu-name.spec.js:15` - Added wait before checking sidebar update
   - `tests/ui/edit-menu-name.spec.js:86` - Added wait before checking sidebar update

**Example Fix**:

**Before** (fails):
```javascript
// Save the menu
await saveBtn.click();

// Wait for sidebar to update (may check too early)
const selectedMenuItem = optionsPage.locator('.menu-item.selected .menu-name');
await expect(selectedMenuItem).toContainText(newName, { timeout: 5000 });
```

**After** (passes):
```javascript
// Save the menu
await saveBtn.click();

// Wait for save to complete and sidebar to update
await optionsPage.waitForSave();

// Now check sidebar (DOM is guaranteed to be updated)
const selectedMenuItem = optionsPage.locator('.menu-item.selected .menu-name');
await expect(selectedMenuItem).toContainText(newName, { timeout: 5000 });
```

### Files Fixed

- `tests/fixtures/extension.js` - Added `waitForSave()` helper method
- `tests/context-menu/dynamic-update.spec.js` - Updated 2 tests
- `tests/ui/edit-menu-name.spec.js` - Updated 2 tests

**Total tests fixed**: 4 tests across 2 files

---

## Issue #3: Error Banners Not Showing

### Problem

**Priority**: Medium  
**Severity**: Medium - Affects 4 tests
**Tests Affected**: Shortcut conflict detection tests

When duplicate shortcuts are assigned, the error banner does not become visible, causing tests to fail.

### Root Cause

TBD - Need to verify if:
1. Conflict detection logic is actually running
2. Banner is being shown but with `hidden` class still applied
3. Timing issue where we check too early

### Evidence

Test output shows:
```
Expected: visible
Received: hidden
```

The error banner has class `error-banner hidden` instead of `error-banner`.

### Solution

**Status**: Not yet fixed

**Potential fixes**:
1. Add wait for error banner to appear
2. Check if `showError()` is being called
3. Verify conflict detection runs before we check banner
4. Add debug logging to see if errors are detected

### Files Affected

- `tests/shortcuts/conflict-detection.spec.js:15` - Duplicate within same menu
- `tests/shortcuts/conflict-detection.spec.js:163` - Run All conflict
- `tests/shortcuts/conflict-detection.spec.js:312` - Editing conflict

---

## Issue #4: Dialog Handling Issues

### Problem

**Priority**: Medium  
**Severity**: Medium - Affects 2-3 tests
**Tests Affected**: Delete menu confirmation tests

Confirmation dialogs for menu deletion aren't being captured or handled properly.

### Root Cause

TBD - Playwright dialog handlers may need adjustment

### Evidence

Tests set up dialog handlers but either:
1. Dialog message is not captured
2. Dialog accept/dismiss doesn't trigger
3. Deletion doesn't occur as expected

### Solution

**Status**: Not yet fixed

**Potential fixes**:
1. Set up dialog handler BEFORE triggering delete
2. Use `page.on('dialog')` instead of relying on global handler
3. Add timeout to wait for dialog
4. Verify dialog is actually shown

### Files Affected

- `tests/ui/delete-menu.spec.js:30` - Delete with confirmation
- `tests/ui/delete-menu.spec.js:77` - Cancel deletion
- `tests/ui/delete-menu.spec.js:203` - Action count in dialog

---

## Issue #5: Success Banners Not Visible

### Problem

**Priority**: Low  
**Severity**: Low - Affects 2 tests
**Tests Affected**: Save confirmation tests

Success banners remain hidden after save operations.

### Root Cause

Likely timing - success banner may have auto-hide timeout that fires before we check.

### Evidence

```
Expected: visible
Received: hidden
Locator: #success-banner
```

### Solution

**Status**: Not yet fixed

**Potential fixes**:
1. Check banner immediately after save (before auto-hide timeout)
2. Increase wait time or disable auto-hide in tests
3. Just verify save succeeded without checking banner

### Files Affected

- `tests/context-menu/dynamic-update.spec.js:62` - Save action success

---

## Issue #6: Action Deletion Not Completing

### Problem

**Priority**: Low  
**Severity**: Low - Affects 1-2 tests
**Tests Affected**: Action removal tests

After clicking delete on an action, the action count doesn't decrease.

### Root Cause

TBD - Action may not be removed from DOM, or dialog confirmation may not work

### Evidence

```
Expected: 0 (beforeCount - 1)
Received: 1
```

### Solution

**Status**: Not yet fixed

**Potential fixes**:
1. Ensure dialog is accepted
2. Wait for action to be removed from DOM
3. Check if delete button actually triggers deletion
4. Verify action is removed before counting

### Files Affected

- `tests/context-menu/dynamic-update.spec.js:103` - Remove action

---

## Issue #7: Context Menu Specs Don't Verify Real Menus

### Problem

**Priority**: High  
**Severity**: Medium – Affects 2 priority context-menu specs
**Tests Affected**: `tests/context-menu/shortcut-display.spec.js`, `tests/context-menu/dynamic-update.spec.js`

Automated “context menu” tests only assert form-field state inside `options.html`; they never open Chrome’s context menu or inspect entries registered by `background.js`. Regressions in menu rebuild logic would go unnoticed.

### Root Cause

- Tests interact solely with the options page DOM
- No instrumentation for `chrome.contextMenus` events
- Background service worker never exercised

### Solution

**Plan**:

1. Introduce a helper that listens for `chrome.contextMenus.onShown` and captures the rendered hierarchy.
2. Update the specs to trigger the menu (e.g., using `page.evaluate` to synthesize a right-click with selected text) and assert menu titles/actions/Run All entries.
3. Keep the existing UI assertions as supplemental checks.

**Blocked by**: Need lightweight mocking or plumbing to expose context-menu state from the service worker in Playwright.

### Files Requiring Fixes

- `tests/context-menu/shortcut-display.spec.js`
- `tests/context-menu/dynamic-update.spec.js`
- (Potential test helper) `tests/fixtures/extension.js`

---

## Issue #8: Action Execution Tests Stop at Form Configuration

### Problem

**Priority**: High  
**Severity**: High – Leaves core execution paths untested
**Tests Affected**: `tests/execution/action-execution.spec.js`, `tests/execution/runall-execute.spec.js`, shortcut suites that rely on execution

Current “execution” specs only verify that form fields accept inputs. They never trigger menu actions, keyboard shortcuts, or Run All, so `background.js`’s injection logic (`executeAction`, `runAllActions`, shortcut message handling) has zero coverage.

### Root Cause

- Tests focus on options-page configuration because injecting into chatgpt.com is non-trivial
- No harness to observe new tabs, prompt payloads, or auto-submit retries

### Solution

1. Add a mock or lightweight page in place of chatgpt.com that records received prompts and submission state.
2. Extend fixtures to capture messages sent from the background worker when actions fire.
3. Write new tests that:
   - Trigger context-menu actions
   - Trigger keyboard shortcuts (`EXECUTE_SHORTCUT`)
   - Assert prompts, auto-submit flags, retry behavior

### Files Requiring Fixes

- `tests/execution/action-execution.spec.js`
- `tests/execution/runall-execute.spec.js`
- `tests/shortcuts/*.spec.js` (add execution assertions once harness exists)

---

## Issue #9: Shortcut Conflict Test Title Mismatch

### Problem

**Priority**: Low  
**Severity**: Low – Causes confusion, hides real expectation
**Test Affected**: `tests/shortcuts/conflict-detection.spec.js` test “should allow same shortcut in different menus if both are disabled”

The test title claims disabled actions may share a shortcut, but the assertions still expect a conflict banner.

### Root Cause

- Title carried over from spec document
- Actual product behavior (disabled actions still register shortcuts) contradicts description

### Solution

1. Rename the test to reflect expected behavior (e.g., “should still flag conflict when disabled actions share shortcut”).
2. Update surrounding comments to avoid future misinterpretation.

### Files Requiring Fixes

- `tests/shortcuts/conflict-detection.spec.js`

---

## Issue #10: Weak UI Assertions & Heavy Reliance on waitForTimeout

### Problem

**Priority**: High  
**Severity**: Medium – Several tests give false confidence and are flaky
**Tests Affected**: `tests/ui/create-menu.spec.js`, `tests/ui/switch-menus.spec.js`, `tests/shortcuts/action-shortcuts.spec.js` (and others where `waitForTimeout` dominates)

Multiple tests only assert that values are non-empty (e.g., “unique default name” checks) and depend on arbitrary `waitForTimeout` calls instead of waiting for specific elements or events.

### Root Cause

- Initial triage focused on getting green runs under tight deadlines
- No shared wait helpers or deterministic UI signals

### Solution

1. Replace `waitForTimeout` with `expect`-based waits (`toBeVisible`, `toHaveText`, etc.).
2. Strengthen assertions to match acceptance criteria (e.g., verify menu names differ, dirty indicators appear, selection persists).
3. Introduce utility methods in fixtures for common waits and interactions.

### Files Requiring Fixes

- `tests/ui/create-menu.spec.js`
- `tests/ui/switch-menus.spec.js`
- `tests/shortcuts/action-shortcuts.spec.js`
- (General clean-up) any spec using repeated `waitForTimeout` without condition

---

## Issue #11: Validation Paths Lack Automated Coverage

### Problem

**Priority**: Medium  
**Severity**: Medium – Validation regressions go undetected
**Tests Affected**: None directly; missing coverage for:
- Placeholder URL guard (`"<<YOUR CUSTOM GPT URL>>"`)
- Duplicate shortcut errors surfaced via `showError`
- 10-menu limit enforcement and disabled add button

### Root Cause

- Tests rarely attempt invalid saves because persistence is hard to verify
- No dedicated negative tests following V3 validation contract

### Solution

1. Create targeted negative tests that attempt to save invalid configs and assert error banners/disabled UI state.
2. Link these tests to existing validation logic in `options.js`.

### Files Requiring Fixes

- New specs under `tests/ui` or `tests/edge-cases`
- Potential helper updates in `tests/fixtures/extension.js`

---

## Issue #12: Planned Suites Still Unimplemented

### Problem

**Priority**: High  
**Severity**: High – 20+ planned tests absent
**Areas Missing**: Migration (`tests/migration/*`), storage (`tests/storage/*`), several edge cases outlined in `docs/plans/testing-specification.md`

### Root Cause

- Feature shipped before Priority 2 test plan was executed
- No stubs or placeholder files were created, so gaps are easy to miss

### Solution

1. Prioritize building the migration unit tests to guard `config.js` logic.
2. Implement storage import/export specs, potentially with mocked `chrome.storage.sync` (persistence testing requires mocking).
3. Track progress directly in the planning doc as tests land.

### Files Requiring Fixes

- `tests/migration/*.spec.js` (new)
- `tests/storage/*.spec.js` (new)
- `tests/edge-cases/*.spec.js` (remaining cases)
- Update `docs/plans/testing-specification.md` statuses once implemented

---

## Test Statistics

### Before Fixes

- **Total Priority 2 tests**: 43
- **Passing**: 19 (44%)
- **Failing**: 24 (56%)

### Current Status

- **Total Priority 2 tests**: 43
- **Passing**: ~30-35 (estimated, needs verification)
- **Failing**: ~8-13 (estimated)

### Target

- **Passing**: 38+ (88%+)
- **Acceptable failures**: 5 or fewer (edge cases, known limitations)

---

## Testing Best Practices Learned

### Do's

1. ✅ **Test functionality without page reloads** when possible
2. ✅ **Use explicit waits** for async operations (saves, renders)
3. ✅ **Use `waitForSave()` helper** after save operations before checking sidebar updates
4. ✅ **Focus on user-visible behavior** rather than implementation details
5. ✅ **Verify elements exist before interacting** with them
6. ✅ **Add helpful console.log** statements to track test progress
7. ✅ **Use unique identifiers** (timestamps) for test data to avoid conflicts

### Don'ts

1. ❌ **Don't rely on chrome.storage persistence** in Playwright without mocking
2. ❌ **Don't assume immediate UI updates** after save operations
3. ❌ **Don't check auto-hiding elements** without timing consideration
4. ❌ **Don't use page.reload()** with persistent context and extensions
5. ❌ **Don't batch multiple assertions** without intermediate checks
6. ❌ **Don't ignore timing issues** - they're real in async UIs

---

## Next Steps

### Immediate (Priority 1)

1. [ ] Fix error banner tests (Issue #3)
   - Add wait for error banner
   - Verify conflict detection triggers

### Short Term (Priority 2)

4. [ ] Fix dialog handling (Issue #4)
   - Ensure dialogs are captured
   - Verify confirmation flow

5. [ ] Fix success banner tests (Issue #5)
   - Adjust timing or remove checks

6. [ ] Fix action deletion tests (Issue #6)
   - Verify deletion completes

### Long Term (Priority 3)

7. [ ] Implement chrome.storage mocking for proper persistence testing
8. [ ] Add integration tests that don't rely on UI interactions
9. [ ] Create test utilities for common operations (create menu, add action, etc.)
10. [ ] Add visual regression testing for UI changes

---

## Reference

### Useful Playwright Commands

```bash
# Run single test
npx playwright test path/to/test.spec.js:lineNumber

# Run with headed browser (see what's happening)
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Run with trace (detailed timeline)
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### Test File Locations

```
tests/
├── fixtures/
│   └── extension.js          # Custom fixtures for extension testing
├── ui/
│   ├── create-menu.spec.js   # Priority 1 ✅
│   ├── edit-menu-name.spec.js    # Priority 2 🔧
│   ├── delete-menu.spec.js       # Priority 2 🔧
│   ├── switch-menus.spec.js      # Priority 2 🔧
│   └── actions-per-menu.spec.js  # Priority 1 ✅
├── context-menu/
│   ├── multiple-menus.spec.js    # Priority 1 ✅
│   └── dynamic-update.spec.js    # Priority 2 🔧
├── execution/
│   ├── action-execution.spec.js  # Priority 1 ✅
│   └── runall-execute.spec.js    # Priority 2 🔧 (1 fixed)
└── shortcuts/
    ├── action-shortcuts.spec.js  # Priority 2 🔧
    └── conflict-detection.spec.js # Priority 2 🔧
```

Legend:
- ✅ Passing
- 🔧 Needs fixes
- ❌ Failing

---

**Last Updated**: 2025-11-01
