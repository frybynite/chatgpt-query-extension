# Fix Intermittent Submission Failure

## Problem Statement

Periodically (5-10% of the time), when a browser window is opened to submit a query via keyboard shortcut, the query text fills into the submission box but the submission never happens automatically. The user must manually switch to the window and click the submit button.

**Characteristics:**
- Frequency: Rare (5-10%)
- Pattern: Completely random
- Text state: Fully populated when it fails
- Trigger: Keyboard shortcuts

## Root Cause Analysis

### Investigation Summary

The submission mechanism is **fire-and-forget** with a hardcoded 150ms delay. The code optimistically returns `submitted: true` without waiting to verify the button was actually clicked. When ChatGPT's DOM isn't fully ready within 150ms, the submit button isn't found and submission silently fails.

### Critical Issues Identified

#### Issue #1: Fire-and-Forget Submission
**Location:** `background.js:879`

```javascript
if (shouldSubmit) setTimeout(() => submit(editor), 150);
return { inserted: true, submitted: !!shouldSubmit, skipped: false };
```

**Problem:**
- Returns IMMEDIATELY after scheduling submit, doesn't wait for completion
- `submitted: true` means "we scheduled it," not "it succeeded"
- No way to know if submission actually worked

**Race condition scenarios:**
- Page takes >150ms to fully render the button
- DOM is still being manipulated by ChatGPT's React app
- Button selector changes temporarily during page updates
- Submit fires but cannot find or click the button

#### Issue #2: Submit Button Not Found Handling
**Location:** `background.js:843`

```javascript
const btn = findSendButton();
if (btn) { /* try to click */ }
else { return enter(editorEl); }  // Fallback to Enter key
```

**Problem:**
- If `findSendButton()` returns `null`, immediately falls back to Enter keypress
- No guarantee the editor is ready to accept Enter either
- Relies on ChatGPT's DOM structure being stable

**Button selectors used:**
```javascript
const sels = [
  "form button[data-testid='send-button']",
  "button[data-testid='send-button']",
  "form button[aria-label*='send' i]",
  "button[aria-label*='send' i]",
  "form button[type='submit']",
  "button[type='submit']"
];
```

#### Issue #3: Disabled Button Polling
**Location:** `background.js:846-852`

```javascript
const tick = () => {
  const cs = getComputedStyle(btn);
  const disabled = btn.disabled || cs.pointerEvents === "none" || cs.opacity === "0.5";
  if (!disabled) { btn.click(); return true; }
  if (++tries >= max) { /* fallback after 10 tries */ }
  setTimeout(tick, 200);  // Poll every 200ms, max 10 times = 2 seconds
};
```

**Problem:**
- Only runs IF button is found initially
- 2-second timeout (10 × 200ms) might not be enough for slow pages
- No return value or promise - all fire-and-forget
- If all 10 attempts fail, falls back to Enter key which might also fail

#### Issue #4: Hardcoded Timing
**Location:** `background.js:879`

```javascript
if (shouldSubmit) setTimeout(() => submit(editor), 150);  // Hardcoded 150ms
```

**Problem:**
150ms delay is arbitrary and may be insufficient for:
- ChatGPT to process the text input event
- React to update the UI state
- Submit button to become enabled
- Page to finish pending state updates

#### Issue #5: No Error Propagation

**Problem:**
- Submit function has no way to communicate failure back to background script
- Even if submission fails, code thinks it succeeded
- No user notification when submission fails

**Current logging:**
- `console.log("[JobSearchExt]", label, "clicked send button")` - Success
- `console.log("[JobSearchExt]", label, "send disabled; fallback Enter")` - Button disabled
- `console.warn("[JobSearchExt]", label, "editor not found — giving up")` - Editor not found
- No logging for button not found or Enter fallback failure

### Why 5-10% Failure Rate?

The intermittent nature indicates a **timing-dependent race condition**:

**Likely failure scenarios:**
1. **Fast user, slow ChatGPT:** Tab opens → Text injects quickly → 150ms passes → Submit fires → Button not in DOM yet → Fails silently
2. **React render cycle:** ChatGPT re-renders form between text insertion and submission, temporarily removing button
3. **Network latency:** ChatGPT page still loading assets when submit fires
4. **Browser scheduling:** setTimeout timing not guaranteed - browser may delay if tab unfocused or CPU busy
5. **DOM conflicts:** ChatGPT's mutation observers may conflict with rapid text insertion + immediate submission

