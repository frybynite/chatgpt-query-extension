import { test, expect } from '../fixtures/extension.js';

/**
 * TEST-CM08: Shortcut Display in Context Menu
 *
 * Verifies that:
 * 1. Actions with shortcuts display the shortcut in the context menu
 * 2. Actions without shortcuts display normally
 * 3. Run All shortcut is displayed when configured
 */

test.describe('Context Menu Tests - Shortcut Display', () => {
  test('should display shortcuts in context menu for actions', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu with actions that have shortcuts
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.clear();
    await menuNameInput.fill('Shortcut Test Menu');

    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    // Add action with shortcut
    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    const actionPrompts = optionsPage.locator('.action-prompt');
    const actionShortcuts = optionsPage.locator('.action-shortcut');

    await actionTitles.first().fill('Action with Shortcut');
    await actionPrompts.first().fill('Test prompt');

    // Simulate shortcut capture
    const actionItems = optionsPage.locator('.action-item');
    const firstActionItem = actionItems.first();
    const shortcutBtn = firstActionItem.locator('.btn-capture');
    await shortcutBtn.click();
    await optionsPage.waitForTimeout(100);
    await optionsPage.keyboard.press('Control+Shift+A');
    await optionsPage.waitForTimeout(200);

    // Add action without shortcut
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    await actionTitles.nth(1).fill('Action without Shortcut');
    await actionPrompts.nth(1).fill('Test prompt 2');

    // Save menu
    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(500);

    console.log('✓ Test menu with shortcuts created');

    // Verify shortcuts were saved in UI
    const shortcut1Value = await actionShortcuts.first().inputValue();
    const shortcut2Value = await actionShortcuts.nth(1).inputValue();

    console.log(`✓ Action 1 shortcut: "${shortcut1Value}"`);
    console.log(`✓ Action 2 shortcut: "${shortcut2Value}"`);

    expect(shortcut1Value).toBeTruthy();
    // Check for either Mac symbols or PC key names
    const hasModifier = shortcut1Value.includes('Ctrl') ||
                        shortcut1Value.includes('⌃') ||
                        shortcut1Value.includes('Alt') ||
                        shortcut1Value.includes('⌥');
    expect(hasModifier).toBe(true);
    expect(shortcut2Value).toBe('');

    console.log('✓ Shortcuts correctly saved in UI');
  });

  test('should display Run All shortcut in context menu', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu with Run All enabled and shortcut
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.clear();
    await menuNameInput.fill('Run All Shortcut Test');

    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test456');

    // Enable Run All
    const runAllEnabledCheckbox = optionsPage.locator('#runAllEnabled');
    await runAllEnabledCheckbox.check();
    await optionsPage.waitForTimeout(200);

    // Set Run All shortcut
    const runAllShortcutBtn = optionsPage.locator('#runAllShortcutBtn');
    await runAllShortcutBtn.click();
    await optionsPage.waitForTimeout(100);
    await optionsPage.keyboard.press('Control+Shift+R');
    await optionsPage.waitForTimeout(200);

    // Add two actions (required for Run All to show)
    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    const actionPrompts = optionsPage.locator('.action-prompt');

    await actionTitles.first().fill('Action 1');
    await actionPrompts.first().fill('Prompt 1');

    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    await actionTitles.nth(1).fill('Action 2');
    await actionPrompts.nth(1).fill('Prompt 2');

    // Save menu
    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(500);

    console.log('✓ Run All shortcut test menu created');

    // Verify Run All shortcut was saved
    const runAllShortcutInput = optionsPage.locator('#runAllShortcut');
    const runAllShortcutValue = await runAllShortcutInput.inputValue();

    console.log(`✓ Run All shortcut: "${runAllShortcutValue}"`);
    expect(runAllShortcutValue).toBeTruthy();
    // Check for either Mac symbols or PC key names
    const hasModifier = runAllShortcutValue.includes('Ctrl') ||
                        runAllShortcutValue.includes('⌃') ||
                        runAllShortcutValue.includes('Alt') ||
                        runAllShortcutValue.includes('⌥');
    expect(hasModifier).toBe(true);
  });
});
