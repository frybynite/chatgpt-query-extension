import { getConfig, migrateConfig } from './config.js';
import { debugLogSync as debugLog } from './debug.js';

// ====== DYNAMIC CONFIG ======
// Config is now loaded from chrome.storage.sync
// No hardcoded values - everything is user-configurable

// ====== CONFIG CACHE ======
let cachedConfig = null;

async function loadConfig() {
  if (!cachedConfig) {
    cachedConfig = await getConfig();
  }
  return cachedConfig;
}

function invalidateCache() {
  cachedConfig = null;
}

// ====== INSTALLATION & MIGRATION ======
chrome.runtime.onInstalled.addListener(async () => {
  // Migrate config if needed (v1.6.0 → v2.0.0)
  await migrateConfig();

  // Load config and build menus
  await rebuildContextMenus();
});

// ====== SHORTCUT FORMATTING ======
// Format shortcut string for display with platform-appropriate symbols
// Input is always in Chrome format (Ctrl, Alt, Shift, Meta) or legacy Mac symbols
// Output is Mac symbols on Mac, Chrome format on Windows/Linux
function formatShortcutForDisplay(shortcut) {
  if (!shortcut) return '';

  // Detect Mac based on user agent in service worker context
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  // First normalize any legacy Mac symbols to Chrome format
  let normalized = shortcut
    .replace(/⌃/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift')
    .replace(/⌘/g, 'Meta');

  if (isMac) {
    // Convert Chrome format to Mac symbols for display
    return normalized
      .replace(/Ctrl/g, '⌃')
      .replace(/Alt/g, '⌥')
      .replace(/Shift/g, '⇧')
      .replace(/Meta/g, '⌘');
  } else {
    // On Windows/Linux, return Chrome format as-is
    return normalized;
  }
}

// ====== CONTEXT MENU MANAGEMENT ======
let isRebuildingMenus = false;

async function rebuildContextMenus() {
  // Prevent concurrent rebuilds
  if (isRebuildingMenus) {
    debugLog('[Background] Menu rebuild already in progress, skipping');
    return;
  }

  isRebuildingMenus = true;

  try {
    // Clear all existing menus
    await chrome.contextMenus.removeAll();

    // Small delay to ensure removal completes
    await new Promise(resolve => setTimeout(resolve, 50));

    // Load current config
    const config = await loadConfig();

    // Helper to create menu item with error handling
    const createMenuItem = (props) => {
      try {
        chrome.contextMenus.create(props);
      } catch (e) {
        if (!e.message?.includes('duplicate')) {
          console.error('[Background] Error creating menu item:', props.id, e);
        }
      }
    };

    // V3: Multiple menus
    if (config.menus && Array.isArray(config.menus)) {
      const sortedMenus = [...config.menus].sort((a, b) => a.order - b.order);

      sortedMenus.forEach(menu => {
        // Create parent menu item for each menu
        createMenuItem({
          id: menu.id,
          title: menu.name,
          contexts: ['selection']
        });

        // Get enabled actions for this menu
        const enabledActions = menu.actions
          .filter(action => action.enabled)
          .sort((a, b) => a.order - b.order);

        // Create menu items for each enabled action
        enabledActions.forEach(action => {
          // Don't display shortcuts in context menu (they still work via keyboard shortcuts)
          createMenuItem({
            id: `${menu.id}__${action.id}`,
            parentId: menu.id,
            title: action.title,
            contexts: ['selection']
          });
        });

        // Create "Run All" for this menu if enabled and has multiple actions
        if (menu.runAllEnabled && enabledActions.length > 1) {
          // Don't display shortcuts in context menu (they still work via keyboard shortcuts)
          createMenuItem({
            id: `${menu.id}__runAll`,
            parentId: menu.id,
            title: 'Run All Actions',
            contexts: ['selection']
          });
        }

        debugLog(`[Background] Menu "${menu.name}": ${enabledActions.length} actions`);
      });

      debugLog(`[Background] Context menus rebuilt: ${sortedMenus.length} menus`);
    }
    // V2 fallback (for migration compatibility)
    else {
      debugLog('[Background] Using V2 fallback for context menus');
      createMenuItem({
        id: 'jobSearchRoot',
        title: config.globalSettings?.contextMenuTitle || 'Send to ChatGPT',
        contexts: ['selection']
      });

      const enabledActions = (config.actions || [])
        .filter(action => action.enabled)
        .sort((a, b) => a.order - b.order);

      enabledActions.forEach(action => {
        // Don't display shortcuts in context menu (they still work via keyboard shortcuts)
        createMenuItem({
          id: action.id,
          parentId: 'jobSearchRoot',
          title: action.title,
          contexts: ['selection']
        });
      });

      if (config.globalSettings?.runAllEnabled && enabledActions.length > 1) {
        // Don't display shortcuts in context menu (they still work via keyboard shortcuts)
        createMenuItem({
          id: 'runAll',
          parentId: 'jobSearchRoot',
          title: 'Run All Actions',
          contexts: ['selection']
        });
      }

      debugLog('[Background] Context menus rebuilt (V2 format):', enabledActions.length, 'actions');
    }
  } catch (e) {
    console.error('[Background] Error rebuilding context menus:', e);
  } finally {
    isRebuildingMenus = false;
  }
}

// ====== SHORTCUT MAP BUILDER ======
// Build shortcut map by sending shortcuts as-is (order doesn't matter - matching is done by modifier sets)
function buildShortcutMap(config) {
  const shortcuts = [];

  // V3: Multiple menus
  if (config.menus && Array.isArray(config.menus)) {
    config.menus.forEach(menu => {
      // Add individual action shortcuts
      menu.actions
        .filter(action => action.enabled && action.shortcut)
        .forEach(action => {
          // Send shortcut as-is - matching will be done by modifier sets in shortcuts.js
          shortcuts.push([action.shortcut, { menuId: menu.id, actionId: action.id }]);
        });

      // Add Run All shortcut for this menu if enabled and configured
      if (menu.runAllEnabled && menu.runAllShortcut) {
        shortcuts.push([menu.runAllShortcut, { menuId: menu.id, actionId: 'runAll' }]);
      }
    });
  }
  // V2 fallback
  else {
    config.actions
      ?.filter(action => action.enabled && action.shortcut)
      .forEach(action => {
        shortcuts.push([action.shortcut, action.id]);
      });

    if (config.globalSettings?.runAllEnabled && config.globalSettings?.runAllShortcut) {
      shortcuts.push([config.globalSettings.runAllShortcut, 'runAll']);
    }
  }

  return shortcuts;
}

// ====== STORAGE CHANGE LISTENER ======
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'sync' && changes.config) {
    debugLog('[Background] Config changed, rebuilding...');
    invalidateCache();
    await rebuildContextMenus();

    // Notify all tabs to reload shortcuts
    const tabs = await chrome.tabs.query({});
    const config = await loadConfig();
    const shortcuts = buildShortcutMap(config);

    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHORTCUTS_UPDATED',
        shortcuts: shortcuts
      }).catch(() => {
        // Ignore errors for tabs where content script isn't loaded
      });
    });
  }
});

