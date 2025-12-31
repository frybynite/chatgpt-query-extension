// ====== DEBUG LOGGING ======
let debugEnabled = false;

// Load debug state from local storage (persists across extension reloads)
try {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('debugLogging').then(result => {
      debugEnabled = result.debugLogging === true;
    }).catch(() => {
      debugEnabled = false;
    });

    // Listen for debug state changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.debugLogging) {
        debugEnabled = changes.debugLogging.newValue === true;
      }
    });
  }
} catch (e) {
  // Storage not available, debug disabled
  debugEnabled = false;
}

function debugLog(...args) {
  if (debugEnabled) {
    console.log(...args);
  }
}

// ====== STATE ======
// Store shortcuts as parsed objects: {modifiers: Set, key: string, actionId: object}
let shortcuts = [];

// ====== DIAGNOSTICS ======
const diagnostics = {
  scriptLoadTime: Date.now(),
  listenerRegisteredTime: null,
  shortcutsRequestTime: null,
  shortcutsLoadedTime: null,
  shortcutsReady: false,
  missedKeypresses: [],
  totalKeypresses: 0
};

// ====== SHORTCUT PARSING ======
// Parse a shortcut string into modifiers set and key
function parseShortcut(shortcutString) {
  if (!shortcutString) return null;

  // Convert Mac symbols to Chrome format
  let normalized = shortcutString
    .replace(/⌃/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift')
    .replace(/⌘/g, 'Meta');

  const parts = normalized.split('+');
  if (parts.length === 0) return null;

  const modifiers = new Set();
  const validModifiers = ['Ctrl', 'Alt', 'Shift', 'Meta'];
  let key = null;

  parts.forEach(part => {
    const trimmed = part.trim();
    if (validModifiers.includes(trimmed)) {
      modifiers.add(trimmed);
    } else {
      key = normalizeKeyString(trimmed); // The actual key (letter, number, etc.)
    }
  });

  if (modifiers.size === 0 || !key) {
    return null; // Invalid shortcut
  }

  return { modifiers, key };
}

// Extract modifiers and key from keyboard event
function extractKeyPress(event) {
  const modifiers = new Set();
  
  if (event.ctrlKey) modifiers.add('Ctrl');
  if (event.altKey) modifiers.add('Alt');
  if (event.shiftKey) modifiers.add('Shift');
  if (event.metaKey) modifiers.add('Meta');

  // Use e.code for physical key (Mac compatibility)
  const key = normalizeKeyString(event.code);

  return { modifiers, key };
}

// Check if two modifier sets match exactly (same modifiers, no extras)
function modifierSetsMatch(set1, set2) {
  if (set1.size !== set2.size) return false;
  for (const mod of set1) {
    if (!set2.has(mod)) return false;
  }
  return true;
}

// Normalize key strings from config or keyboard events to a consistent format
function normalizeKeyString(value) {
  if (!value) return '';

  let key = value.trim();

  // Handle codes like "KeyH" and "Digit1"
  if (key.startsWith('Key')) {
    key = key.slice(3);
  } else if (key.startsWith('Digit')) {
    key = key.slice(5);
  } else if (key.startsWith('Arrow')) {
    key = key.slice(5); // "ArrowUp" -> "Up"
  }

  // Normalize single characters to uppercase (letters)
  if (key.length === 1) {
    return key.toUpperCase();
  }

  return key;
}

// ====== LOAD SHORTCUTS FROM BACKGROUND ======
function loadShortcuts() {
  diagnostics.shortcutsRequestTime = Date.now();
  debugLog('[Shortcuts] GET_SHORTCUTS sent at', diagnostics.shortcutsRequestTime - diagnostics.scriptLoadTime, 'ms');

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SHORTCUTS' }, (response) => {
      debugLog('[Shortcuts] Received shortcuts from background:', response);
      if (response && response.shortcuts) {
        shortcuts = [];
        // Response format: [["shortcutString", actionId], ...]
        response.shortcuts.forEach(([shortcutString, actionId]) => {
          const parsed = parseShortcut(shortcutString);
          if (parsed) {
            const shortcutObj = {
              modifiers: parsed.modifiers,
              key: parsed.key,
              actionId: actionId
            };
            debugLog('[Shortcuts] Parsed Shortcut:', {
              modifiers: Array.from(shortcutObj.modifiers),
              key: shortcutObj.key,
              actionId: shortcutObj.actionId
            });
            shortcuts.push(shortcutObj);
          }
          else{
            console.warn('[Shortcuts] Invalid shortcut:', shortcutString);
          }
        });
        debugLog('[Shortcuts] Loaded', shortcuts.length, 'shortcuts');
      } else {
        console.warn('[Shortcuts] No shortcuts received from background');
        shortcuts = [];
      }

      // Diagnostic tracking
      diagnostics.shortcutsLoadedTime = Date.now();
      diagnostics.shortcutsReady = true;

      const loadTime = diagnostics.shortcutsLoadedTime - diagnostics.shortcutsRequestTime;
      const vulnerabilityWindow = diagnostics.listenerRegisteredTime
        ? diagnostics.shortcutsLoadedTime - diagnostics.listenerRegisteredTime
        : 0;

      debugLog('[Shortcuts] Load time:', loadTime, 'ms');
      if (diagnostics.listenerRegisteredTime) {
        debugLog('[Shortcuts] Vulnerability window:', vulnerabilityWindow, 'ms');
      }

      if (diagnostics.missedKeypresses.length > 0) {
        console.warn('[Shortcuts] ⚠️ RACE CONDITION DETECTED:',
          diagnostics.missedKeypresses.length, 'keypresses occurred before shortcuts loaded');
        console.table(diagnostics.missedKeypresses);
      }

      if (diagnostics.listenerRegisteredTime) {
        console.table({
          'Script → Listener': (diagnostics.listenerRegisteredTime - diagnostics.scriptLoadTime) + 'ms',
          'Listener → Request': (diagnostics.shortcutsRequestTime - diagnostics.listenerRegisteredTime) + 'ms',
          'Request → Loaded': loadTime + 'ms',
          'Total Vulnerability': vulnerabilityWindow + 'ms',
          'Missed Keys': diagnostics.missedKeypresses.length
        });
      }

      resolve();
    });
  });
}

