# Per-Action URL Override Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow each action (menu item) to optionally override the menu-level AI assistant URL, falling back to the menu URL when absent.

**Architecture:** Add optional `customGptUrl` to the action schema — no version bump needed since it's a backward-compatible additive field. `executeAction()` in `background.js` derives `effectiveUrl = action.customGptUrl || menu.customGptUrl`. The options UI adds a URL input per action showing the menu URL as placeholder.

**Tech Stack:** Chrome MV3, `chrome.storage.sync`, Playwright tests (headless), vanilla JS.

---

## Setup

**Step 1: Create worktree**
```bash
cd /Users/keithfry/projects/chatgpt-query-extension
git worktree add worktree/per-menu-url-feature -b feature/per-menu-url-feature
```

**Step 2: Link node_modules**
```bash
ln -sf /Users/keithfry/projects/chatgpt-query-extension/node_modules \
  /Users/keithfry/projects/chatgpt-query-extension/worktree/per-menu-url-feature/node_modules
```

**Step 3: Copy plan to docs/plans/**
```bash
mkdir -p worktree/per-menu-url-feature/docs/plans
cp /Users/keithfry/.claude/plans/drifting-strolling-rose.md \
  worktree/per-menu-url-feature/docs/plans/2026-03-03-per-action-url-override.md
```

---

## Migration Strategy

**No version bump required.** `action.customGptUrl` is optional — absent on all existing V3 actions. The validator only checks it when present and non-empty. Old configs validate cleanly and fall back to `menu.customGptUrl` via the `||` operator. `undefined || menuUrl` and `"" || menuUrl` both resolve to `menuUrl`.

> All work is done inside `worktree/per-menu-url-feature/`. Run tests from repo root: `npx playwright test --reporter=list`

---

## Task 1: Failing tests — config validation

**Files:**
- Create: `tests/execution/action-url-override.spec.js`

**Step 1: Write failing tests**

```javascript
// tests/execution/action-url-override.spec.js
import { test, expect } from '../fixtures/extension.js';

test.describe('Action URL Override - Config Validation', () => {

  test('CONF-01: absent action URL saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-01 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf01');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('No Override');
    await page.locator('.action-prompt').first().fill('Summarize:');
    // action URL field left blank
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('CONF-02: valid chatgpt.com action URL saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-02 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf02-menu');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('GPT Override');
    await page.locator('.action-prompt').first().fill('Explain:');
    await page.locator('.action-custom-url').first().fill('https://chatgpt.com/g/g-conf02-action');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('CONF-03: valid gemini.google.com action URL saves without error', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf03');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Gemini Override');
    await page.locator('.action-prompt').first().fill('Translate:');
    await page.locator('.action-custom-url').first().fill('https://gemini.google.com/app');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
  });

  test('CONF-04: disallowed action URL domain is rejected', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Conf-04 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-conf04');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Bad Override');
    await page.locator('.action-prompt').first().fill('Hack:');
    await page.locator('.action-custom-url').first().fill('https://evil.com/steal');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeVisible();
  });

});
```

**Step 2: Run — expect all to fail** (`.action-custom-url` doesn't exist yet)
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add tests/execution/action-url-override.spec.js
git commit -m "test: add failing config validation tests for action.customGptUrl"
```

---

## Task 2: Implement config validation

**Files:**
- Modify: `config.js` — inside `validateV3Config`, in the `menu.actions.forEach` loop, after the shortcut validation block

**Step 1: Add validation block**

Find the shortcut validation block ending with `}` (something like `if (action.shortcut && ...) { ... }`).
Insert immediately after it:

```javascript
// Optional per-action URL override validation
if (action.customGptUrl && action.customGptUrl.trim()) {
  if (!ALLOWED_MENU_URL_PREFIXES.some(prefix => action.customGptUrl.startsWith(prefix))) {
    errors.push(`${actionLabel}: Action URL override must start with https://chatgpt.com or https://gemini.google.com`);
  }
}
```

> Note: `ALLOWED_MENU_URL_PREFIXES` is already defined in scope in `validateV3Config`.

**Step 2: Run tests — CONF-01 and CONF-04 pass; CONF-02/03 still fail (UI not built yet)**
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add config.js
git commit -m "feat: validate optional action.customGptUrl in validateV3Config"
```

---

## Task 3: Failing tests — URL routing via storage

**Files:**
- Modify: `tests/execution/action-url-override.spec.js` — add a second `describe` block

**Step 1: Append routing tests**

```javascript
test.describe('Action URL Override - URL Routing', () => {

  test('ROUTE-01: action without URL uses menu URL', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const menuUrl = 'https://chatgpt.com/g/g-route01-menu';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Route-01 Menu');
    await page.locator('#customGptUrl').fill(menuUrl);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Route01');
    await page.locator('.action-prompt').first().fill('p:');
    // leave .action-custom-url blank
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(300);
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({config}) => r(config))));
    const menu = cfg.menus.find(m => m.name === 'Route-01 Menu');
    const action = menu.actions[0];
    const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim()) ? action.customGptUrl.trim() : menu.customGptUrl;
    expect(effectiveUrl).toBe(menuUrl);
  });

  test('ROUTE-02: action with URL uses action URL', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const menuUrl = 'https://chatgpt.com/g/g-route02-menu';
    const actionUrl = 'https://chatgpt.com/g/g-route02-action';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('Route-02 Menu');
    await page.locator('#customGptUrl').fill(menuUrl);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('Route02');
    await page.locator('.action-prompt').first().fill('p:');
    await page.locator('.action-custom-url').first().fill(actionUrl);
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(300);
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({config}) => r(config))));
    const menu = cfg.menus.find(m => m.name === 'Route-02 Menu');
    const action = menu.actions[0];
    expect(action.customGptUrl).toBe(actionUrl);
    const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim()) ? action.customGptUrl.trim() : menu.customGptUrl;
    expect(effectiveUrl).toBe(actionUrl);
    expect(effectiveUrl).not.toBe(menuUrl);
  });

});
```

**Step 2: Run — ROUTE-02 fails (`.action-custom-url` not in UI)**
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add tests/execution/action-url-override.spec.js
git commit -m "test: add failing URL routing tests for action.customGptUrl"
```

---

## Task 4: Implement background.js URL routing

**Files:**
- Modify: `background.js` — `executeAction()` function (~lines 367–408)

**Step 1: Add `effectiveUrl` derivation**

At the top of `executeAction`, after the `const prompt = ...` line, add:

```javascript
// Per-action URL override: action.customGptUrl takes precedence over menu.customGptUrl
const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim())
  ? action.customGptUrl.trim()
  : menu.customGptUrl;
```

**Step 2: Replace all `menu.customGptUrl` references inside `executeAction` with `effectiveUrl`**

There are ~6 occurrences in `executeAction` (passed to `openOrFocusGptTab`, `tryInjectWithTiming`, and the fallback `chrome.tabs.create`). Replace each one.

**Step 3: Run tests**
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```

**Step 4: Run full suite — no regressions**
```bash
npx playwright test --reporter=list
```

**Step 5: Commit**
```bash
git add background.js
git commit -m "feat: derive effectiveUrl in executeAction to support action-level URL override"
```

---

## Task 5: Failing tests — options UI

**Files:**
- Create: `tests/ui/action-url-field.spec.js`

**Step 1: Write failing tests**

```javascript
// tests/ui/action-url-field.spec.js
import { test, expect } from '../fixtures/extension.js';

test.describe('Action URL Override - Options UI', () => {

  test('UI-01: .action-custom-url input is visible for each action', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-01 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-ui01');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await expect(page.locator('.action-custom-url').first()).toBeVisible();
  });

  test('UI-02: placeholder shows the menu URL', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const menuUrl = 'https://chatgpt.com/g/g-ui02';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-02 Menu');
    await page.locator('#customGptUrl').fill(menuUrl);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    const placeholder = await page.locator('.action-custom-url').first().getAttribute('placeholder');
    expect(placeholder).toContain(menuUrl);
  });

  test('UI-03: value persists after save and reload', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const actionUrl = 'https://chatgpt.com/g/g-ui03-action';
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-ui03-menu');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('UI03 Action');
    await page.locator('.action-prompt').first().fill('p:');
    await page.locator('.action-custom-url').first().fill(actionUrl);
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe(actionUrl);
  });

  test('UI-04: clearing value saves empty (falls back to menu URL)', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('UI-04 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-ui04-menu');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-title').first().fill('UI04 Action');
    await page.locator('.action-prompt').first().fill('p:');
    await page.locator('.action-custom-url').first().fill('https://chatgpt.com/g/g-ui04-action');
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await page.locator('.action-custom-url').first().clear();
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe('');
  });

});
```

**Step 2: Run — all 4 fail**
```bash
npx playwright test tests/ui/action-url-field.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add tests/ui/action-url-field.spec.js
git commit -m "test: add failing UI tests for action-level URL input field"
```

---

## Task 6: Implement options UI

### 6a — `options.html`: add input to action template

**File:** `options.html`

Inside `<template id="action-template">`, in `<div class="action-body">`, after the prompt `form-group` div and before the shortcut group, add:

```html
      <div class="form-group">
        <label>AI Assistant URL Override
          <span class="inline-hint">(optional — overrides the menu URL for this action only)</span>
        </label>
        <input
          type="url"
          class="action-custom-url"
          placeholder="Uses menu URL by default"
        />
      </div>
```

### 6b — `options.js`: bind the field

**File:** `options.js`

**Change 1 — `createActionElement`**: after `enabledCheckbox.checked = action.enabled;`
```javascript
const customUrlInput = actionItem.querySelector('.action-custom-url');
customUrlInput.value = action.customGptUrl || '';
// Show the menu URL as placeholder so user knows the fallback
const currentMenu = currentConfig.menus.find(m => m.id === selectedMenuId);
if (currentMenu?.customGptUrl) {
  customUrlInput.placeholder = `Default: ${currentMenu.customGptUrl}`;
}
```

**Change 2 — `syncFormToConfig`**: in the `actionItems.forEach` block, add `customGptUrl` to the pushed action object:
```javascript
customGptUrl: (item.querySelector('.action-custom-url')?.value || '').trim(),
```

**Change 3 — `captureFormState`**: same as Change 2 (add `customGptUrl` to the captured state's action object).

**Change 4 — `compareFormStates`**: in the per-action comparison loop, add:
```javascript
if (a1.customGptUrl !== a2.customGptUrl) return true;
```

**Change 5 — `attachActionEventListeners`**: add dirty tracking:
```javascript
actionItem.querySelector('.action-custom-url').addEventListener('input', checkForChanges);
```

**Change 6 — `handleAddAction`**: include `customGptUrl: ''` in the new action object.

**Step 1: Run UI tests — all 4 pass**
```bash
npx playwright test tests/ui/action-url-field.spec.js --reporter=list
```

**Step 2: Run config/routing tests — all pass**
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add options.html options.js
git commit -m "feat: add action-level URL override input to options UI"
```

---

## Task 7: Backward compatibility test

**Files:**
- Modify: `tests/execution/action-url-override.spec.js` — append a third `describe` block

**Step 1: Append test**

```javascript
test.describe('Action URL Override - Backward Compatibility', () => {

  test('COMPAT-01: legacy V3 config (no action.customGptUrl) loads and saves cleanly', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');

    // Inject a raw V3 config with no customGptUrl on the action
    const menuUrl = 'https://chatgpt.com/g/g-legacy-compat';
    await page.evaluate((menuUrl) => {
      const legacyConfig = {
        version: 3,
        menus: [{
          id: 'menu_legacy_compat',
          name: 'Legacy Menu',
          customGptUrl: menuUrl,
          autoSubmit: true,
          runAllEnabled: false,
          runAllShortcut: '',
          order: 1,
          actions: [{
            id: 'action_legacy_compat',
            title: 'Legacy Action',
            prompt: 'Summarize:',
            shortcut: '',
            enabled: true,
            order: 1
            // NO customGptUrl field
          }]
        }],
        globalSettings: { gptTitleMatch: 'ChatGPT', clearContext: true }
      };
      return new Promise(resolve => chrome.storage.sync.set({ config: legacyConfig }, resolve));
    }, menuUrl);

    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Page loaded without error
    await expect(page.locator('#error-banner')).toBeHidden();

    // Action URL field is present and empty
    const urlField = page.locator('.action-custom-url').first();
    await expect(urlField).toBeVisible();
    expect(await urlField.inputValue()).toBe('');

    // Save succeeds
    await page.locator('#save').click();
    await page.waitForTimeout(500);
    await expect(page.locator('#error-banner')).toBeHidden();

    // effectiveUrl resolves to menu URL
    const cfg = await page.evaluate(() => new Promise(r => chrome.storage.sync.get('config', ({config}) => r(config))));
    const action = cfg.menus[0].actions[0];
    const effectiveUrl = (action.customGptUrl && action.customGptUrl.trim()) ? action.customGptUrl.trim() : cfg.menus[0].customGptUrl;
    expect(effectiveUrl).toBe(menuUrl);
  });

});
```

**Step 2: Run**
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```
Expected: all CONF, ROUTE, COMPAT tests pass.

**Step 3: Commit**
```bash
git add tests/execution/action-url-override.spec.js
git commit -m "test: add backward compatibility test for V3 configs without action.customGptUrl"
```

---

## Task 8: Full suite verification

**Step 1: Run all tests**
```bash
npx playwright test --reporter=list
```
Expected: all pre-existing tests pass + new tests green. Zero regressions.

**Step 2: Final summary commit**
```bash
git add docs/plans/
git commit -m "feat: per-action URL override complete

- config.js: validate optional action.customGptUrl
- background.js: effectiveUrl = action.customGptUrl || menu.customGptUrl
- options.html/js: .action-custom-url input field per action
- tests: CONF, ROUTE, UI, COMPAT test suites"
```

---

## Out of Scope (future work)
- `runAllActions()` currently uses `menu.customGptUrl` for all actions. Per-action URLs in run-all is a separate feature.

---

## Critical Files

| File | Change |
|------|--------|
| `config.js` | Add 4-line block in `validateV3Config` action loop after shortcut validation |
| `background.js` | Add `effectiveUrl` in `executeAction`; replace ~6 `menu.customGptUrl` references |
| `options.html` | Add `<input class="action-custom-url">` form-group in action template |
| `options.js` | Bind field in `createActionElement`, `syncFormToConfig`, `captureFormState`, `compareFormStates`, `attachActionEventListeners`, `handleAddAction` |
| `tests/execution/action-url-override.spec.js` | New: CONF + ROUTE + COMPAT tests |
| `tests/ui/action-url-field.spec.js` | New: UI visibility/persistence tests |

---

## Session Status (2026-03-03, interrupted)

### Completed (committed)
- ✅ Task 1: `tests/execution/action-url-override.spec.js` created with CONF tests (commit `b3d9b37`)
- ✅ Task 2: `config.js` validation for `action.customGptUrl` (commit `adf3aff`)
- ✅ Task 3+7: ROUTE and COMPAT tests appended to spec file (included in commits)
- ✅ Task 4: `background.js` `effectiveUrl` derivation (commit `0db745d`)
- ✅ Task 5: `tests/ui/action-url-field.spec.js` created with UI-01–04 tests (commit `5759f59`)

### In Progress (uncommitted, in worktree)
- 🔧 Task 6: `options.html` + `options.js` UI implementation — **done but NOT committed**

  **Two bugs fixed during Task 6 (not in original plan):**
  1. `handleSave()` (~line 1238) was missing `customGptUrl` from action objects it builds — added:
     ```javascript
     customGptUrl: (item.querySelector('.action-custom-url')?.value || '').trim()
     ```
  2. `createActionElement()` placeholder used stale `currentConfig` instead of live `#customGptUrl` input — fixed to:
     ```javascript
     const menuUrlForPlaceholder = customGptUrlInput.value.trim() ||
       currentConfig.menus.find(m => m.id === selectedMenuId)?.customGptUrl || '';
     ```
  3. `tests/ui/action-url-field.spec.js` UI-03 and UI-04 second reload changed from `page.goto(options.html)` to `page.reload()` (same-page reload works; second goto to a chrome-extension:// URL causes the page to hang/crash).

### Current test results
- `execution/action-url-override.spec.js` — **7/7 pass** (CONF-01–04, ROUTE-01–02, COMPAT-01)
- `ui/action-url-field.spec.js` — **2/4 pass** (UI-01 ✅, UI-02 ✅, UI-03 ❌, UI-04 ❌)

### Remaining blocker: UI-03 and UI-04
Both fail with `Test timeout of 15000ms exceeded` → `locator.inputValue: Target page, context or browser has been closed`.

The page becomes blank/unresponsive after `page.reload()` + `waitForLoadState('networkidle')` following a save. Switching from `page.goto()` to `page.reload()` did not fix it.

**Investigation so far:**
- Each test has its own isolated browser context (fresh `userDataDir`), so cross-test storage contamination is ruled out
- The save operation itself succeeds (no error banner, execution tests prove save+reload works via `page.evaluate` checks)
- The blank screenshot suggests the page is simply not rendering after reload
- Existing tests that check persistence (like `edit-menu-name.spec.js`) use the `optionsPage` fixture and `waitForSave()` helper rather than raw `page.reload()`

**Next step to try:** Rewrite UI-03 and UI-04 using the `optionsPage` fixture + `waitForSave()` + `optionsPage.reloadOptions()` pattern, as used by `edit-menu-name.spec.js`. Example:
```javascript
test('UI-03: value persists after save and reload', async ({ extensionId, context, optionsPage }) => {
  // ... set up ...
  await optionsPage.locator('#save').click();
  await optionsPage.waitForSave();
  await optionsPage.reloadOptions();
  expect(await optionsPage.locator('.action-custom-url').first().inputValue()).toBe(actionUrl);
});
```
Note: `optionsPage` fixture opens its own page at options.html — the test should not call `context.newPage()` or `page.goto()` separately.

### What remains after fixing UI-03/04
- Commit Task 6: `git add options.html options.js tests/ui/action-url-field.spec.js && git commit -m "feat: add action-level URL override input to options UI"`
- Task 8: Run full suite (`npx playwright test --reporter=list` from worktree dir), then final summary commit of `docs/plans/`
