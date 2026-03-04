# Action URL Override Checkbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a checkbox to the per-action URL override field so the field is disabled/cleared when unchecked and enabled when checked; unchecked actions write `customGptUrl: ''` to JSON.

**Architecture:** HTML template gets a `<input type="checkbox" class="action-custom-url-enabled">` beside the label; `options.js` wires checkbox ↔ input in `createActionElement` and `attachActionEventListeners`; all three save paths (`syncFormToConfig`, `captureFormState`, `handleSave`) gate the URL value on checkbox state.

**Tech Stack:** Chrome MV3, vanilla JS, Playwright headless tests.

---

> All edits in `worktree/per-menu-url-feature/`. Run tests from worktree root: `npx playwright test --reporter=list`

---

## Task 1: Failing tests — checkbox behaviour

**Files:**
- Modify: `tests/ui/action-url-field.spec.js`

**Step 1: Replace UI-03 / UI-04 assertions and append CB-01–03**

Open `tests/ui/action-url-field.spec.js`. Make these changes:

**Change 1 — UI-03** (line 72): add checkbox assertion before the inputValue check:
```javascript
    expect(await page.locator('.action-custom-url-enabled').first().isChecked()).toBe(true);
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe(actionUrl);
```

**Change 2 — UI-04** (after the `inputValue` assertion at line 111): add:
```javascript
    expect(await page.locator('.action-custom-url-enabled').first().isChecked()).toBe(false);
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(true);
```

**Change 3 — Append three new tests inside the describe block** (before the closing `});`):

```javascript
  test('CB-01: new action renders with checkbox unchecked and field disabled', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('CB-01 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-cb01');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    expect(await page.locator('.action-custom-url-enabled').first().isChecked()).toBe(false);
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(true);
  });

  test('CB-02: checking checkbox enables the URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('CB-02 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-cb02');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(false);
    expect(await page.locator('.action-custom-url').first().isEnabled()).toBe(true);
  });

  test('CB-03: unchecking checkbox clears and disables the URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('CB-03 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-cb03');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    // Enable and fill
    await page.locator('.action-custom-url-enabled').first().check();
    await page.locator('.action-custom-url').first().fill('https://chatgpt.com/g/g-cb03-action');
    // Now uncheck
    await page.locator('.action-custom-url-enabled').first().uncheck();
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe('');
    expect(await page.locator('.action-custom-url').first().isDisabled()).toBe(true);
  });
```

**Step 2: Run — expect all CB tests to fail, UI-03/04 to fail on checkbox assertions**
```bash
npx playwright test tests/ui/action-url-field.spec.js --reporter=list
```
Expected: CB-01/02/03 fail (`action-custom-url-enabled` not found); UI-03/04 extra assertions fail.

**Step 3: Commit**
```bash
git add tests/ui/action-url-field.spec.js
git commit -m "test: add failing checkbox behaviour tests for action URL override"
```

---

## Task 2: Implement options.html — add checkbox to action template

**Files:**
- Modify: `options.html`

**Step 1: Replace the URL override form-group in the action template**

Find this block (around line 238–247):
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

Replace with:
```html
        <div class="form-group">
          <label>
            <input type="checkbox" class="action-custom-url-enabled" />
            AI Assistant URL Override
            <span class="inline-hint">(optional — overrides the menu URL for this action only)</span>
          </label>
          <input
            type="url"
            class="action-custom-url"
            placeholder="Uses menu URL by default"
            disabled
          />
        </div>
```

**Step 2: Run UI tests — CB-01 should now pass; CB-02/03 still fail (no JS); CONF-02/03/04 and ROUTE-02 now fail because the field is disabled**
```bash
npx playwright test tests/ui/action-url-field.spec.js tests/execution/action-url-override.spec.js --reporter=list
```
Expected: CB-01 ✅, CB-02/03 ❌, CONF-02/03/04 ❌, ROUTE-02 ❌.

**Step 3: Commit**
```bash
git add options.html
git commit -m "feat: add checkbox to action URL override field, default disabled"
```

---

## Task 3: Implement options.js — createActionElement + attachActionEventListeners

**Files:**
- Modify: `options.js`

**Step 1: Update `createActionElement`**

Find the block starting at ~line 797:
```javascript
  const customUrlInput = actionItem.querySelector('.action-custom-url');
  customUrlInput.value = action.customGptUrl || '';
  // Show the menu URL as placeholder — prefer the live form value over stored config
  const menuUrlForPlaceholder = customGptUrlInput.value.trim() ||
    currentConfig.menus.find(m => m.id === selectedMenuId)?.customGptUrl || '';
  if (menuUrlForPlaceholder) {
    customUrlInput.placeholder = `Default: ${menuUrlForPlaceholder}`;
  }
```

Replace with:
```javascript
  const customUrlCheckbox = actionItem.querySelector('.action-custom-url-enabled');
  const customUrlInput = actionItem.querySelector('.action-custom-url');
  customUrlCheckbox.checked = !!(action.customGptUrl);
  customUrlInput.value = action.customGptUrl || '';
  customUrlInput.disabled = !customUrlCheckbox.checked;
  // Show the menu URL as placeholder — prefer the live form value over stored config
  const menuUrlForPlaceholder = customGptUrlInput.value.trim() ||
    currentConfig.menus.find(m => m.id === selectedMenuId)?.customGptUrl || '';
  if (menuUrlForPlaceholder) {
    customUrlInput.placeholder = `Default: ${menuUrlForPlaceholder}`;
  }
```

**Step 2: Update `attachActionEventListeners`**

Find this line (~line 857):
```javascript
  actionItem.querySelector('.action-custom-url').addEventListener('input', checkForChanges);
```