// ====== CONTEXT MENU CLICK HANDLER ======
chrome.contextMenus.onClicked.addListener(async (info) => {
  debugLog('[Background] Context menu clicked:', info.menuItemId, 'selection:', info.selectionText?.substring(0, 50));

  if (!info.selectionText) {
    console.warn('[Background] No selection text, ignoring click');
    return;
  }

  const config = await loadConfig();
  const menuItemId = info.menuItemId;
  debugLog('[Background] Config loaded, processing menuItemId:', menuItemId);

  // V3: Multiple menus (parse namespace menuId__actionId)
  if (config.menus && Array.isArray(config.menus)) {
    debugLog('[Background] Using V3 config with', config.menus.length, 'menus');
    // Parse menuItemId to extract menuId and actionId
    const parts = menuItemId.split('__');
    debugLog('[Background] Parsed menuItemId into parts:', parts);

    if (parts.length === 2) {
      const [menuId, actionId] = parts;

      // Find the menu
      const menu = config.menus.find(m => m.id === menuId);
      if (!menu) {
        console.warn('[Background] Menu not found:', menuId);
        return;
      }
      debugLog('[Background] Found menu:', menu.name);

      // Handle "Run All" for this menu
      if (actionId === 'runAll') {
        debugLog('[Background] Executing Run All for menu:', menu.name);
        await runAllActions(info.selectionText.trim(), menu, config);
        return;
      }

      // Find the action within the menu
      const action = menu.actions.find(a => a.id === actionId);
      if (!action) {
        console.warn('[Background] Action not found:', actionId, 'in menu:', menu.name);
        return;
      }
      debugLog('[Background] Found action:', action.title);

      // Execute single action with menu's settings
      debugLog('[Background] Calling executeAction for:', action.title);
      await executeAction(action, info.selectionText.trim(), menu, config);
    } else {
      console.warn('[Background] Invalid menu item ID format:', menuItemId);
    }
  }
  // V2 fallback
  else {
    const actionId = menuItemId;

    // Handle "Run All" action
    if (actionId === 'runAll') {
      await runAllActionsV2(info.selectionText.trim(), config);
      return;
    }

    // Find the action
    const action = config.actions?.find(a => a.id === actionId);
    if (!action) {
      console.warn('[Background] Action not found:', actionId);
      return;
    }

    // Execute single action (V2 format)
    await executeActionV2(action, info.selectionText.trim(), config);
  }
});

