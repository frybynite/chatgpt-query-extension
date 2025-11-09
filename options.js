import { getConfig, saveConfig, validateConfig } from './config.js';
import { isDebugEnabled, setDebugEnabled, debugLogSync as debugLog } from './debug.js';

// ====== DOM ELEMENTS ======
// Menu management
const menuListContainer = document.getElementById('menu-list');
const addMenuButton = document.getElementById('add-menu');
const menuCountDisplay = document.getElementById('menu-count');
const noMenuSelected = document.getElementById('no-menu-selected');
const menuDetailContent = document.getElementById('menu-detail-content');
const deleteMenuButton = document.getElementById('delete-menu');
const menuTemplate = document.getElementById('menu-template');

// Menu configuration
const menuNameInput = document.getElementById('menuName');
const customGptUrlInput = document.getElementById('customGptUrl');
const autoSubmitCheckbox = document.getElementById('autoSubmit');
const runAllEnabledCheckbox = document.getElementById('runAllEnabled');
const runAllShortcutInput = document.getElementById('runAllShortcut');
const runAllShortcutBtn = document.getElementById('runAllShortcutBtn');
const runAllShortcutGroup = document.getElementById('runAllShortcutGroup');

// Actions
const actionsListContainer = document.getElementById('actions-list');
const addActionButton = document.getElementById('add-action');
const actionTemplate = document.getElementById('action-template');

// Global actions
const saveButton = document.getElementById('save');
const revertButton = document.getElementById('revert-changes');
const revertAllButton = document.getElementById('revert-all-changes');
const exportButton = document.getElementById('export-config');
const importButton = document.getElementById('import-config');
const importFileInput = document.getElementById('import-file-input');

// Hamburger menu
const hamburgerButton = document.getElementById('hamburger-menu');
const dropdownMenu = document.getElementById('dropdown-menu');
const debugLoggingToggle = document.getElementById('debug-logging-toggle');

// Banners
const errorBanner = document.getElementById('error-banner');
const warningBanner = document.getElementById('warning-banner');
const successBanner = document.getElementById('success-banner');
const reloadReminder = document.getElementById('reload-reminder');

// Modal
const modalOverlay = document.getElementById('modal-overlay');
const modalDialog = modalOverlay.querySelector('.modal-dialog');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const modalOk = document.getElementById('modal-ok');
const modalCancel = document.getElementById('modal-cancel');

// ====== PLATFORM DETECTION ======
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// ====== SHORTCUT CONVERSION ======
// Convert shortcuts to platform-appropriate display format
// Input is always in Chrome format (Ctrl, Alt, Shift, Meta)
// Output is Mac symbols on Mac, Chrome format on Windows/Linux
function convertShortcutForDisplay(shortcut) {
  if (!shortcut) return '';

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

// Convert shortcuts to word format for tooltips
// Input is always in Chrome format (Ctrl, Alt, Shift, Meta) or legacy Mac symbols
// Output uses platform-appropriate names:
//   Mac: Ctrl → "Control", Alt → "Option", Shift → "Shift", Meta → "Command"
//   Windows: Ctrl → "Control", Alt → "Alt", Shift → "Shift", Meta → "Windows"
function convertShortcutToWords(shortcut) {
  if (!shortcut) return '';

  const parts = shortcut.split('+');

  const convertedParts = parts.map(part => {
    const trimmed = part.trim();

    // First handle legacy Mac symbols (for backward compatibility)
    if (trimmed === '⌃') return 'Control';
    if (trimmed === '⌥') return isMac ? 'Option' : 'Alt';
    if (trimmed === '⇧') return 'Shift';
    if (trimmed === '⌘') return isMac ? 'Command' : 'Windows';

    // Handle Chrome format - convert to platform-appropriate names
    if (trimmed === 'Ctrl') return 'Control';
    if (trimmed === 'Alt') return isMac ? 'Option' : 'Alt';
    if (trimmed === 'Shift') return 'Shift';
    if (trimmed === 'Meta') return isMac ? 'Command' : 'Windows';

    // Return as-is for regular keys (letters, numbers, arrow keys, etc.)
    return trimmed;
  });

  return convertedParts.join(' + ');
}

// Update shortcut input field with formatted display and tooltip
function updateShortcutDisplay(shortcutInput, shortcutValue) {
  if (shortcutInput) {
    // Set the display value (symbols/abbreviations only)
    shortcutInput.value = convertShortcutForDisplay(shortcutValue);
    
    // Update custom tooltip with word version
    const wordVersion = convertShortcutToWords(shortcutValue);
    let tooltipElement = shortcutInput.parentElement.querySelector('.shortcut-tooltip');
    
    if (wordVersion) {
      if (!tooltipElement) {
        // Create tooltip element if it doesn't exist
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'shortcut-tooltip';
        shortcutInput.parentElement.appendChild(tooltipElement);
        setupTooltipEvents(shortcutInput, tooltipElement);
      }
      tooltipElement.textContent = wordVersion;
    } else {
      // Hide tooltip if no shortcut (but keep element for reuse)
      if (tooltipElement) {
        tooltipElement.classList.remove('show');
        tooltipElement.textContent = '';
      }
    }
  }
}

// Setup tooltip hover events with fast delay (150ms instead of default ~300ms)
function setupTooltipEvents(input, tooltip) {
  // Check if already set up (prevent duplicate listeners)
  if (input.dataset.tooltipSetup === 'true') {
    return;
  }
  
  let hoverTimeout;
  
  const showTooltip = () => {
    hoverTimeout = setTimeout(() => {
      tooltip.classList.add('show');
    }, 150); // 150ms delay (half the default ~300ms)
  };
  
  const hideTooltip = () => {
    clearTimeout(hoverTimeout);
    tooltip.classList.remove('show');
  };
  
  // Add event listeners
  input.addEventListener('mouseenter', showTooltip);
  input.addEventListener('mouseleave', hideTooltip);
  input.addEventListener('focus', showTooltip);
  input.addEventListener('blur', hideTooltip);
  
  // Mark as set up
  input.dataset.tooltipSetup = 'true';
}

// Normalize a shortcut string to Chrome format (convert Mac symbols, preserve order)
// Modifier order doesn't matter for matching (done by sets), but we normalize symbols for storage consistency
function normalizeShortcutString(shortcut) {
  if (!shortcut) return '';

  // Convert Mac symbols to Chrome format, preserve order
  return shortcut
    .replace(/⌃/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift')
    .replace(/⌘/g, 'Meta');
}

// Extract raw shortcut value from displayed format and normalize to Chrome format
// Display values may be in Mac symbols (⌃, ⌥, ⇧, ⌘) or Chrome format (Ctrl, Alt, Shift, Meta)
// Converts symbols to Chrome format (order doesn't matter - matching is done by modifier sets)
function extractRawShortcut(displayValue) {
  return normalizeShortcutString(displayValue);
}

// ====== STATE ======
let currentConfig = null;
let selectedMenuId = null;
let draggedElement = null;
let draggedMenuElement = null;
let savedFormStates = new Map();  // Map of menuId -> saved form state for each menu
let dirtyMenus = new Set();       // Set of menuIds with unsaved changes

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndRender();
  attachEventListeners();

  // Initialize debug logging toggle
  const debugEnabled = await isDebugEnabled();
  debugLoggingToggle.checked = debugEnabled;
});