Replace with:
```javascript
  const customUrlCheckbox = actionItem.querySelector('.action-custom-url-enabled');
  const customUrlInput = actionItem.querySelector('.action-custom-url');
  customUrlCheckbox.addEventListener('change', () => {
    if (customUrlCheckbox.checked) {
      customUrlInput.disabled = false;
      customUrlInput.focus();
    } else {
      customUrlInput.value = '';
      customUrlInput.disabled = true;
    }
    checkForChanges();
  });
  customUrlInput.addEventListener('input', checkForChanges);
```

**Step 3: Run UI tests — all 7 should pass**
```bash
npx playwright test tests/ui/action-url-field.spec.js --reporter=list
```
Expected: UI-01/02/03/04 ✅, CB-01/02/03 ✅

**Step 4: Commit**
```bash
git add options.js
git commit -m "feat: wire checkbox to enable/disable/clear action URL override field"
```

---

## Task 4: Implement options.js — gate customGptUrl on checkbox in all save paths

**Files:**
- Modify: `options.js` — three locations

**Step 1: Update `syncFormToConfig` (~line 400)**

Find:
```javascript
      customGptUrl: (item.querySelector('.action-custom-url')?.value || '').trim()
```
Replace with:
```javascript
      customGptUrl: item.querySelector('.action-custom-url-enabled')?.checked
        ? (item.querySelector('.action-custom-url')?.value || '').trim()
        : ''
```

**Step 2: Update `captureFormState` (~line 428)**

Find:
```javascript
      customGptUrl: (item.querySelector('.action-custom-url')?.value || '').trim()
```
Replace with:
```javascript
      customGptUrl: item.querySelector('.action-custom-url-enabled')?.checked
        ? (item.querySelector('.action-custom-url')?.value || '').trim()
        : ''
```

**Step 3: Update `handleSave` (~line 1247)**

Find:
```javascript
        customGptUrl: (item.querySelector('.action-custom-url')?.value || '').trim()
```
Replace with:
```javascript
        customGptUrl: item.querySelector('.action-custom-url-enabled')?.checked
          ? (item.querySelector('.action-custom-url')?.value || '').trim()
          : ''
```

**Step 4: Run execution tests**
```bash
npx playwright test tests/execution/action-url-override.spec.js --reporter=list
```
Expected: CONF-01 ✅, CONF-04 ✅; CONF-02/03 ❌ (still need checkbox click in test), ROUTE-01 ✅, ROUTE-02 ❌, COMPAT-01 ✅.

**Step 5: Commit**
```bash
git add options.js
git commit -m "feat: gate customGptUrl on checkbox state in all save paths"
```

---

## Task 5: Update existing tests that fill .action-custom-url directly

Tests that fill `.action-custom-url` must first check the checkbox (field is disabled by default).

**Files:**
- Modify: `tests/execution/action-url-override.spec.js`

**Step 1: Update CONF-02, CONF-03, CONF-04**

For each of CONF-02, CONF-03, CONF-04 — find the line that fills `.action-custom-url`:
```javascript
    await page.locator('.action-custom-url').first().fill('...');
```
Prepend it with:
```javascript
    await page.locator('.action-custom-url-enabled').first().check();
```

**CONF-02** (around line 37): add check before the fill of `'https://chatgpt.com/g/g-conf02-action'`

**CONF-03** (around line 55): add check before the fill of `'https://gemini.google.com/app'`

**CONF-04** (around line 73): add check before the fill of `'https://evil.com/steal'`

**Step 2: Update ROUTE-02**

Find the line (~line 121) that fills `.action-custom-url` with `actionUrl`. Prepend:
```javascript
    await page.locator('.action-custom-url-enabled').first().check();
```

**Step 3: Run all action-url tests**
```bash
npx playwright test tests/execution/action-url-override.spec.js tests/ui/action-url-field.spec.js --reporter=list
```
Expected: all 11 tests pass.

**Step 4: Commit**
```bash
git add tests/execution/action-url-override.spec.js
git commit -m "test: update CONF-02/03/04 and ROUTE-02 to enable checkbox before filling URL field"
```

---

## Task 6: Full suite verification

**Step 1: Run all tests**
```bash
npx playwright test --reporter=list
```
Expected: all pre-existing tests pass + new tests green. The one pre-existing failure in `smoke.spec.js` (checks for "ChatGPT" in title — the app was renamed to "AI Custom Prompts" in v4.0.0) is unrelated to this feature and may be ignored.

**Step 2: Final commit**
```bash
git add docs/plans/
git commit -m "feat: action URL override checkbox complete

- options.html: checkbox beside URL override label, input disabled by default
- options.js: createActionElement sets checked/disabled from stored value;
  attachActionEventListeners toggles disabled and clears on uncheck;
  syncFormToConfig/captureFormState/handleSave gate URL on checkbox state
- tests: CB-01/02/03 checkbox behaviour; UI-03/04 updated; CONF/ROUTE updated"
```

---

## Critical Files

| File | Change |
|------|--------|
| `options.html` | Add `<input type="checkbox" class="action-custom-url-enabled">` in action template label; add `disabled` to URL input |
| `options.js` — `createActionElement` | Set `customUrlCheckbox.checked`, `customUrlInput.disabled` from `action.customGptUrl` |
| `options.js` — `attachActionEventListeners` | Checkbox `change` handler: enable/focus or clear/disable URL input |
| `options.js` — `syncFormToConfig` / `captureFormState` / `handleSave` | Gate URL value on checkbox state |
| `tests/ui/action-url-field.spec.js` | Add CB-01/02/03; update UI-03/04 assertions |
| `tests/execution/action-url-override.spec.js` | Add checkbox enable before URL fill in CONF-02/03/04, ROUTE-02 |
