# Quick Fill Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the inline URL example links on the menu-level AI Assistant URL field with a "Quick Fill" dropdown to the right of the input, and add the same dropdown to the per-action URL override field (disabled when the checkbox is unchecked).

**Architecture:** HTML gets a `.url-input-row` flex wrapper around each URL input + `<select class="quick-fill-select">` beside it. `options.js` removes the old `.url-example` click handler and adds `change` handlers for both selects. CSS adds the flex row and select styles. No schema changes — the dropdown is purely a UI fill tool, nothing is stored.

**Tech Stack:** Chrome MV3, vanilla JS, Playwright headless tests.

---

> All edits in the repo root. Run tests from repo root: `npx playwright test --reporter=list`

---

## Task 1: Failing tests — menu-level Quick Fill

**Files:**
- Create: `tests/ui/quick-fill.spec.js`

**Step 1: Write failing tests**

```javascript
// tests/ui/quick-fill.spec.js
import { test, expect } from '../fixtures/extension.js';

test.describe('Quick Fill Dropdown - Menu Level', () => {

  test('QF-01: Quick Fill dropdown is visible in the menu URL form', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#quickFillMenu')).toBeVisible();
  });

  test('QF-02: label shows "(default for all actions)" hint', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const labelText = await page.locator('label[for="customGptUrl"]').textContent();
    expect(labelText).toContain('default for all actions');
  });

  test('QF-03: old url-example buttons are gone', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    expect(await page.locator('.url-example').count()).toBe(0);
  });

  test('QF-04: selecting ChatGPT fills the URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#quickFillMenu').selectOption({ label: 'ChatGPT' });
    expect(await page.locator('#customGptUrl').inputValue()).toBe('https://chatgpt.com');
  });

  test('QF-05: selecting ChatGPT Custom fills field and resets dropdown', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#quickFillMenu').selectOption({ label: 'ChatGPT Custom' });
    const value = await page.locator('#customGptUrl').inputValue();
    expect(value).toContain('chatgpt.com/g/');
    expect(value).toContain('<<your-gpt-id>>');
    // Dropdown resets to blank placeholder after selection
    expect(await page.locator('#quickFillMenu').inputValue()).toBe('');
  });

  test('QF-06: all 6 provider options are present in the dropdown', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    const options = await page.locator('#quickFillMenu option').allTextContents();
    expect(options).toContain('ChatGPT');
    expect(options).toContain('ChatGPT Custom');
    expect(options).toContain('Gemini');
    expect(options).toContain('Gemini Gems');
    expect(options).toContain('Claude');
    expect(options).toContain('Claude Project');
  });

});
```