// ====== LOAD AND RENDER ======
async function loadAndRender() {
  try {
    currentConfig = await getConfig();

    // Render menu list
    renderMenuList();

    // Select first menu by default
    if (currentConfig.menus && currentConfig.menus.length > 0) {
      const firstMenu = currentConfig.menus.sort((a, b) => a.order - b.order)[0];
      selectMenu(firstMenu.id);
    } else {
      // No menus - show empty state
      showNoMenuSelected();
      updateRevertButtons();
    }

    // Hide banners and reload reminder
    hideAllBanners();
    reloadReminder.classList.add('hidden');
  } catch (e) {
    showError('Failed to load configuration: ' + e.message);
  }
}

// ====== MENU LIST RENDERING ======
function renderMenuList() {
  menuListContainer.innerHTML = '';

  if (!currentConfig.menus || currentConfig.menus.length === 0) {
    updateMenuCount();
    return;
  }

  const sortedMenus = [...currentConfig.menus].sort((a, b) => a.order - b.order);

  sortedMenus.forEach(menu => {
    const menuElement = createMenuElement(menu);
    menuListContainer.appendChild(menuElement);
  });

  updateMenuCount();
}

function createMenuElement(menu) {
  const template = menuTemplate.content.cloneNode(true);
  const menuItem = template.querySelector('.menu-item');

  menuItem.dataset.menuId = menu.id;
  menuItem.querySelector('.menu-name').textContent = menu.name;

  // Add unsaved changes indicator if this menu has unsaved changes
  if (dirtyMenus.has(menu.id)) {
    const indicator = document.createElement('span');
    indicator.className = 'menu-unsaved-indicator';
    menuItem.insertBefore(indicator, menuItem.querySelector('.menu-name'));
  }

  // Mark as selected if this is the currently selected menu
  if (menu.id === selectedMenuId) {
    menuItem.classList.add('selected');
  }

  // Attach click handler
  menuItem.addEventListener('click', () => selectMenu(menu.id));

  // Drag and drop for reordering
  const dragHandle = menuItem.querySelector('.menu-drag-handle');
  dragHandle.addEventListener('mousedown', () => {
    menuItem.draggable = true;
  });

  menuItem.addEventListener('dragstart', handleMenuDragStart);
  menuItem.addEventListener('dragover', handleMenuDragOver);
  menuItem.addEventListener('drop', handleMenuDrop);
  menuItem.addEventListener('dragend', handleMenuDragEnd);

  return menuItem;
}

function updateMenuCount() {
  const count = currentConfig.menus ? currentConfig.menus.length : 0;
  menuCountDisplay.textContent = `${count}/10 menus`;

  // Disable add button if at limit
  if (count >= 10) {
    addMenuButton.disabled = true;
    addMenuButton.title = 'Maximum 10 menus reached';
  } else {
    addMenuButton.disabled = false;
    addMenuButton.title = '';
  }
}

// ====== MENU SELECTION ======
function selectMenu(menuId) {
  // Save current form state to config before switching (if there was a previous selection)
  if (selectedMenuId && selectedMenuId !== menuId) {
    syncFormToConfig();
  }

  selectedMenuId = menuId;

  // Update selected state in sidebar
  menuListContainer.querySelectorAll('.menu-item').forEach(item => {
    if (item.dataset.menuId === menuId) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });

  // Show detail panel
  noMenuSelected.classList.add('hidden');
  menuDetailContent.classList.remove('hidden');

  // Scroll to top of page to show menu details
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Load menu details
  loadMenuDetails(menuId);

  // Update revert button states
  updateRevertButtons();
}

function showNoMenuSelected() {
  selectedMenuId = null;
  noMenuSelected.classList.remove('hidden');
  menuDetailContent.classList.add('hidden');
}

function loadMenuDetails(menuId) {
  const menu = currentConfig.menus.find(m => m.id === menuId);
  if (!menu) {
    showError('Menu not found');
    return;
  }

  // Populate menu configuration
  menuNameInput.value = menu.name;
  customGptUrlInput.value = menu.customGptUrl;
  autoSubmitCheckbox.checked = menu.autoSubmit;
  runAllEnabledCheckbox.checked = menu.runAllEnabled;
  updateShortcutDisplay(runAllShortcutInput, menu.runAllShortcut || '');

  // Show/hide Run All shortcut based on checkbox
  toggleRunAllShortcutVisibility();

  // Render actions for this menu
  renderActions(menu);

  // Capture initial state for change detection (only if not already saved)
  if (!savedFormStates.has(menuId)) {
    savedFormStates.set(menuId, captureFormState());
  }
}

// ====== UNSAVED CHANGES TRACKING ======
function syncFormToConfig() {
  if (!selectedMenuId) return;

  const menu = currentConfig.menus.find(m => m.id === selectedMenuId);
  if (!menu) return;

  // Update menu fields from form
  menu.name = menuNameInput.value.trim();
  menu.customGptUrl = customGptUrlInput.value.trim();
  menu.autoSubmit = autoSubmitCheckbox.checked;
  menu.runAllEnabled = runAllEnabledCheckbox.checked;
  menu.runAllShortcut = extractRawShortcut(runAllShortcutInput.value);

  // Update actions from DOM
  menu.actions = [];
  const actionItems = actionsListContainer.querySelectorAll('.action-item');
  actionItems.forEach((item, index) => {
    menu.actions.push({
      id: item.dataset.actionId,
      title: item.querySelector('.action-title').value.trim(),
      prompt: item.querySelector('.action-prompt').value.trim(),
      shortcut: extractRawShortcut(item.querySelector('.action-shortcut').value),
      enabled: item.querySelector('.action-enabled').checked,
      order: index + 1
    });
  });
}