// ====== SINGLE ACTION EXECUTION (V3) ======
async function executeAction(action, selectionText, menu, config) {
  const prompt = `${action.prompt} ${selectionText}`;
  debugLog('[Background] executeAction called for:', action.title);
  debugLog('[Background] Prompt:', prompt.substring(0, 100));
  debugLog('[Background] Menu URL:', menu.customGptUrl);
  debugLog('[Background] Auto-submit:', menu.autoSubmit);

  try {
    debugLog('[Background] Opening ChatGPT tab...');
    const tabId = await openOrFocusGptTab(menu.customGptUrl, config.globalSettings.clearContext);
    debugLog('[Background] Tab opened with ID:', tabId);

    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Attempt #1
    debugLog('[Background] Attempting to inject prompt (attempt #1)...');
    const ok1 = await tryInjectWithTiming(tabId, prompt, {
      label: `${action.id}-attempt#1`,
      autoSubmit: menu.autoSubmit,
      reqId
    });
    debugLog('[Background] Injection attempt #1 result:', ok1);

    // Retry if needed
    if (!ok1) {
      setTimeout(() => tryInjectWithTiming(tabId, prompt, {
        label: `${action.id}-attempt#2`,
        autoSubmit: menu.autoSubmit,
        reqId
      }), 1200);
    }
  } catch (e) {
    console.warn('[Background] Failed to execute action:', action.id, e);
    const t = await chrome.tabs.create({ url: menu.customGptUrl, active: true });
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTimeout(() => tryInjectWithTiming(t.id, prompt, {
      label: `${action.id}-fallback`,
      autoSubmit: menu.autoSubmit,
      reqId
    }), 1200);
  }
}

// ====== SINGLE ACTION EXECUTION (V2 fallback) ======
async function executeActionV2(action, selectionText, config) {
  const prompt = `${action.prompt} ${selectionText}`;

  try {
    const tabId = await openOrFocusGptTabV2(config, { clear: config.globalSettings?.clearContext });

    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const ok1 = await tryInjectWithTiming(tabId, prompt, {
      label: `${action.id}-attempt#1`,
      autoSubmit: config.globalSettings?.autoSubmit,
      reqId
    });

    if (!ok1) {
      setTimeout(() => tryInjectWithTiming(tabId, prompt, {
        label: `${action.id}-attempt#2`,
        autoSubmit: config.globalSettings?.autoSubmit,
        reqId
      }), 1200);
    }
  } catch (e) {
    console.warn('[Background] Failed to execute action:', action.id, e);
    const t = await chrome.tabs.create({ url: config.globalSettings?.customGptUrl, active: true });
    const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTimeout(() => tryInjectWithTiming(t.id, prompt, {
      label: `${action.id}-fallback`,
      autoSubmit: config.globalSettings?.autoSubmit,
      reqId
    }), 1200);
  }
}

