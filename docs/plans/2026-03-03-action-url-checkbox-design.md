# Action URL Override — Checkbox Toggle Design

**Date:** 2026-03-03
**Feature:** Add enable/disable checkbox to the per-action URL override field

---

## Goal

Add a checkbox next to the "AI Assistant URL Override" input in the action template so users can explicitly opt in to overriding the menu URL. The field is disabled and empty when unchecked; enabled when checked.

---

## Schema

No version bump. `action.customGptUrl` remains an optional string field in V3. The checkbox is purely a UI affordance:
- Checked + value → `customGptUrl: "<url>"` written to JSON
- Unchecked → `customGptUrl: ""` written to JSON (same as current default)

---

## UI Behaviour

| Condition | Checkbox | Input |
|---|---|---|
| JSON `customGptUrl` non-empty | checked | enabled, shows value |
| JSON `customGptUrl` empty/absent | unchecked | disabled, empty |
| User unchecks | — | clears value, disables input |
| User checks | — | enables input, focuses it |

---

## HTML Change (action template in `options.html`)

Replace the current label/input block with:

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

---

## JS Changes (`options.js`)

### `createActionElement`
- Set `customUrlCheckbox.checked = !!(action.customGptUrl)`
- Set `customUrlInput.value = action.customGptUrl || ''`
- Set `customUrlInput.disabled = !customUrlCheckbox.checked`
- Attach `change` listener on checkbox: toggle `disabled`, clear value if unchecking, focus if checking

### `syncFormToConfig` / `handleSave` / `captureFormState`
- Read `customGptUrl` only when checkbox is checked: `checkbox.checked ? input.value.trim() : ''`

### `compareFormStates`
- Compare both checkbox state and url value (already compares `customGptUrl` string, which covers both)

### `attachActionEventListeners`
- Add `checkForChanges` listener on `.action-custom-url-enabled` checkbox

### `handleAddAction`
- New action: `customGptUrl: ''` (checkbox unchecked, input disabled) — no change needed to data

---

## No Migration Required

Existing V3 configs load cleanly: absent or empty `customGptUrl` → checkbox unchecked, field disabled.