function captureFormState() {
  if (!selectedMenuId) return null;

  const state = {
    menuId: selectedMenuId,
    menuName: menuNameInput.value.trim(),
    customGptUrl: customGptUrlInput.value.trim(),
    autoSubmit: autoSubmitCheckbox.checked,
    runAllEnabled: runAllEnabledCheckbox.checked,
    runAllShortcut: extractRawShortcut(runAllShortcutInput.value),
    actions: []
  };

  // Capture all actions
  const actionItems = actionsListContainer.querySelectorAll('.action-item');
  actionItems.forEach((item, index) => {
    state.actions.push({
      id: item.dataset.actionId,
      order: index + 1,
      title: item.querySelector('.action-title').value.trim(),
      prompt: item.querySelector('.action-prompt').value.trim(),
      shortcut: extractRawShortcut(item.querySelector('.action-shortcut').value),
      enabled: item.querySelector('.action-enabled').checked
    });
  });

  return state;
}

function compareFormStates(state1, state2) {
  if (!state1 || !state2) return true; // Different if either is null
  if (state1.menuId !== state2.menuId) return true;

  // Compare menu fields
  if (state1.menuName !== state2.menuName) return true;
  if (state1.customGptUrl !== state2.customGptUrl) return true;
  if (state1.autoSubmit !== state2.autoSubmit) return true;
  if (state1.runAllEnabled !== state2.runAllEnabled) return true;
  if (state1.runAllShortcut !== state2.runAllShortcut) return true;

  // Compare actions (order, count, and content)
  if (state1.actions.length !== state2.actions.length) return true;

  for (let i = 0; i < state1.actions.length; i++) {
    const a1 = state1.actions[i];
    const a2 = state2.actions[i];

    if (a1.id !== a2.id) return true;
    if (a1.order !== a2.order) return true;
    if (a1.title !== a2.title) return true;
    if (a1.prompt !== a2.prompt) return true;
    if (a1.shortcut !== a2.shortcut) return true;
    if (a1.enabled !== a2.enabled) return true;
  }

  return false; // No differences
}

function checkForChanges() {
  if (!selectedMenuId) return;

  const currentState = captureFormState();
  const savedState = savedFormStates.get(selectedMenuId);
  const hasChanges = compareFormStates(savedState, currentState);

  const wasDirty = dirtyMenus.has(selectedMenuId);

  if (hasChanges && !wasDirty) {
    dirtyMenus.add(selectedMenuId);
    updateMenuIndicator();
    updateRevertButtons();
  } else if (!hasChanges && wasDirty) {
    dirtyMenus.delete(selectedMenuId);
    updateMenuIndicator();
    updateRevertButtons();
  }
}

function updateMenuIndicator() {
  // Re-render menu list to update indicator
  renderMenuList();
}

function updateRevertButtons() {
  const revertBtn = document.getElementById('revert-changes');
  const revertAllBtn = document.getElementById('revert-all-changes');

  if (!revertBtn || !revertAllBtn) return;

  // Update "Revert Changes" button - visible only if current menu is dirty
  const currentMenuDirty = selectedMenuId && dirtyMenus.has(selectedMenuId);
  if (currentMenuDirty) {
    revertBtn.classList.remove('hidden');
  } else {
    revertBtn.classList.add('hidden');
  }

  // Update "Revert All Changes" button - visible only if 2+ menus are dirty
  const dirtyCount = dirtyMenus.size;
  if (dirtyCount > 1) {
    revertAllBtn.classList.remove('hidden');
  } else {
    revertAllBtn.classList.add('hidden');
  }
}