// ====== RUN ALL ACTIONS HANDLER (V3) ======
async function runAllActions(selectionText, menu, config) {
  // Get all enabled actions for this menu
  const enabledActions = menu.actions
    .filter(action => action.enabled)
    .sort((a, b) => a.order - b.order);

  debugLog(`[Background] Run All for "${menu.name}": Found ${enabledActions.length} enabled actions:`, enabledActions.map(a => a.title));

  // Step 1: Create all tabs immediately IN ORDER, then wait for them to load IN PARALLEL
  const tabCreationPromises = enabledActions.map(async (action) => {
    try {
      const tab = await chrome.tabs.create({
        url: menu.customGptUrl,
        active: false
      });
      const tabId = await waitForTitleMatch(tab.id, config.globalSettings.gptTitleMatch, 20000);
      debugLog(`[Background] Created tab ${tabId} for ${action.title}`);
      return { action, tabId };
    } catch (e) {
      console.warn(`[Background] Failed to create tab for ${action.title}:`, e);
      return null;
    }
  });

  const results = await Promise.all(tabCreationPromises);
  const tabData = results.filter(r => r !== null);

  // Step 2: Inject prompts into all tabs IN PARALLEL
  const promises = tabData.map(async ({ action, tabId }) => {
    const prompt = `${action.prompt} ${selectionText}`;

    try {
      debugLog(`[Background] Injecting prompt for ${action.title} in tab ${tabId}`);

      const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Attempt #1
      const ok1 = await tryInjectWithTiming(tabId, prompt, {
        label: `runAll-${action.id}-attempt#1`,
        autoSubmit: menu.autoSubmit,
        reqId
      });

      // Retry if needed
      if (!ok1) {
        setTimeout(() => tryInjectWithTiming(tabId, prompt, {
          label: `runAll-${action.id}-attempt#2`,
          autoSubmit: menu.autoSubmit,
          reqId
        }), 1200);
      }
    } catch (e) {
      console.warn(`[Background] Failed to inject prompt for ${action.title}:`, e);
    }
  });

  await Promise.all(promises);
  debugLog(`[Background] All actions launched for menu "${menu.name}"`);
}

// ====== RUN ALL ACTIONS HANDLER (V2 fallback) ======
async function runAllActionsV2(selectionText, config) {
  const enabledActions = (config.actions || [])
    .filter(action => action.enabled)
    .sort((a, b) => a.order - b.order);

  debugLog(`[Background] Run All: Found ${enabledActions.length} enabled actions:`, enabledActions.map(a => a.title));

  const tabCreationPromises = enabledActions.map(async (action) => {
    try {
      const tab = await chrome.tabs.create({
        url: config.globalSettings?.customGptUrl,
        active: false
      });
      const tabId = await waitForTitleMatch(tab.id, config.globalSettings?.gptTitleMatch || 'ChatGPT', 20000);
      debugLog(`[Background] Created tab ${tabId} for ${action.title}`);
      return { action, tabId };
    } catch (e) {
      console.warn(`[Background] Failed to create tab for ${action.title}:`, e);
      return null;
    }
  });

  const results = await Promise.all(tabCreationPromises);
  const tabData = results.filter(r => r !== null);

  const promises = tabData.map(async ({ action, tabId }) => {
    const prompt = `${action.prompt} ${selectionText}`;

    try {
      const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const ok1 = await tryInjectWithTiming(tabId, prompt, {
        label: `runAll-${action.id}-attempt#1`,
        autoSubmit: config.globalSettings?.autoSubmit,
        reqId
      });

      if (!ok1) {
        setTimeout(() => tryInjectWithTiming(tabId, prompt, {
          label: `runAll-${action.id}-attempt#2`,
          autoSubmit: config.globalSettings?.autoSubmit,
          reqId
        }), 1200);
      }
    } catch (e) {
      console.warn(`[Background] Failed to inject prompt for ${action.title}:`, e);
    }
  });

  await Promise.all(promises);
  debugLog('[Background] All actions launched');
}

// ====== TAB/TITLE HELPERS ======
async function openOrFocusGptTab(customGptUrl, clearContext) {
  debugLog('[Background] openOrFocusGptTab called with URL:', customGptUrl);
  const created = await chrome.tabs.create({
    url: `${customGptUrl}?fresh=${Date.now()}`,
    active: true
  });
  debugLog('[Background] Tab created with ID:', created.id);

  // Load config to get gptTitleMatch
  const config = await loadConfig();
  const titleMatch = config.globalSettings?.gptTitleMatch || 'ChatGPT';
  debugLog('[Background] Waiting for title to match:', titleMatch);

  // Wait for tab to be ready before returning
  const result = await waitForTitleMatch(created.id, titleMatch, 20000);
  debugLog('[Background] Tab ready with ID:', result);
  return result;
}

