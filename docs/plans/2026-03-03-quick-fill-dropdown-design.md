# Quick Fill Dropdown Design

**Date:** 2026-03-03
**Feature:** Replace inline URL example links with a "Quick Fill" dropdown beside each URL input

---

## Goal

Replace the inline `(ChatGPT, ChatGPT Custom, ...)` link row in the menu-level AI Assistant URL field with a compact "Quick Fill" dropdown to the right of the input. Add the same dropdown to the per-action URL override field, disabled when the checkbox is unchecked.

---

## Layout

### Menu-level

```
AI Assistant URL * ⓘ  (default for all actions)
┌──────────────────────────────────────┐  [Quick Fill ▾]
│ https://chatgpt.com                  │
└──────────────────────────────────────┘
```

Label changes: add `(default for all actions)` as inline-hint after the ⓘ. Remove the existing `(<button>ChatGPT</button>, ...)` inline-hint span entirely.

### Action-level

```
☐  AI Assistant URL Override  (for this action only)
┌──────────────────────────────────────┐  [Quick Fill ▾]
│                                      │
└──────────────────────────────────────┘
```

- Dropdown disabled when checkbox is unchecked; enabled when checked.
- Inline-hint text changes from `(optional — overrides the menu URL for this action only)` to `(for this action only)`.

---

## Dropdown Options

| Label | URL populated |
|-------|--------------|
| ChatGPT | `https://chatgpt.com` |
| ChatGPT Custom | `https://chatgpt.com/g/<<your-gpt-id>>` |
| Gemini | `https://gemini.google.com/app` |
| Gemini Gems | `https://gemini.google.com/gem/<<your-gem-id>>` |
| Claude | `https://claude.ai` |
| Claude Project | `https://claude.ai/project/<<your-project-id>>` |

First option is a disabled placeholder: `— Quick Fill —` (value `""`).

---

## Behaviour

- Selecting an option fills the adjacent URL input with the option's URL value
- If the URL contains `<<…>>`, the placeholder text is selected after fill (same as current link behaviour)
- After fill, dropdown resets to the blank placeholder option
- Triggers `checkForChanges()` to enable the Save button
- Action dropdown: `disabled` attribute mirrors the `.action-custom-url-enabled` checkbox state — toggled by the existing checkbox `change` handler

---

## HTML Changes

### `options.html` — menu-level label (lines ~113–116)

Replace:
```html
<label for="customGptUrl">
  AI Assistant URL <span class="required">*</span>
  <button type="button" class="info-icon" ...>ⓘ</button>
  <span class="inline-hint">(<button class="url-example" ...>ChatGPT</button>, ...)</span>
</label>
<input type="url" id="customGptUrl" ... />
```

With:
```html
<label for="customGptUrl">
  AI Assistant URL <span class="required">*</span>
  <button type="button" class="info-icon" ...>ⓘ</button>
  <span class="inline-hint">(default for all actions)</span>
</label>
<div class="url-input-row">
  <input type="url" id="customGptUrl" ... />
  <select class="quick-fill-select" id="quickFillMenu" aria-label="Quick fill URL">
    <option value="" disabled selected>— Quick Fill —</option>
    <option value="https://chatgpt.com">ChatGPT</option>
    <option value="https://chatgpt.com/g/&lt;&lt;your-gpt-id&gt;&gt;">ChatGPT Custom</option>
    <option value="https://gemini.google.com/app">Gemini</option>
    <option value="https://gemini.google.com/gem/&lt;&lt;your-gem-id&gt;&gt;">Gemini Gems</option>
    <option value="https://claude.ai">Claude</option>
    <option value="https://claude.ai/project/&lt;&lt;your-project-id&gt;&gt;">Claude Project</option>
  </select>
</div>
```

### `options.html` — action template (lines ~238–250)

Replace inline-hint text and add `<div class="url-input-row">` wrapper + `<select class="quick-fill-select action-quick-fill" disabled>` after the URL input.

Replace hint: `(for this action only)`

---

## JS Changes (`options.js`)

### Remove
- The `document.querySelectorAll('.url-example').forEach(...)` block (~line 1638) — no longer needed.

### Add — menu-level quick fill handler (in `initializeUI` or equivalent)
```javascript
document.getElementById('quickFillMenu').addEventListener('change', (e) => {
  const url = e.target.value;
  if (!url) return;
  customGptUrlInput.value = url;
  e.target.value = '';  // reset to placeholder
  const start = url.indexOf('<<');
  const end = url.indexOf('>>') + 2;
  customGptUrlInput.focus();
  if (start !== -1) customGptUrlInput.setSelectionRange(start, end);
  checkForChanges();
});
```

### Add — action quick fill handler (in `attachActionEventListeners`)
```javascript
const quickFill = actionItem.querySelector('.action-quick-fill');
quickFill.addEventListener('change', (e) => {
  const url = e.target.value;
  if (!url) return;
  customUrlInput.value = url;
  e.target.value = '';
  const start = url.indexOf('<<');
  const end = url.indexOf('>>') + 2;
  customUrlInput.focus();
  if (start !== -1) customUrlInput.setSelectionRange(start, end);
  checkForChanges();
});
```

### Update — checkbox change handler
Add `quickFill.disabled = !customUrlCheckbox.checked;` in both branches of the existing checkbox handler in `attachActionEventListeners`.

### Update — `createActionElement`
Set `actionItem.querySelector('.action-quick-fill').disabled = !customUrlCheckbox.checked;` alongside the existing `customUrlInput.disabled` line.

---

## CSS

Add `.url-input-row { display: flex; gap: 8px; align-items: center; }` so input stretches and dropdown sits flush to the right. Input gets `flex: 1`.

---

## No Schema Change

No data is stored for the dropdown selection — it is purely a UI fill tool.