**Why it usually works:**
- 150ms is usually enough for ChatGPT to be ready
- Retry mechanism (attempt #2 after 1200ms) catches some failures
- When button is disabled but exists, polling (10 × 200ms) usually succeeds

**Why it sometimes fails:**
- Button doesn't exist yet when `findSendButton()` is called
- 150ms + 2-second polling window isn't enough for slow page loads
- No verification that submission actually occurred

## Proposed Fixes

### Fix #1: Wait for Submit Button to Exist
**Location:** `background.js:827-841`

**Current behavior:** Only searches for button once when submit() is called

**Proposed change:** Poll for button's existence before attempting to click
- Use mutation observer OR longer polling window
- Don't attempt submission until button actually exists in DOM
- Make configurable timeout (e.g., 5-10 seconds)

**Implementation approach:**
```javascript
async function waitForSendButton(maxWaitMs = 5000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const btn = findSendButton();
    if (btn) return btn;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}
```

### Fix #2: Make Submission Awaitable
**Location:** `background.js:879`

**Current behavior:** Fire-and-forget setTimeout with no confirmation

**Proposed change:**
- Replace with Promise-based approach
- Return success/failure status from injected function to background script
- Wait for actual click confirmation before considering successful

**Implementation approach:**
- Use `chrome.scripting.executeScript()` with return value
- Or use message passing to report success/failure back
- Background script waits for response before considering done

### Fix #3: Increase Pre-Submit Delay
**Location:** `background.js:879`

**Current behavior:** Hardcoded 150ms delay

**Proposed change:**
- Increase to 300-500ms to give React time to stabilize
- OR better: wait for button to exist rather than arbitrary delay
- Make configurable in settings for users with slower machines

### Fix #4: Verify Submission Occurred
**Location:** After click in `background.js:847`

**Current behavior:** Assumes click worked if button was clicked

**Proposed change:** Verify submission actually happened
- Check if editor was cleared after click
- Look for submission UI changes (e.g., "Stop generating" button appears)
- Wait briefly and confirm state changed

**Implementation approach:**
```javascript
function verifySubmission(editorEl) {
  // Wait a bit for submission to process
  setTimeout(() => {
    const currentText = editorEl.textContent || editorEl.value;
    const cleared = !currentText || currentText.trim() === '';
    const stopButton = document.querySelector('[data-testid="stop-button"]');
    return cleared || !!stopButton;
  }, 500);
}
```

### Fix #5: Add User Notification on Failure
**Location:** `background.js:727-919` (in injected function return value handling)

**Current behavior:** Silent failure - user doesn't know submission failed

**Proposed change:**
- If submission fails after all retries, show browser notification
- Log detailed error to console for debugging
- Optionally: Add visual indicator in extension popup

**Implementation approach:**
```javascript
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icon48.png',
  title: 'Submission Failed',
  message: 'Query was inserted but could not be submitted. Please click Send manually.'
});
```

### Fix #6: Increase Polling Attempts
**Location:** `background.js:849-852`

**Current behavior:** 10 tries × 200ms = 2 seconds max

**Proposed change:** Increase to 20-30 tries or make configurable
- Gives more time for slow page loads
- 30 tries × 200ms = 6 seconds max
- Make configurable for users with slow connections

## Implementation Plan

### Phase 1: Core Fixes (Required)
1. ✅ **Make submit() return a Promise** - Essential for knowing if submission worked
2. ✅ **Add button existence polling** - Wait for button before attempting click
3. ✅ **Increase pre-submit delay** - 150ms → 300-500ms or wait for button

### Phase 2: Verification (Required)
4. ✅ **Add submission verification** - Confirm submission actually occurred
5. ✅ **Add error notification** - Inform user when submission fails

### Phase 3: Robustness (Nice to Have)
6. ⬜ **Increase polling attempts** - Make configurable, default 20-30 tries
7. ⬜ **Add detailed logging** - Help diagnose future issues
8. ⬜ **Make delays configurable** - Settings for users with slow machines

### Testing Strategy
1. Test with slow network throttling
2. Test with CPU throttling (simulate slow machine)
3. Test rapid repeated submissions
4. Test with browser tab not focused
5. Monitor console logs for failure cases
6. Aim for 0% failure rate across 100+ test submissions

## File References

- **Keyboard shortcut entry:** `shortcuts.js:170-221`
- **Background message handler:** `background.js:922-1000`
- **Action execution:** `background.js:317-357`
- **Tab waiting logic:** `background.js:537-560`
- **Injection function:** `background.js:727-919`
- **CRITICAL: Submit mechanism:** `background.js:842-856`
- **CRITICAL: Submit scheduling:** `background.js:879`
- **Button finder:** `background.js:827-841`

## Discussion Points

1. **Should we use mutation observer vs polling?** Mutation observer is cleaner but more complex
2. **What should the max wait time be?** Balance between user patience and reliability
3. **How to handle persistent failures?** Fall back to notification + manual submit, or keep retrying?
4. **Should delays be configurable?** Adds complexity but helps users with slow machines
5. **What success indicators to use?** Editor cleared? Stop button appears? Response starts streaming?