async function openOrFocusGptTabV2(config, { clear = false } = {}) {
  const created = await chrome.tabs.create({
    url: `${config.globalSettings?.customGptUrl}?fresh=${Date.now()}`,
    active: true
  });
  return await waitForTitleMatch(created.id, config.globalSettings?.gptTitleMatch || 'ChatGPT', 20000);
}

function waitForTitleMatch(tabId, titleSubstring, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function done(id) { cleanup(); resolve(id); }
    function cleanup() { chrome.tabs.onUpdated.removeListener(onUpdated); }
    function onUpdated(id, info, tab) {
      if (id !== tabId || !info.title) return;
      const ok = (tab.title || "").toLowerCase().includes(titleSubstring.toLowerCase());
      if (ok) return done(tabId);
    }
    async function poll() {
      try {
        const t = await chrome.tabs.get(tabId);
        if (!t) return reject(new Error("Tab closed"));
        const ok = (t.title || "").toLowerCase().includes(titleSubstring.toLowerCase());
        if (ok) return done(tabId);
        if (Date.now() - start > timeoutMs) { cleanup(); return reject(new Error("Timed out waiting for title match")); }
        setTimeout(poll, 250);
      } catch (e) { cleanup(); reject(e); }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
    poll();
  });
}

// ====== MODAL OVERLAY FUNCTION (to be injected) ======
function createModalOverlayFunction() {
  return function showModalOverlay(message) {
    // Remove any existing modal
    const existingModal = document.getElementById('chatgpt-query-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'chatgpt-query-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 90%;
      padding: 0;
      display: flex;
      flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #dadce0;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Notice';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      color: #202124;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      color: #5f6368;
      opacity: 0.6;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s, opacity 0.2s;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.backgroundColor = '#f1f3f4';
      closeBtn.style.opacity = '1';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.backgroundColor = 'transparent';
      closeBtn.style.opacity = '0.6';
    };

    const body = document.createElement('div');
    body.style.cssText = `
      padding: 24px;
    `;

    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin: 0;
      color: #5f6368;
      line-height: 1.6;
    `;

    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #dadce0;
    `;

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = `
      background: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      min-width: 80px;
      transition: background-color 0.2s;
    `;
    okBtn.onmouseover = () => {
      okBtn.style.backgroundColor = '#1557b0';
    };
    okBtn.onmouseout = () => {
      okBtn.style.backgroundColor = '#1a73e8';
    };

    const closeModal = () => {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    closeBtn.onclick = closeModal;
    okBtn.onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Assemble modal
    header.appendChild(title);
    header.appendChild(closeBtn);
    body.appendChild(messageEl);
    footer.appendChild(okBtn);
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);

    // Add to page
    document.body.appendChild(overlay);
    okBtn.focus();
  };
}

