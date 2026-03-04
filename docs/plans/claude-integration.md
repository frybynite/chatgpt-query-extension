# Claude Integration Plan (v4.1.0)

## Context

The extension supports ChatGPT and Gemini as AI providers. This plan adds Claude.ai (including Claude Projects at `claude.ai/project/<id>`) as an additional destination for prompts. The behavior mirrors ChatGPT/Gemini: open the URL, inject prompt + selected text into the chat input, and optionally auto-submit.

This work happens in the `worktree/claude-integration` git worktree on branch `feature/claude-integration`.

---

## Approach

Follow the exact pattern used to add Gemini (v4.0.0):
1. Add `claude.ai` entry to the `PROVIDERS` table in `background.js`
2. Add `https://claude.ai` to `ALLOWED_MENU_URL_PREFIXES` in `config.js`
3. Add `https://claude.ai/*` to `host_permissions` in `manifest.json`
4. Update validation error message in `config.js` to mention Claude
5. Add provider-routing tests for Claude URLs
6. Write design doc to `docs/plans/claude-integration.md`

---

## Files Modified

| File | Change |
|------|--------|
| `background.js` | Added `claude.ai` entry to PROVIDERS table |
| `config.js` | Added `https://claude.ai` to ALLOWED_MENU_URL_PREFIXES; updated error message |
| `manifest.json` | Added `https://claude.ai/*` to host_permissions; updated description; bumped version to 4.1.0 |
| `tests/execution/provider-routing.spec.js` | Added 3 new tests for Claude URL validation |
| `tests/smoke.spec.js` | Fixed pre-existing title assertion (ChatGPT → AI Custom Prompts) |

---

## URL Support

| URL | Behavior |
|-----|----------|
| `https://claude.ai` | Opens main Claude chat, injects prompt |
| `https://claude.ai/project/<id>` | Opens Claude project page, injects prompt |

Both resolve via `getProviderForUrl()` since both contain `claude.ai` — no special-casing needed.

---

## Claude Provider Config

```javascript
'claude.ai': {
  titleMatch: 'Claude',
  // Claude.ai uses a ProseMirror contenteditable editor
  inputSelectors: [
    "div[contenteditable='true'][data-placeholder]",
    "div.ProseMirror[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "[contenteditable='true'][role='textbox']",
    "[contenteditable='true']"
  ],
  sendButtonSelectors: [
    "button[aria-label='Send Message']",
    "button[aria-label*='send' i]",
    "button[type='submit']"
  ]
}
```

> **Note**: Selectors should be verified against an authenticated Claude.ai session using browser DevTools on both `claude.ai` (new chat) and `claude.ai/project/<id>` (project page). Adjust if the live DOM differs.

---

## Verification

1. Run test suite: `npx playwright test --reporter=list` — all tests should pass
2. Manually configure a menu with `https://claude.ai` — no validation error
3. Manually configure a menu with `https://claude.ai/project/<id>` — no validation error
4. Manually configure with `https://example.com` — validation error should appear
5. (Manual) Use extension on a web page with text selected → trigger action → Claude.ai opens and receives the prompt
6. (Manual) Verify auto-submit works on the Claude project page
