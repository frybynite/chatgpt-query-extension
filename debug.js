// ====== DEBUG LOGGING UTILITY ======
// Debug logging controlled by hamburger menu toggle
// State is stored in chrome.storage.local (persists across extension reloads and browser sessions)

const DEBUG_KEY = 'debugLogging';

// Get current debug state
async function isDebugEnabled() {
  try {
    // Use local storage (persists across extension reloads)
    const result = await chrome.storage.local.get(DEBUG_KEY);
    return result[DEBUG_KEY] === true;
  } catch (e) {
    // storage not available, default to false
    return false;
  }
}

// Set debug state
async function setDebugEnabled(enabled) {
  try {
    await chrome.storage.local.set({ [DEBUG_KEY]: enabled });
  } catch (e) {
    console.error('[Debug] Failed to set debug state:', e);
  }
}

// Debug logging function - only logs if debug is enabled
async function debugLog(...args) {
  if (await isDebugEnabled()) {
    console.log(...args);
  }
}

// Synchronous version using cached state (for performance)
let cachedDebugState = false;

// Initialize cache
isDebugEnabled().then(enabled => {
  cachedDebugState = enabled;
});

// Listen for changes
try {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[DEBUG_KEY]) {
      cachedDebugState = changes[DEBUG_KEY].newValue === true;
    }
  });
} catch (e) {
  // Ignore if storage.onChanged not available
}

// Fast synchronous version using cache
function debugLogSync(...args) {
  if (cachedDebugState) {
    console.log(...args);
  }
}

// Export for ES modules
export { isDebugEnabled, setDebugEnabled, debugLog, debugLogSync };