// ====== INJECTION (returns true if inserted/submitted, else false) ======
async function tryInjectWithTiming(tabId, prompt, { label = "", autoSubmit = false, reqId = "" } = {}) {
  debugLog('[Background] tryInjectWithTiming called:', { tabId, label, autoSubmit, reqId, promptLength: prompt.length });
  try {
    debugLog('[Background] Executing script in tab', tabId);
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: (text, label, shouldSubmit, requestId) => {
        console.log("[JobSearchExt]", label, "inject start (debounced)", { requestId, shouldSubmit });

        // ---- page-level debounce: if same reqId already handled in last 10s, skip ----
        const now = Date.now();
        const DEBOUNCE_MS = 10_000;
        const g = (window.__JSE_STATE ||= {});
        if (g.lastReqId === requestId && now - (g.lastReqAt || 0) < DEBOUNCE_MS) {
          console.log("[JobSearchExt]", label, "debounced duplicate requestId");
          return { inserted: false, submitted: false, skipped: true };
        }
        g.lastReqId = requestId; g.lastReqAt = now;

        const SELECTORS_ORDERED = [
          "form div[contenteditable='true'][data-testid^='composer']",
          "form div[contenteditable='true'][role='textbox']",
          "div[contenteditable='true'][data-testid^='composer']",
          "div[contenteditable='true'][role='textbox']",
          "form [contenteditable='true']",
          "[contenteditable='true']",
          "form textarea",
          "textarea"
        ];
        const MAX_TRIES = 40, INTERVAL = 200;

        function isVisible(el) {
          if (!el || !el.ownerDocument || !el.isConnected) return false;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
          const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false;
          let n = el; while (n && n !== document.documentElement) {
            if (n.getAttribute && n.getAttribute("aria-hidden") === "true") return false;
            n = n.parentElement || n.parentNode?.host || null;
          }
          return true;
        }
        function queryDeepAll(root, sel) {
          const out = [];
          try { root.querySelectorAll(sel)?.forEach(n => out.push(n)); } catch {}
          const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
          let n; while ((n = tw.nextNode())) if (n.shadowRoot) out.push(...queryDeepAll(n.shadowRoot, sel));
          return out;
        }
        function nearestVisibleCE(fromEl) {
          const form = fromEl.closest && fromEl.closest("form");
          const q = "div[contenteditable='true'][role='textbox'], div[contenteditable='true'][data-testid^='composer'], [contenteditable='true']";
          const pool = form ? form.querySelectorAll(q) : document.querySelectorAll(q);
          for (const el of pool) if (isVisible(el)) return el;
          return null;
        }
        function pickEditor() {
          for (const sel of SELECTORS_ORDERED) {
            const els = queryDeepAll(document, sel);
            const vis = els.filter(isVisible);
            if (vis.length) { console.log("[JobSearchExt]", label, "matched visible:", sel, vis[0]); return vis[0]; }
            if (els.length) {
              console.log("[JobSearchExt]", label, "matched but hidden:", sel, els[0]);
              if (els[0].tagName === "TEXTAREA") {
                const ce = nearestVisibleCE(els[0]); if (ce) return ce;
              }
            } else { console.log("[JobSearchExt]", label, "not found:", sel); }
          }
          return null;
        }
        function insertIntoCE(el, val) {
          el.focus();
          const sel = window.getSelection && window.getSelection();
          if (sel) { const range = document.createRange(); range.selectNodeContents(el); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); }
          let ok = false;
          try { if (typeof document.execCommand === "function") ok = document.execCommand("insertText", false, val); } catch {}
          if (!ok) el.textContent = val;
          el.dispatchEvent(new InputEvent("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        function insertIntoTA(el, val) {
          el.focus();
          const setter =
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set ||
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          if (setter) setter.call(el, val); else el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        function setValue(el, val) {
          if (!el) return false;
          if (el.getAttribute && el.getAttribute("contenteditable") === "true") return insertIntoCE(el, val);
          if (el.tagName === "TEXTAREA" || "value" in el) {
            if (!isVisible(el)) { const ce = nearestVisibleCE(el); if (ce) return insertIntoCE(ce, val); }
            return insertIntoTA(el, val);
          }
          return false;
        }
        function findSendButton() {
          const sels = [
            "form button[data-testid='send-button']",
            "button[data-testid='send-button']",
            "form button[aria-label*='send' i]",
            "button[aria-label*='send' i]",
            "form button[type='submit']",
            "button[type='submit']"
          ];
          for (const s of sels) {
            const c = queryDeepAll(document, s).filter(isVisible);
            if (c.length) { console.log("[JobSearchExt]", label, "send button via", s, c[0]); return c[0]; }
          }
          return null;
        }
        function submit(editorEl) {
          const btn = findSendButton();
          if (btn) {
            let tries = 0; const max = 10;
            const tick = () => {
              const cs = getComputedStyle(btn);
              const disabled = btn.disabled || cs.pointerEvents === "none" || cs.opacity === "0.5";
              if (!disabled) { btn.click(); console.log("[JobSearchExt]", label, "clicked send button"); return true; }
              if (++tries >= max) { console.log("[JobSearchExt]", label, "send disabled; fallback Enter"); return enter(editorEl); }
              setTimeout(tick, 200);
            };
            tick(); return true;
          }
          return enter(editorEl);
        }
        function enter(editorEl) {
          try {
            editorEl.focus();
            const opts = { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 };
            editorEl.dispatchEvent(new KeyboardEvent("keydown", opts));
            editorEl.dispatchEvent(new KeyboardEvent("keyup", opts));
            console.log("[JobSearchExt]", label, "sent Enter");
            return true;
          } catch {
            const form = editorEl.closest && editorEl.closest("form");
            if (form?.requestSubmit) { form.requestSubmit(); console.log("[JobSearchExt]", label, "form.requestSubmit()"); return true; }
          }
          return false;
        }

        // Attempt insert (+ optional submit) with short retries
        let tries = 0;
        const MAX_TRIES_LOCAL = MAX_TRIES;
        const tryOnce = () => {
          const editor = pickEditor();
          if (editor && setValue(editor, text)) {
            console.log("[JobSearchExt]", label, "inserted");
            if (shouldSubmit) setTimeout(() => submit(editor), 150);
            return { inserted: true, submitted: !!shouldSubmit, skipped: false };
          }
          return null;
        };
        const immediate = tryOnce();
        if (immediate) return immediate;

        return new Promise((resolve) => {
          const timer = setInterval(() => {
            const r = tryOnce();
            if (r) { clearInterval(timer); resolve(r); }
            else if (++tries >= MAX_TRIES_LOCAL) {
              clearInterval(timer);
              console.warn("[JobSearchExt]", label, "editor not found — giving up");
              alert("Could not auto-insert text. Please paste manually.");
              resolve({ inserted: false, submitted: false, skipped: false });
            }
          }, INTERVAL);
        });
      },
      args: [prompt, label, autoSubmit, reqId],
      world: "MAIN" // ensure we're in the page's main world
    });

    // Normalize return (MV3 returns array of {result})
    const res = Array.isArray(results) && results[0] && results[0].result;
    debugLog('[Background] Script execution result:', res);
    const ok = !!(res && (res.inserted || res.submitted) && !res.skipped);
    debugLog('[Background] Returning success status:', ok);
    return ok;
  } catch (e) {
    console.error("[Background] executeScript failed:", e);
    try {
      await chrome.tabs.update(tabId, {
        url: `https://chatgpt.com/?q=${encodeURIComponent("Could not auto-insert text. Please paste below.")}`
      });
    } catch {}
    return false;
  }
}