// ====== MENU CRUD OPERATIONS ======
function handleAddMenu() {
  if (currentConfig.menus.length >= 10) {
    showError('Maximum 10 menus allowed');
    return;
  }

  // Generate unique ID
  const menuId = `menu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Create new menu
  const newMenu = {
    id: menuId,
    name: `New Menu ${currentConfig.menus.length + 1}`,
    customGptUrl: 'https://chatgpt.com/g/g-<<YOUR CUSTOM GPT URL>>',
    autoSubmit: true,
    runAllEnabled: false,
    runAllShortcut: '',
    order: currentConfig.menus.length + 1,
    actions: []
  };

  // Add to config
  currentConfig.menus.push(newMenu);

  // Re-render menu list
  renderMenuList();

  // Select the new menu
  selectMenu(menuId);

  // Focus on menu name input
  menuNameInput.focus();
  menuNameInput.select();

  hideAllBanners();
}

async function handleDeleteMenu() {
  if (!selectedMenuId) return;

  const menu = currentConfig.menus.find(m => m.id === selectedMenuId);
  if (!menu) return;

  const actionCount = menu.actions.length;
  const confirmMessage = actionCount > 0
    ? `Delete menu "${menu.name}" and its ${actionCount} action(s)?`
    : `Delete menu "${menu.name}"?`;

  const confirmed = await showConfirmModal('Delete Menu', confirmMessage, 'warning');
  if (!confirmed) return;

  // Remove menu
  currentConfig.menus = currentConfig.menus.filter(m => m.id !== selectedMenuId);

  // Reorder remaining menus
  currentConfig.menus.forEach((m, index) => {
    m.order = index + 1;
  });

  // Select another menu or show empty state
  if (currentConfig.menus.length > 0) {
    const firstMenu = currentConfig.menus.sort((a, b) => a.order - b.order)[0];
    selectedMenuId = firstMenu.id;
  } else {
    selectedMenuId = null;
  }

  // Save config
  try {
    await saveConfig(currentConfig);

    // Re-render
    renderMenuList();
    if (selectedMenuId) {
      selectMenu(selectedMenuId);
    } else {
      showNoMenuSelected();
    }

    showSuccess(`Menu "${menu.name}" deleted successfully`);
  } catch (e) {
    showError('Failed to delete menu: ' + e.message);
  }
}

async function handleRevertCurrent() {
  if (!selectedMenuId) return;
  if (!dirtyMenus.has(selectedMenuId)) return;

  const menu = currentConfig.menus.find(m => m.id === selectedMenuId);
  if (!menu) return;

  const menuName = menu.name; // Save for success message

  const confirmed = await showConfirmModal(
    'Revert Changes',
    `Discard unsaved changes to "${menuName}"?`,
    'warning'
  );
  if (!confirmed) return;

  try {
    // Reload config from storage to get the saved state
    const savedConfig = await getConfig();
    const savedMenu = savedConfig.menus.find(m => m.id === selectedMenuId);

    if (!savedMenu) {
      showError('Cannot find saved menu');
      return;
    }

    // Update currentConfig to match saved menu from storage
    const menuIndex = currentConfig.menus.findIndex(m => m.id === selectedMenuId);
    if (menuIndex === -1) return;

    currentConfig.menus[menuIndex] = { ...savedMenu };

    // Remove from dirty menus
    dirtyMenus.delete(selectedMenuId);

    // Reload the menu details to update form
    loadMenuDetails(selectedMenuId);

    // Recapture the form state after loading reverted values
    savedFormStates.set(selectedMenuId, captureFormState());

    // Update UI
    renderMenuList();
    updateRevertButtons();

    showSuccess(`Changes reverted successfully`);
  } catch (e) {
    showError('Failed to revert changes: ' + e.message);
  }
}

async function handleRevertAll() {
  if (dirtyMenus.size === 0) return;

  const dirtyCount = dirtyMenus.size;
  const confirmed = await showConfirmModal(
    'Revert All Changes',
    `Discard unsaved changes to ${dirtyCount} menu${dirtyCount > 1 ? 's' : ''}?`,
    'warning'
  );
  if (!confirmed) return;

  try {
    // Reload config from storage to get the saved state for all menus
    const savedConfig = await getConfig();

    // Revert each dirty menu by replacing with saved version from storage
    for (const menuId of dirtyMenus) {
      const savedMenu = savedConfig.menus.find(m => m.id === menuId);
      if (!savedMenu) continue;

      const menuIndex = currentConfig.menus.findIndex(m => m.id === menuId);
      if (menuIndex === -1) continue;

      currentConfig.menus[menuIndex] = { ...savedMenu };
    }

    // Clear all dirty menus
    dirtyMenus.clear();

    // Reload current menu details if there's a selected menu
    if (selectedMenuId) {
      loadMenuDetails(selectedMenuId);
      // Recapture the form state after loading reverted values
      savedFormStates.set(selectedMenuId, captureFormState());
    }

    // Recapture saved states for all menus from the reloaded config
    for (const menuId of Array.from(savedFormStates.keys())) {
      if (menuId !== selectedMenuId) {
        // For non-selected menus, update savedFormStates from currentConfig
        const menu = currentConfig.menus.find(m => m.id === menuId);
        if (menu) {
          savedFormStates.set(menuId, {
            name: menu.name,
            customGptUrl: menu.customGptUrl,
            autoSubmit: menu.autoSubmit,
            runAllEnabled: menu.runAllEnabled,
            runAllShortcut: menu.runAllShortcut,
            actions: menu.actions.map(a => ({ ...a }))
          });
        }
      }
    }

    // Update UI
    renderMenuList();
    updateRevertButtons();

    showSuccess(`All changes reverted successfully (${dirtyCount} menu${dirtyCount > 1 ? 's' : ''})`);
  } catch (e) {
    showError('Failed to revert changes: ' + e.message);
  }
}

// ====== MENU DRAG AND DROP ======
function handleMenuDragStart(e) {
  draggedMenuElement = e.target.closest('.menu-item');
  draggedMenuElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleMenuDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const afterElement = getDragAfterElement(menuListContainer, e.clientY);
  if (afterElement == null) {
    menuListContainer.appendChild(draggedMenuElement);
  } else {
    menuListContainer.insertBefore(draggedMenuElement, afterElement);
  }
}

function handleMenuDrop(e) {
  e.preventDefault();
  updateMenuOrders();
}

function handleMenuDragEnd(e) {
  if (draggedMenuElement) {
    draggedMenuElement.classList.remove('dragging');
    draggedMenuElement.draggable = false;
    draggedMenuElement = null;
  }
}

async function updateMenuOrders() {
  const menuItems = menuListContainer.querySelectorAll('.menu-item');
  menuItems.forEach((item, index) => {
    const menuId = item.dataset.menuId;
    const menu = currentConfig.menus.find(m => m.id === menuId);
    if (menu) {
      menu.order = index + 1;
    }
  });

  // Auto-save the new order
  try {
    await saveConfig(currentConfig);
    showSuccess('Menu order updated');
  } catch (e) {
    showError('Failed to save menu order: ' + e.message);
  }
}

// ====== ACTIONS RENDERING ======
function renderActions(menu) {
  actionsListContainer.innerHTML = '';

  if (!menu.actions || menu.actions.length === 0) {
    return;
  }

  const sortedActions = [...menu.actions].sort((a, b) => a.order - b.order);

  sortedActions.forEach((action, index) => {
    const actionElement = createActionElement(action, index);
    actionsListContainer.appendChild(actionElement);
  });
}

function createActionElement(action, index) {
  const template = actionTemplate.content.cloneNode(true);
  const actionItem = template.querySelector('.action-item');

  actionItem.dataset.actionId = action.id;
  actionItem.dataset.order = action.order;

  const titleInput = actionItem.querySelector('.action-title');
  const promptInput = actionItem.querySelector('.action-prompt');
  const shortcutInput = actionItem.querySelector('.action-shortcut');
  const enabledCheckbox = actionItem.querySelector('.action-enabled');

  titleInput.value = action.title;
  promptInput.value = action.prompt;
  enabledCheckbox.checked = action.enabled;
  
  // Update shortcut display (this will also set up tooltip)
  updateShortcutDisplay(shortcutInput, action.shortcut || '');

  attachActionEventListeners(actionItem);

  return actionItem;
}

// ====== ACTION EVENT LISTENERS ======
function attachActionEventListeners(actionItem) {
  const moveUpBtn = actionItem.querySelector('[data-action="move-up"]');
  moveUpBtn.addEventListener('click', () => moveActionUp(actionItem));

  const moveDownBtn = actionItem.querySelector('[data-action="move-down"]');
  moveDownBtn.addEventListener('click', () => moveActionDown(actionItem));

  const deleteBtn = actionItem.querySelector('[data-action="delete"]');
  deleteBtn.addEventListener('click', () => deleteAction(actionItem));

  const captureBtn = actionItem.querySelector('.btn-capture');
  const shortcutInput = actionItem.querySelector('.action-shortcut');
  captureBtn.addEventListener('click', () => captureShortcut(shortcutInput));

  shortcutInput.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      updateShortcutDisplay(shortcutInput, '');
      reloadReminder.classList.remove('hidden');
      hideAllBanners();
    }
  });

  const titleInput = actionItem.querySelector('.action-title');
  const promptInput = actionItem.querySelector('.action-prompt');
  const enabledCheckbox = actionItem.querySelector('.action-enabled');

  titleInput.addEventListener('input', () => {
    if (titleInput.value.trim()) {
      titleInput.classList.remove('error');
    }
    checkForChanges();
  });

  promptInput.addEventListener('input', () => {
    if (promptInput.value.trim()) {
      promptInput.classList.remove('error');
    }
    checkForChanges();
  });

  enabledCheckbox.addEventListener('change', checkForChanges);

  // Drag and drop
  const dragHandle = actionItem.querySelector('.drag-handle');
  dragHandle.addEventListener('mousedown', () => {
    actionItem.draggable = true;
  });

  actionItem.addEventListener('dragstart', handleActionDragStart);
  actionItem.addEventListener('dragover', handleActionDragOver);
  actionItem.addEventListener('drop', handleActionDrop);
  actionItem.addEventListener('dragend', handleActionDragEnd);
}

// ====== ACTION MANIPULATION ======
function moveActionUp(actionItem) {
  const previousItem = actionItem.previousElementSibling;
  if (previousItem) {
    actionsListContainer.insertBefore(actionItem, previousItem);
    updateActionOrders();
  }
}

function moveActionDown(actionItem) {
  const nextItem = actionItem.nextElementSibling;
  if (nextItem) {
    actionsListContainer.insertBefore(nextItem, actionItem);
    updateActionOrders();
  }
}

async function deleteAction(actionItem) {
  const actionTitle = actionItem.querySelector('.action-title').value || 'this action';

  const confirmed = await showConfirmModal('Delete Action', `Delete "${actionTitle}"?`, 'warning');
  if (confirmed) {
    actionItem.remove();
    updateActionOrders();
    checkForChanges();
  }
}

function updateActionOrders() {
  const actionItems = actionsListContainer.querySelectorAll('.action-item');
  actionItems.forEach((item, index) => {
    item.dataset.order = index + 1;
  });
  checkForChanges();
}

function handleAddAction() {
  if (!selectedMenuId) {
    showError('Please select a menu first');
    return;
  }

  const menu = currentConfig.menus.find(m => m.id === selectedMenuId);
  if (!menu) return;

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  const newId = `action_${timestamp}_${randomStr}`;

  const newAction = {
    id: newId,
    title: 'New Action',
    prompt: '',
    shortcut: '',
    enabled: true,
    order: actionsListContainer.children.length + 1
  };

  const actionElement = createActionElement(newAction, actionsListContainer.children.length);
  actionsListContainer.appendChild(actionElement);

  const titleInput = actionElement.querySelector('.action-title');
  titleInput.focus();
  titleInput.select();

  // Mark form as changed
  checkForChanges();
}

// ====== ACTION DRAG AND DROP ======
function handleActionDragStart(e) {
  draggedElement = e.target.closest('.action-item');
  draggedElement.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleActionDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const afterElement = getDragAfterElement(actionsListContainer, e.clientY);
  if (afterElement == null) {
    actionsListContainer.appendChild(draggedElement);
  } else {
    actionsListContainer.insertBefore(draggedElement, afterElement);
  }
}

function handleActionDrop(e) {
  e.preventDefault();
  updateActionOrders();
}

function handleActionDragEnd(e) {
  if (draggedElement) {
    draggedElement.classList.remove('dragging');
    draggedElement.draggable = false;
    draggedElement = null;
  }
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.action-item:not(.dragging), .menu-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ====== SHORTCUT CAPTURE ======
function captureShortcut(shortcutInput) {
  shortcutInput.value = 'Press keys...';
  shortcutInput.classList.add('capturing');

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const code = e.code;

    if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
         'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(code)) {
      return;
    }

    const parts = [];
    // Always capture in Chrome format (will be converted to Mac symbols for display)
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');

    if (parts.length === 0) {
      updateShortcutDisplay(shortcutInput, '');
      shortcutInput.classList.remove('capturing');
      const modifierHint = isMac
        ? 'modifier key (⌃ Control, ⌥ Option, ⇧ Shift, or ⌘ Command)'
        : 'modifier key (Ctrl, Alt, Shift, or Meta/Cmd)';
      showError(`Shortcut must include at least one ${modifierHint}`);
      document.removeEventListener('keydown', handleKeyDown, true);
      return;
    }

    let displayKey;
    if (code.startsWith('Key')) {
      displayKey = code.replace('Key', '');
    } else if (code.startsWith('Digit')) {
      displayKey = code.replace('Digit', '');
    } else if (code.startsWith('Arrow')) {
      displayKey = code.replace('Arrow', '');
    } else {
      displayKey = code;
    }

    parts.push(displayKey);

    const shortcutString = parts.join('+');
    
    // Update display with formatted version (symbols + word version)
    updateShortcutDisplay(shortcutInput, shortcutString);

    reloadReminder.classList.remove('hidden');
    checkShortcutDuplicate(shortcutInput, shortcutString);

    shortcutInput.classList.remove('capturing');
    document.removeEventListener('keydown', handleKeyDown, true);
  };

  document.addEventListener('keydown', handleKeyDown, true);
}

function checkShortcutDuplicate(currentInput, shortcut) {
  if (!shortcut) return;

  // Build a temporary config with current DOM state
  const isRunAllInput = (currentInput === runAllShortcutInput);
  let tempConfig = JSON.parse(JSON.stringify(currentConfig)); // Deep clone

  // Update the current menu with DOM state (in case there are unsaved changes)
  if (selectedMenuId) {
    const menu = tempConfig.menus.find(m => m.id === selectedMenuId);
    if (menu) {
      // Update Run All settings from form
      menu.runAllEnabled = runAllEnabledCheckbox.checked;
      menu.runAllShortcut = extractRawShortcut(runAllShortcutInput.value);

      // Collect current actions from DOM
      menu.actions = [];
      const actionItems = actionsListContainer.querySelectorAll('.action-item');
      actionItems.forEach((item, index) => {
        const actionId = item.dataset.actionId;
        const title = item.querySelector('.action-title').value.trim();
        const shortcutVal = extractRawShortcut(item.querySelector('.action-shortcut').value);

        menu.actions.push({
          id: actionId,
          title: title || 'Unnamed',
          prompt: '',
          shortcut: shortcutVal,
          enabled: true,
          order: index + 1
        });
      });
    }
  }

  // Now update the specific shortcut being set
  if (isRunAllInput) {
    const menu = tempConfig.menus.find(m => m.id === selectedMenuId);
    if (menu) {
      menu.runAllShortcut = shortcut;
    }
  } else {
    const currentActionItem = currentInput.closest('.action-item');
    if (currentActionItem) {
      const actionId = currentActionItem.dataset.actionId;
      const menu = tempConfig.menus.find(m => m.id === selectedMenuId);
      if (menu) {
        const action = menu.actions.find(a => a.id === actionId);
        if (action) {
          action.shortcut = shortcut;
        }
      }
    }
  }

  // Check for conflicts in the simulated config
  const conflicts = checkAllShortcutConflicts(tempConfig);

  if (conflicts.length > 0) {
    // Find the conflict involving this shortcut
    const thisConflict = conflicts.find(c => c.shortcut === shortcut);
    if (thisConflict) {
      const locationDescriptions = thisConflict.locations.map(loc =>
        `"${loc.menuName}" - ${loc.actionTitle}`
      );
      showError(`This shortcut is already used by: ${locationDescriptions.join(' and ')}`);
    }
  } else {
    hideAllBanners();
  }
}

// ====== SHORTCUT CONFLICT DETECTION ======
function checkAllShortcutConflicts(config) {
  const conflicts = [];
  const shortcutMap = new Map(); // shortcut -> array of {menuName, actionTitle, menuId, actionId}

  // Build a map of all shortcuts
  config.menus.forEach(menu => {
    // Check Run All shortcuts
    if (menu.runAllEnabled && menu.runAllShortcut) {
      const shortcut = menu.runAllShortcut;
      if (!shortcutMap.has(shortcut)) {
        shortcutMap.set(shortcut, []);
      }
      shortcutMap.get(shortcut).push({
        menuName: menu.name,
        actionTitle: 'Run All',
        menuId: menu.id,
        actionId: null,
        isRunAll: true
      });
    }

    // Check action shortcuts (only enabled actions with shortcuts matter)
    menu.actions.forEach(action => {
      if (action.shortcut) {
        const shortcut = action.shortcut;
        if (!shortcutMap.has(shortcut)) {
          shortcutMap.set(shortcut, []);
        }
        shortcutMap.get(shortcut).push({
          menuName: menu.name,
          actionTitle: action.title,
          menuId: menu.id,
          actionId: action.id,
          isRunAll: false
        });
      }
    });
  });

  // Find conflicts (shortcuts used more than once)
  shortcutMap.forEach((locations, shortcut) => {
    if (locations.length > 1) {
      conflicts.push({
        shortcut: shortcut,
        locations: locations
      });
    }
  });

  return conflicts;
}

// ====== SAVE MENU ======
async function handleSave() {
  if (!selectedMenuId) {
    showError('No menu selected');
    return;
  }

  try {
    hideAllBanners();

    document.querySelectorAll('.action-title, .action-prompt').forEach(input => {
      input.classList.remove('error');
    });

    const menu = currentConfig.menus.find(m => m.id === selectedMenuId);
    if (!menu) {
      showError('Menu not found');
      return;
    }

    // Update menu configuration from form
    const menuName = menuNameInput.value.trim();
    if (!menuName) {
      menuNameInput.classList.add('error');
      showError('Menu name is required');
      return;
    }

    if (menuName.length > 50) {
      menuNameInput.classList.add('error');
      showError('Menu name must be 50 characters or less');
      return;
    }

    menu.name = menuName;
    menu.customGptUrl = customGptUrlInput.value.trim();
    menu.autoSubmit = autoSubmitCheckbox.checked;
    menu.runAllEnabled = runAllEnabledCheckbox.checked;
    menu.runAllShortcut = extractRawShortcut(runAllShortcutInput.value);

    // Collect actions from DOM
    menu.actions = [];
    let hasEmptyRequiredFields = false;

    const actionItems = actionsListContainer.querySelectorAll('.action-item');
    actionItems.forEach((item, index) => {
      const id = item.dataset.actionId;
      const titleInput = item.querySelector('.action-title');
      const promptInput = item.querySelector('.action-prompt');
      const shortcut = extractRawShortcut(item.querySelector('.action-shortcut').value);
      const enabled = item.querySelector('.action-enabled').checked;

      const title = titleInput.value.trim();
      const prompt = promptInput.value.trim();

      if (!title) {
        titleInput.classList.add('error');
        hasEmptyRequiredFields = true;
      }

      if (!prompt) {
        promptInput.classList.add('error');
        hasEmptyRequiredFields = true;
      }

      menu.actions.push({
        id: id,
        title: title,
        prompt: prompt,
        shortcut: shortcut,
        enabled: enabled,
        order: index + 1
      });
    });

    if (hasEmptyRequiredFields) {
      showError('Please fill in all required fields (Action Title and Prompt)');
      return;
    }

    // Check for placeholder URL
    if (menu.customGptUrl.includes('<<YOUR CUSTOM GPT URL>>')) {
      showError('Please replace "<<YOUR CUSTOM GPT URL>>" with your actual Custom GPT URL');
      return;
    }

    // Check for shortcut conflicts BEFORE saving
    const conflicts = checkAllShortcutConflicts(currentConfig);
    if (conflicts.length > 0) {
      const errorMessages = conflicts.map(conflict => {
        const locationDescriptions = conflict.locations.map(loc =>
          `"${loc.menuName}" - ${loc.actionTitle}`
        );
        return `Shortcut "${conflict.shortcut}" is used by: ${locationDescriptions.join(' and ')}`;
      });
      showError('Shortcut conflicts detected:\n' + errorMessages.join('\n'));
      return;
    }

    // Add version if missing
    if (!currentConfig.version) {
      currentConfig.version = 3;
    }

    // Validate entire config
    const errors = validateConfig(currentConfig);
    if (errors.length > 0) {
      showError('Validation failed: ' + errors.join('; '));
      return;
    }

    // Save
    await saveConfig(currentConfig);

    // Reset dirty state after successful save - clear all dirty menus
    savedFormStates.clear();
    dirtyMenus.clear();

    // Recapture current menu state
    savedFormStates.set(selectedMenuId, captureFormState());

    // Update menu list (name might have changed)
    renderMenuList();

    // Update revert button states
    updateRevertButtons();

    // Check if there are no actions
    if (menu.actions.length === 0) {
      showWarning(`Menu "${menu.name}" saved successfully! However, you have no actions configured. Add at least one action to use this menu.`);
    } else {
      showSuccess(`Menu "${menu.name}" saved successfully!`);
    }

    // Fade out reload reminder if visible
    if (!reloadReminder.classList.contains('hidden')) {
      setTimeout(() => {
        reloadReminder.classList.add('fading-out');
        setTimeout(() => {
          reloadReminder.classList.add('hidden');
          reloadReminder.classList.remove('fading-out');
        }, 500);
      }, 3000);
    }
  } catch (e) {
    showError('Failed to save: ' + e.message);
  }
}

// ====== EXPORT CONFIGURATION ======
async function handleExport() {
  try {
    const config = await getConfig();

    const jsonStr = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chatgpt-prompts-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSuccess('Configuration exported successfully!');
  } catch (e) {
    showError('Failed to export: ' + e.message);
  }
}

// ====== IMPORT CONFIGURATION ======
function handleImportClick() {
  importFileInput.click();
}

async function handleImportFile(e) {
  try {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const importedConfig = JSON.parse(text);

    // Normalize all shortcuts in the imported config to canonical form
    // This ensures shortcuts work regardless of modifier order in the file
    if (importedConfig.menus && Array.isArray(importedConfig.menus)) {
      importedConfig.menus.forEach(menu => {
        // Normalize Run All shortcut
        if (menu.runAllShortcut) {
          menu.runAllShortcut = normalizeShortcutString(menu.runAllShortcut);
        }
        // Normalize action shortcuts
        if (menu.actions && Array.isArray(menu.actions)) {
          menu.actions.forEach(action => {
            if (action.shortcut) {
              action.shortcut = normalizeShortcutString(action.shortcut);
            }
          });
        }
      });
    }
    // V2 format fallback
    else if (importedConfig.actions && Array.isArray(importedConfig.actions)) {
      importedConfig.actions.forEach(action => {
        if (action.shortcut) {
          action.shortcut = normalizeShortcutString(action.shortcut);
        }
      });
      if (importedConfig.globalSettings?.runAllShortcut) {
        importedConfig.globalSettings.runAllShortcut = normalizeShortcutString(importedConfig.globalSettings.runAllShortcut);
      }
    }

    const errors = validateConfig(importedConfig);
    if (errors.length > 0) {
      showError('Invalid configuration file: ' + errors.join('; '));
      importFileInput.value = '';
      return;
    }

    const confirmed = await showConfirmModal(
      'Import Menus',
      'Import new menus? Your current menus will be replaced.',
      'warning'
    );
    if (!confirmed) {
      importFileInput.value = '';
      return;
    }

    await saveConfig(importedConfig);
    currentConfig = importedConfig;

    await loadAndRender();

    showSuccess('Configuration imported successfully!');
    importFileInput.value = '';
  } catch (e) {
    showError('Failed to import: ' + e.message);
    importFileInput.value = '';
  }
}

// ====== BANNER HELPERS ======
function showError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove('hidden');
  warningBanner.classList.add('hidden');
  successBanner.classList.add('hidden');
}

function showWarning(message) {
  warningBanner.textContent = message;
  warningBanner.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  successBanner.classList.add('hidden');

  setTimeout(() => {
    warningBanner.classList.add('hidden');
  }, 5000);
}

function showSuccess(message) {
  successBanner.textContent = message;
  successBanner.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  warningBanner.classList.add('hidden');

  setTimeout(() => {
    successBanner.classList.add('hidden');
  }, 3000);
}

function hideAllBanners() {
  errorBanner.classList.add('hidden');
  warningBanner.classList.add('hidden');
  successBanner.classList.add('hidden');
}

// ====== MODAL DIALOG ======
function showModal(title, message, type = 'info') {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  
  // Hide cancel button for regular modals
  modalCancel.style.display = 'none';
  modalOk.textContent = 'OK';
  
  // Set title color based on type
  modalTitle.className = 'modal-title';
  if (type === 'error') {
    modalTitle.style.color = '#cc0033';
  } else if (type === 'warning') {
    modalTitle.style.color = '#e65100';
  } else if (type === 'success') {
    modalTitle.style.color = '#137333';
  } else {
    modalTitle.style.color = '#202124';
  }
  
  modalOverlay.classList.remove('hidden');
  // Use setTimeout to trigger transition
  setTimeout(() => {
    modalOverlay.classList.add('show');
  }, 10);
  
  // Focus the OK button for accessibility
  modalOk.focus();
}

function hideModal() {
  modalOverlay.classList.remove('show');
  setTimeout(() => {
    modalOverlay.classList.add('hidden');
  }, 200); // Wait for transition
}

// Show confirmation modal (returns Promise<boolean>)
function showConfirmModal(title, message, type = 'warning') {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Show cancel button for confirmations
    modalCancel.style.display = 'inline-block';
    modalOk.textContent = 'Yes';

    // Reset modal dialog classes
    modalDialog.className = 'modal-dialog';

    // Set icon and modal type class based on type
    if (type === 'warning') {
      modalIcon.textContent = '⚠️';
      modalDialog.classList.add('modal-warning');
    } else if (type === 'error') {
      modalIcon.textContent = '❌';
      modalDialog.classList.add('modal-warning'); // Use warning style for errors
    } else if (type === 'info') {
      modalIcon.textContent = 'ℹ️';
      modalDialog.classList.add('modal-info');
    } else if (type === 'success') {
      modalIcon.textContent = '✅';
      modalDialog.classList.add('modal-info'); // Use info style for success
    } else {
      modalIcon.textContent = 'ℹ️';
      modalDialog.classList.add('modal-info');
    }
    
    // Remove existing listeners
    const newOkHandler = () => {
      hideModal();
      resolve(true);
      modalOk.removeEventListener('click', newOkHandler);
      modalCancel.removeEventListener('click', newCancelHandler);
      document.removeEventListener('keydown', escapeHandler);
    };
    
    const newCancelHandler = () => {
      hideModal();
      resolve(false);
      modalOk.removeEventListener('click', newOkHandler);
      modalCancel.removeEventListener('click', newCancelHandler);
      document.removeEventListener('keydown', escapeHandler);
    };
    
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        newCancelHandler();
      }
    };
    
    modalOk.addEventListener('click', newOkHandler);
    modalCancel.addEventListener('click', newCancelHandler);
    document.addEventListener('keydown', escapeHandler);
    
    modalOverlay.classList.remove('hidden');
    setTimeout(() => {
      modalOverlay.classList.add('show');
    }, 10);
    
    // Focus the Cancel button for safety (user needs to actively choose Yes)
    modalCancel.focus();
  });
}

// Modal event listeners (for regular modals)
if (modalClose) {
  modalClose.addEventListener('click', hideModal);
}

if (modalOk) {
  // Default handler for regular modals (will be overridden for confirm modals)
  modalOk.addEventListener('click', () => {
    if (modalCancel.style.display === 'none') {
      hideModal();
    }
  });
}

// Close modal on overlay click (only for regular modals)
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay && modalCancel.style.display === 'none') {
      hideModal();
    }
  });
}

// Close modal on Escape key (only for regular modals)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('show') && modalCancel.style.display === 'none') {
    hideModal();
  }
});

// ====== RUN ALL VISIBILITY TOGGLE ======
function toggleRunAllShortcutVisibility() {
  if (runAllEnabledCheckbox.checked) {
    runAllShortcutGroup.style.display = '';
  } else {
    runAllShortcutGroup.style.display = 'none';
  }
}

// ====== ATTACH EVENT LISTENERS ======
function attachEventListeners() {
  // Menu management
  addMenuButton.addEventListener('click', handleAddMenu);
  deleteMenuButton.addEventListener('click', handleDeleteMenu);

  // Menu name real-time update
  menuNameInput.addEventListener('input', () => {
    if (menuNameInput.value.trim()) {
      menuNameInput.classList.remove('error');
    }
    checkForChanges();
  });

  // Change detection for menu configuration fields
  customGptUrlInput.addEventListener('input', checkForChanges);
  autoSubmitCheckbox.addEventListener('change', checkForChanges);
  runAllEnabledCheckbox.addEventListener('change', checkForChanges);
  runAllShortcutInput.addEventListener('input', (e) => {
    // Update display when shortcut changes (e.g., from import)
    // Extract the raw shortcut value and reformat it
    const rawValue = extractRawShortcut(e.target.value);
    updateShortcutDisplay(runAllShortcutInput, rawValue);
    checkForChanges();
  });

  // Actions
  addActionButton.addEventListener('click', handleAddAction);

  // Save
  saveButton.addEventListener('click', handleSave);

  // Revert
  revertButton.addEventListener('click', handleRevertCurrent);
  revertAllButton.addEventListener('click', handleRevertAll);

  // Export/Import
  exportButton.addEventListener('click', () => {
    handleExport();
    dropdownMenu.classList.add('hidden');
    hamburgerButton.setAttribute('aria-expanded', 'false');
  });
  importButton.addEventListener('click', () => {
    handleImportClick();
    dropdownMenu.classList.add('hidden');
    hamburgerButton.setAttribute('aria-expanded', 'false');
  });
  importFileInput.addEventListener('change', handleImportFile);

  // Hamburger menu
  hamburgerButton.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = hamburgerButton.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      dropdownMenu.classList.add('hidden');
      hamburgerButton.setAttribute('aria-expanded', 'false');
    } else {
      dropdownMenu.classList.remove('hidden');
      hamburgerButton.setAttribute('aria-expanded', 'true');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!hamburgerButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.add('hidden');
      hamburgerButton.setAttribute('aria-expanded', 'false');
    }
  });

  // Debug logging toggle
  debugLoggingToggle.addEventListener('change', async (e) => {
    await setDebugEnabled(e.target.checked);
    console.log('[Debug] Debug logging', e.target.checked ? 'enabled' : 'disabled');
  });

  // Run All shortcut capture
  runAllShortcutBtn.addEventListener('click', () => {
    captureShortcut(runAllShortcutInput);
  });

  // Delete key to clear Run All shortcut
  runAllShortcutInput.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      updateShortcutDisplay(runAllShortcutInput, '');
      reloadReminder.classList.remove('hidden');
      hideAllBanners();
    }
  });

  // Toggle Run All shortcut visibility when checkbox changes
  runAllEnabledCheckbox.addEventListener('change', toggleRunAllShortcutVisibility);

  // Info icon popups
  setupInfoPopups();
}

// ====== INFO POPUP HANDLING ======
function setupInfoPopups() {
  // Handle info icon clicks
  document.addEventListener('click', (e) => {
    const infoIcon = e.target.closest('.info-icon');
    if (infoIcon) {
      e.preventDefault();
      e.stopPropagation();
      const popupId = infoIcon.dataset.info;
      const popup = document.getElementById(popupId);
      if (popup) {
        toggleInfoPopup(popup, infoIcon);
      }
    }

    // Close popup when clicking close button
    const closeBtn = e.target.closest('.info-popup-close');
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const popup = closeBtn.closest('.info-popup');
      if (popup) {
        closeInfoPopup(popup);
      }
    }

    // Close popup when clicking outside
    const openPopup = document.querySelector('.info-popup.show');
    if (openPopup && !e.target.closest('.info-popup') && !e.target.closest('.info-icon')) {
      closeInfoPopup(openPopup);
    }
  });
}

function toggleInfoPopup(popup, icon) {
  const isOpen = popup.classList.contains('show');
  
  // Close any other open popups
  document.querySelectorAll('.info-popup.show').forEach(p => {
    if (p !== popup) {
      closeInfoPopup(p);
    }
  });

  if (isOpen) {
    closeInfoPopup(popup);
  } else {
    openInfoPopup(popup, icon);
  }
}

function openInfoPopup(popup, icon) {
  popup.classList.add('show');
  
  // Position popup relative to icon
  const iconRect = icon.getBoundingClientRect();
  
  // Position below the icon, aligned to left
  // Fixed positioning is relative to viewport, so use getBoundingClientRect() values directly
  popup.style.position = 'fixed';
  popup.style.top = `${iconRect.bottom + 8}px`;
  popup.style.left = `${iconRect.left}px`;
}

function closeInfoPopup(popup) {
  popup.classList.remove('show');
}