**Step 2: Run — expect all 6 to fail** (`#quickFillMenu` doesn't exist yet)
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add tests/ui/quick-fill.spec.js
git commit -m "test: add failing Quick Fill dropdown tests for menu-level URL field"
```

---

## Task 2: Implement options.html — menu-level Quick Fill

**Files:**
- Modify: `options.html`

**Step 1: Replace the label's inline-hint and wrap the input**

Find this block (lines ~113–123):
```html
              <label for="customGptUrl">
                AI Assistant URL <span class="required">*</span>
                <button type="button" class="info-icon" data-info="customGptUrlInfo" aria-label="Show information">ⓘ</button>
                <span class="inline-hint">(<button type="button" class="url-example" data-url="https://chatgpt.com">ChatGPT</button>, <button type="button" class="url-example" data-url="https://chatgpt.com/g/<<your-gpt-id>>">ChatGPT Custom</button>, <button type="button" class="url-example" data-url="https://gemini.google.com/app">Gemini</button>, <button type="button" class="url-example" data-url="https://gemini.google.com/gem/<<your-gem-id>>">Gemini Gems</button>, <button type="button" class="url-example" data-url="https://claude.ai">Claude</button>, or <button type="button" class="url-example" data-url="https://claude.ai/project/<<your-project-id>>">Claude Project</button>)</span>
              </label>
              <input
                type="url"
                id="customGptUrl"
                placeholder="https://chatgpt.com or https://gemini.google.com/app or https://claude.ai"
                required
              />
```

Replace with:
```html
              <label for="customGptUrl">
                AI Assistant URL <span class="required">*</span>
                <button type="button" class="info-icon" data-info="customGptUrlInfo" aria-label="Show information">ⓘ</button>
                <span class="inline-hint">(default for all actions)</span>
              </label>
              <div class="url-input-row">
                <input
                  type="url"
                  id="customGptUrl"
                  placeholder="https://chatgpt.com or https://gemini.google.com/app or https://claude.ai"
                  required
                />
                <select id="quickFillMenu" class="quick-fill-select" aria-label="Quick fill URL">
                  <option value="" disabled selected>— Quick Fill —</option>
                  <option value="https://chatgpt.com">ChatGPT</option>
                  <option value="https://chatgpt.com/g/<<your-gpt-id>>">ChatGPT Custom</option>
                  <option value="https://gemini.google.com/app">Gemini</option>
                  <option value="https://gemini.google.com/gem/<<your-gem-id>>">Gemini Gems</option>
                  <option value="https://claude.ai">Claude</option>
                  <option value="https://claude.ai/project/<<your-project-id>>">Claude Project</option>
                </select>
              </div>
```

**Step 2: Run menu-level tests — QF-01/02/03/06 should pass; QF-04/05 still fail (no JS handler yet)**
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add options.html
git commit -m "feat: add Quick Fill dropdown beside menu-level URL input, remove url-example links"
```

---

## Task 3: Implement options.js — menu-level Quick Fill handler

**Files:**
- Modify: `options.js`

**Step 1: Remove the old `.url-example` click handler block**

Find and delete this entire block (~lines 1637–1651):
```javascript
  // URL example links — fill field, select placeholder if present, close popup
  document.querySelectorAll('.url-example').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = btn.dataset.url;
      customGptUrlInput.value = url;
      const openPopup = document.querySelector('.info-popup.show');
      if (openPopup) closeInfoPopup(openPopup);
      customGptUrlInput.focus();
      const start = url.indexOf('<<');
      const end = url.indexOf('>>') + 2;
      if (start !== -1) customGptUrlInput.setSelectionRange(start, end);
      checkForChanges();
    });
  });
```

**Step 2: Add the Quick Fill change handler in its place**

```javascript
  // Quick Fill dropdown — fill menu URL field from preset
  document.getElementById('quickFillMenu').addEventListener('change', (e) => {
    const url = e.target.value;
    if (!url) return;
    customGptUrlInput.value = url;
    e.target.value = '';
    const openPopup = document.querySelector('.info-popup.show');
    if (openPopup) closeInfoPopup(openPopup);
    customGptUrlInput.focus();
    const start = url.indexOf('<<');
    const end = url.indexOf('>>') + 2;
    if (start !== -1) customGptUrlInput.setSelectionRange(start, end);
    checkForChanges();
  });
```

**Step 3: Run — all 6 menu-level tests should pass**
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 4: Commit**
```bash
git add options.js
git commit -m "feat: wire Quick Fill dropdown handler for menu-level URL field"
```

---

## Task 4: Add CSS for `.url-input-row` and `.quick-fill-select`

**Files:**
- Modify: `options.css`

**Step 1: Add after the `.shortcut-capture` block (~line 944)**

```css
/* Quick Fill URL row — input stretches, dropdown sits to the right */
.url-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input-row input {
  flex: 1;
}

.quick-fill-select {
  flex-shrink: 0;
  font-size: 13px;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.quick-fill-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Step 2: Run tests — still all pass**
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add options.css
git commit -m "style: add url-input-row flex layout and quick-fill-select styles"
```

---

## Task 5: Failing tests — action-level Quick Fill

**Files:**
- Modify: `tests/ui/quick-fill.spec.js` — append a second describe block

**Step 1: Append**

```javascript
test.describe('Quick Fill Dropdown - Action Level', () => {

  test('QF-07: action Quick Fill dropdown exists and is disabled when checkbox unchecked', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-07 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf07');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    const dropdown = page.locator('.action-quick-fill').first();
    await expect(dropdown).toBeVisible();
    expect(await dropdown.isDisabled()).toBe(true);
  });

  test('QF-08: action Quick Fill dropdown is enabled when checkbox is checked', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-08 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf08');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    expect(await page.locator('.action-quick-fill').first().isDisabled()).toBe(false);
  });

  test('QF-09: unchecking checkbox disables the action Quick Fill dropdown', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-09 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf09');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    await page.locator('.action-custom-url-enabled').first().uncheck();
    expect(await page.locator('.action-quick-fill').first().isDisabled()).toBe(true);
  });

  test('QF-10: selecting from action Quick Fill fills the action URL field', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#menuName').fill('QF-10 Menu');
    await page.locator('#customGptUrl').fill('https://chatgpt.com/g/g-qf10');
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    await page.locator('.action-custom-url-enabled').first().check();
    await page.locator('.action-quick-fill').first().selectOption({ label: 'Gemini' });
    expect(await page.locator('.action-custom-url').first().inputValue()).toBe('https://gemini.google.com/app');
    // Dropdown resets after selection
    expect(await page.locator('.action-quick-fill').first().inputValue()).toBe('');
  });

  test('QF-11: action label shows "(for this action only)" hint', async ({ extensionId, context }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForLoadState('networkidle');
    await page.locator('#add-menu').click();
    await page.waitForTimeout(300);
    await page.locator('#add-action').click();
    await page.waitForTimeout(200);
    const labelText = await page.locator('.action-item .form-group label').nth(2).textContent();
    expect(labelText).toContain('for this action only');
    expect(labelText).not.toContain('optional');
  });

});
```

**Step 2: Run — expect QF-07–11 to fail** (`.action-quick-fill` doesn't exist yet)
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add tests/ui/quick-fill.spec.js
git commit -m "test: add failing action-level Quick Fill dropdown tests"
```

---

## Task 6: Implement options.html — action template Quick Fill

**Files:**
- Modify: `options.html`

**Step 1: Replace the action URL override form-group in `<template id="action-template">`**

Find (lines ~238–251):
```html
        <div class="form-group">
          <label>
            <input type="checkbox" class="action-custom-url-enabled" />
            <span>AI Assistant URL Override
              <span class="inline-hint">(optional — overrides the menu URL for this action only)</span>
            </span>
          </label>
          <input
            type="url"
            class="action-custom-url"
            placeholder="Uses menu URL by default"
            disabled
          />
        </div>
```

Replace with:
```html
        <div class="form-group">
          <label>
            <input type="checkbox" class="action-custom-url-enabled" />
            <span>AI Assistant URL Override
              <span class="inline-hint">(for this action only)</span>
            </span>
          </label>
          <div class="url-input-row">
            <input
              type="url"
              class="action-custom-url"
              placeholder="Uses menu URL by default"
              disabled
            />
            <select class="quick-fill-select action-quick-fill" aria-label="Quick fill URL" disabled>
              <option value="" disabled selected>— Quick Fill —</option>
              <option value="https://chatgpt.com">ChatGPT</option>
              <option value="https://chatgpt.com/g/<<your-gpt-id>>">ChatGPT Custom</option>
              <option value="https://gemini.google.com/app">Gemini</option>
              <option value="https://gemini.google.com/gem/<<your-gem-id>>">Gemini Gems</option>
              <option value="https://claude.ai">Claude</option>
              <option value="https://claude.ai/project/<<your-project-id>>">Claude Project</option>
            </select>
          </div>
        </div>
```

**Step 2: Run action tests — QF-07/11 should pass; QF-08/09/10 still fail (no JS yet)**
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 3: Commit**
```bash
git add options.html
git commit -m "feat: add Quick Fill dropdown to action URL override template"
```

---

## Task 7: Implement options.js — action-level Quick Fill wiring

**Files:**
- Modify: `options.js` — two functions: `createActionElement` and `attachActionEventListeners`

**Step 1: Update `createActionElement`**

Find this line (~line 805):
```javascript
  customUrlInput.disabled = !customUrlCheckbox.checked;
```

Add immediately after it:
```javascript
  const quickFill = actionItem.querySelector('.action-quick-fill');
  quickFill.disabled = !customUrlCheckbox.checked;
```

**Step 2: Update `attachActionEventListeners`**

Find the existing checkbox/input block (~lines 864–876):
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

Replace with:
```javascript
  const customUrlCheckbox = actionItem.querySelector('.action-custom-url-enabled');
  const customUrlInput = actionItem.querySelector('.action-custom-url');
  const quickFill = actionItem.querySelector('.action-quick-fill');
  customUrlCheckbox.addEventListener('change', () => {
    if (customUrlCheckbox.checked) {
      customUrlInput.disabled = false;
      quickFill.disabled = false;
      customUrlInput.focus();
    } else {
      customUrlInput.value = '';
      customUrlInput.disabled = true;
      quickFill.disabled = true;
    }
    checkForChanges();
  });
  customUrlInput.addEventListener('input', checkForChanges);
  quickFill.addEventListener('change', (e) => {
    const url = e.target.value;
    if (!url) return;
    customUrlInput.value = url;
    e.target.value = '';
    customUrlInput.focus();
    const start = url.indexOf('<<');
    const end = url.indexOf('>>') + 2;
    if (start !== -1) customUrlInput.setSelectionRange(start, end);
    checkForChanges();
  });
```

**Step 3: Run — all 11 Quick Fill tests should pass**
```bash
npx playwright test tests/ui/quick-fill.spec.js --reporter=list
```

**Step 4: Commit**
```bash
git add options.js
git commit -m "feat: wire action-level Quick Fill dropdown — enable/disable with checkbox, fill on select"
```

---

## Task 8: Full suite verification + final commit

**Step 1: Run all tests**
```bash
npx playwright test --reporter=list
```
Expected: all tests pass. The pre-existing smoke test failure (`"ChatGPT"` in title from v4.0.0 rename) may be ignored if it appears.

**Step 2: Final commit**
```bash
git add docs/plans/
git commit -m "feat: Quick Fill dropdown complete

- options.html: replace url-example links with Quick Fill dropdown beside
  menu URL input; add same dropdown (disabled by default) beside action
  URL override input; update hint text on both
- options.js: replace url-example handler with quickFillMenu change handler;
  wire action-quick-fill in createActionElement + attachActionEventListeners
- options.css: url-input-row flex layout + quick-fill-select styles
- tests: QF-01–11 covering menu and action Quick Fill behaviour"
```

---

## Critical Files

| File | Change |
|------|--------|
| `options.html` | Replace url-example links with `<select id="quickFillMenu">` in `.url-input-row`; update action template with `.action-quick-fill` select |
| `options.js` | Remove `.url-example` handler; add `#quickFillMenu` change handler; update `createActionElement` + `attachActionEventListeners` |
| `options.css` | Add `.url-input-row`, `.url-input-row input`, `.quick-fill-select`, `.quick-fill-select:disabled` |
| `tests/ui/quick-fill.spec.js` | New: QF-01–11 tests |