// ====== MESSAGE LISTENER FOR SHORTCUTS ======
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SHORTCUTS') {
    // Content script requesting current shortcuts
    loadConfig().then(config => {
      const shortcuts = buildShortcutMap(config);
      sendResponse({ shortcuts: shortcuts });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'EXECUTE_SHORTCUT') {
    // Content script triggered a shortcut
    if (message.selectionText) {
      handleShortcutExecution(message.actionId, message.selectionText);
    } else {
      console.error('[Background] No selection text in shortcut message');
    }
    return false;
  }
});

// ====== SHORTCUT EXECUTION HANDLER ======
async function handleShortcutExecution(actionId, selectionText) {
  try {
    const config = await loadConfig();

    // V3: actionId is object with {menuId, actionId}
    if (config.menus && Array.isArray(config.menus)) {
      if (typeof actionId === 'object' && actionId.menuId && actionId.actionId) {
        const { menuId, actionId: actId } = actionId;

        // Find the menu
        const menu = config.menus.find(m => m.id === menuId);
        if (!menu) {
          console.warn('[Background] Menu not found for shortcut:', menuId);
          return;
        }

        // Handle "Run All" shortcut
        if (actId === 'runAll') {
          await runAllActions(selectionText, menu, config);
          return;
        }

        // Find the action
        const action = menu.actions.find(a => a.id === actId);
        if (!action) {
          console.warn('[Background] Action not found for shortcut:', actId, 'in menu:', menu.name);
          return;
        }

        // Execute the action
        await executeAction(action, selectionText, menu, config);
      } else {
        console.warn('[Background] Invalid shortcut action ID format:', actionId);
      }
    }
    // V2 fallback
    else {
      // Handle "Run All" shortcut
      if (actionId === 'runAll') {
        await runAllActionsV2(selectionText, config);
        return;
      }

      // Find the action
      const action = config.actions?.find(a => a.id === actionId);
      if (!action) {
        console.warn('[Background] Action not found for shortcut:', actionId);
        return;
      }

      // Execute the action
      await executeActionV2(action, selectionText, config);
    }
  } catch (e) {
    console.error('[Background] Failed to handle shortcut execution:', e);
  }
}