// Listen for shortcut updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SHORTCUTS_UPDATED') {
    shortcuts = [];
    message.shortcuts.forEach(([shortcutString, actionId]) => {
      const parsed = parseShortcut(shortcutString);
      if (parsed) {
        shortcuts.push({
          modifiers: parsed.modifiers,
          key: parsed.key,
          actionId: actionId
        });
      }
    });
    debugLog('[Shortcuts] Updated', shortcuts.length, 'shortcuts');
  }
});

// ====== KEYBOARD LISTENER ======
function handleKeydown(event) {
  // Don't interfere with input fields
  const target = event.target;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

  const pressed = extractKeyPress(event);
  diagnostics.totalKeypresses++;

  debugLog('[Shortcuts] Keypress #' + diagnostics.totalKeypresses,
    Array.from(pressed.modifiers).join('+') + '+' + pressed.key);
  debugLog('[Shortcuts] Ready:', diagnostics.shortcutsReady, 'Array length:', shortcuts.length);

  // Detect race condition - keypress while shortcuts not ready
  if (!diagnostics.shortcutsReady || shortcuts.length === 0) {
    const missedKeypress = {
      time: (Date.now() - diagnostics.scriptLoadTime) + 'ms',
      pressed: Array.from(pressed.modifiers).join('+') + '+' + pressed.key,
      arrayLength: shortcuts.length,
      ready: diagnostics.shortcutsReady
    };
    diagnostics.missedKeypresses.push(missedKeypress);
    console.warn('[Shortcuts] ⚠️ POTENTIAL MISS:', missedKeypress);
  }

  // Find matching shortcut by checking modifier sets and key
  const matchedShortcut = shortcuts.find(shortcut => {
    // Check if keys match
    if (shortcut.key !== pressed.key) return false;

    // Check if modifier sets match exactly (same modifiers, no extras, no missing)
    return modifierSetsMatch(shortcut.modifiers, pressed.modifiers);
  });

  if (matchedShortcut) {
    debugLog('[Shortcuts] Triggered:', Array.from(pressed.modifiers).join('+') + '+' + pressed.key, '→', matchedShortcut.actionId);
    event.preventDefault();
    event.stopPropagation();

    // Check if extension context is still valid
    if (!chrome.runtime?.id) {
      debugLog('[Shortcuts] Extension reloaded - please refresh this page to use shortcuts');
      return;
    }

    // Get selected text
    const selection = window.getSelection?.() ? String(window.getSelection()).trim() : '';
    if (!selection) {
      debugLog('[Shortcuts] No text selected');
      return;
    }

    // Send message to background to execute action
    chrome.runtime.sendMessage({
      type: 'EXECUTE_SHORTCUT',
      actionId: matchedShortcut.actionId,
      selectionText: selection
    }).catch(error => {
      // Extension context invalidated - happens after extension reload
      if (error.message?.includes('Extension context invalidated')) {
        debugLog('[Shortcuts] Extension reloaded - please refresh this page to use shortcuts');
      } else {
        console.error('[Shortcuts] Failed to send message:', error);
      }
    });
  }
}

// ====== INITIALIZATION ======
(async function initializeShortcuts() {
  try {
    // Load shortcuts first
    await loadShortcuts();

    // Register listener AFTER shortcuts are loaded
    diagnostics.listenerRegisteredTime = Date.now();
    debugLog('[Shortcuts] Shortcuts loaded, registering listener');

    document.addEventListener('keydown', handleKeydown, true); // Use capture phase

    debugLog('[Shortcuts] Initialization complete - shortcuts ready');
  } catch (error) {
    console.error('[Shortcuts] Failed to initialize:', error);
    // Fallback: register listener anyway to avoid breaking extension
    document.addEventListener('keydown', handleKeydown, true);
  }
})();
