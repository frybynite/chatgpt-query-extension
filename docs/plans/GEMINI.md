# Gemini Integration Design

## Overview

Add Google Gemini (gemini.google.com) as a supported target provider alongside ChatGPT.
Users set a menu's `customGptUrl` to a Gemini app or Gem URL.
The extension opens the tab and injects + submits the prompt identically to ChatGPT.

## Supported URL Formats

- `https://gemini.google.com/app` — standard Gemini interface
- `https://gemini.google.com/gem/<id>` — specific Gemini Gem

## Architecture

Provider config table in `background.js`, keyed by domain:

```js
const PROVIDERS = {
  'chatgpt.com': { titleMatch, inputSelectors, sendButtonSelectors },
  'gemini.google.com': { titleMatch, inputSelectors, sendButtonSelectors }
};
function getProviderForUrl(url) { /* infers from domain */ }
```

Provider is inferred from `customGptUrl` — no new config field.

## Files Changed

| File | Change |
|------|--------|
| `manifest.json` | Add `https://gemini.google.com/*` to `host_permissions` |
| `config.js` | Accept `chatgpt.com` OR `gemini.google.com` |
| `background.js` | PROVIDERS table + updated injection routing |
| `options.html` | URL field label/placeholder updated for Gemini |
| `options.js` | Any ChatGPT-only URL messaging updated |

## Gemini DOM Selectors (verify via DevTools)

Gemini uses Quill editor inside `<rich-textarea>` web component.
The existing `queryDeepAll()` shadow-DOM traversal handles this.

- Input candidates: `"rich-textarea .ql-editor"`, `"div.ql-editor[contenteditable='true']"`, `"rich-textarea [contenteditable='true']"`
- Submit candidates: `"button[aria-label='Send message']"`, `"button[aria-label*='send' i]"`
- Title match: `"Gemini"`
