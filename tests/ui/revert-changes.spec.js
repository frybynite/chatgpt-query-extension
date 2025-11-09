import { test, expect } from '../fixtures/extension.js';

/**
 * Tests for Revert Changes functionality
 *
 * Verifies that:
 * 1. Revert buttons exist and have correct initial states
 * 2. "Revert Changes" button is disabled when no changes
 * 3. "Revert Changes" button is enabled when current menu has changes
 * 4. "Revert All Changes" button is hidden when 0-1 menus dirty
 * 5. "Revert All Changes" button is visible when 2+ menus dirty
 * 6. Confirmation modals appear with correct messages
 * 7. Canceling confirmation keeps changes
 * 8. Reverting single menu restores saved state and saves to storage
 * 9. Reverting all menus restores multiple menus and saves to storage
 * 10. Orange indicators removed after revert
 * 11. Button states update correctly when switching menus
 */

test.describe('UI Tests - Revert Changes', () => {
  test('should show revert buttons with correct initial states', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select the first menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Verify "Revert Changes" button exists but is hidden (no changes yet)
    const revertBtn = optionsPage.locator('#revert-changes');
    await expect(revertBtn).toHaveClass(/hidden/);
    console.log('✓ "Revert Changes" button exists and is hidden');

    // Verify "Revert All Changes" button exists but is hidden (0-1 dirty menus)
    const revertAllBtn = optionsPage.locator('#revert-all-changes');
    await expect(revertAllBtn).toHaveClass(/hidden/);
    console.log('✓ "Revert All Changes" button is hidden');
  });

  test('should enable "Revert Changes" when current menu has changes', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    const revertBtn = optionsPage.locator('#revert-changes');
    await expect(revertBtn).toHaveClass(/hidden/);

    // Make a change to menu name
    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Modified Menu Name');
    await optionsPage.waitForTimeout(200);

    // "Revert Changes" should now be visible
    await expect(revertBtn).not.toHaveClass(/hidden/);
    console.log('✓ "Revert Changes" button visible after making changes');
  });

  test('should show "Revert All Changes" when 2+ menus dirty', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select first menu and make a change
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    const originalName1 = await menuNameInput.inputValue();
    await menuNameInput.fill(originalName1 + ' Modified');
    await optionsPage.waitForTimeout(200);

    const revertAllBtn = optionsPage.locator('#revert-all-changes');
    await expect(revertAllBtn).toHaveClass(/hidden/);
    console.log('✓ "Revert All Changes" hidden with 1 dirty menu');

    // Create a second menu
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    // Make a change to the second menu
    const menuNameInput2 = optionsPage.locator('#menuName');
    await menuNameInput2.fill('Second Menu Modified');
    await optionsPage.waitForTimeout(200);

    // "Revert All Changes" should now be visible
    await expect(revertAllBtn).not.toHaveClass(/hidden/);
    console.log('✓ "Revert All Changes" button visible with 2 dirty menus');
  });

  test('should show confirmation modal when reverting current menu', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select menu and make a change
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    const originalName = await menuNameInput.inputValue();
    await menuNameInput.fill('Modified Name');
    await optionsPage.waitForTimeout(200);

    // Click "Revert Changes"
    const revertBtn = optionsPage.locator('#revert-changes');
    await revertBtn.click();
    await optionsPage.waitForTimeout(200);

    // Modal should appear
    const modal = optionsPage.locator('#modal-overlay');
    await expect(modal).not.toHaveClass(/hidden/);

    const modalTitle = optionsPage.locator('#modal-title');
    await expect(modalTitle).toContainText('Revert Changes');

    const modalMessage = optionsPage.locator('#modal-message');
    await expect(modalMessage).toContainText('Discard unsaved changes');

    console.log('✓ Confirmation modal appeared with correct message');

    // Close modal
    const modalCancel = optionsPage.locator('#modal-cancel');
    await modalCancel.click();
    await optionsPage.waitForTimeout(200);
  });

  test('should keep changes when canceling revert confirmation', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select menu and make a change
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Modified Name For Cancel Test');
    await optionsPage.waitForTimeout(200);

    // Click "Revert Changes"
    const revertBtn = optionsPage.locator('#revert-changes');
    await revertBtn.click();
    await optionsPage.waitForTimeout(200);

    // Cancel the modal
    const modalCancel = optionsPage.locator('#modal-cancel');
    await modalCancel.click();
    await optionsPage.waitForTimeout(200);

    // Changes should still be there
    const currentValue = await menuNameInput.inputValue();
    expect(currentValue).toBe('Modified Name For Cancel Test');
    console.log('✓ Changes retained after canceling revert');
  });

  test('should revert current menu when confirmed', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Remember original name
    const menuNameInput = optionsPage.locator('#menuName');
    const originalName = await menuNameInput.inputValue();

    // Make a change
    await menuNameInput.fill('Modified Name To Revert');
    await optionsPage.waitForTimeout(200);

    // Click "Revert Changes"
    const revertBtn = optionsPage.locator('#revert-changes');
    await revertBtn.click();
    await optionsPage.waitForTimeout(200);

    // Confirm
    const modalOk = optionsPage.locator('#modal-ok');
    await modalOk.click();

    // Wait a bit for the async operation to complete
    await optionsPage.waitForTimeout(1000);

    // Check if error banner appeared instead
    const errorBanner = optionsPage.locator('#error-banner');
    const errorVisible = !(await errorBanner.getAttribute('class')).includes('hidden');
    if (errorVisible) {
      const errorText = await errorBanner.textContent();
      console.log(`ERROR BANNER SHOWN: ${errorText}`);
    }

    // Name should be reverted to original
    const revertedName = await menuNameInput.inputValue();
    console.log(`Current name value: "${revertedName}", Expected: "${originalName}"`);
    expect(revertedName).toBe(originalName);
    console.log(`✓ Menu name reverted from "Modified Name To Revert" to "${originalName}"`);

    // "Revert Changes" button should be hidden again
    await expect(revertBtn).toHaveClass(/hidden/);
    console.log('✓ "Revert Changes" button hidden after revert');

    // Orange indicator should be gone
    const selectedMenuItem = optionsPage.locator('.menu-item.selected');
    const indicator = selectedMenuItem.locator('.unsaved-indicator');
    await expect(indicator).toHaveCount(0);
    console.log('✓ Orange indicator removed after revert');
  });

  test('should revert all menus when confirmed', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select first menu and modify
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    const menuNameInput = optionsPage.locator('#menuName');
    const originalName1 = await menuNameInput.inputValue();
    await menuNameInput.fill('Modified Menu 1');
    await optionsPage.waitForTimeout(200);

    // Create second menu
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    // Modify second menu
    const menuNameInput2 = optionsPage.locator('#menuName');
    await menuNameInput2.fill('Modified Menu 2');
    await optionsPage.waitForTimeout(200);

    // Click "Revert All Changes"
    const revertAllBtn = optionsPage.locator('#revert-all-changes');
    await revertAllBtn.click();
    await optionsPage.waitForTimeout(200);

    // Verify modal message
    const modalMessage = optionsPage.locator('#modal-message');
    await expect(modalMessage).toContainText('Discard unsaved changes to 2 menu');
    console.log('✓ Modal shows correct count of dirty menus');

    // Confirm
    const modalOk = optionsPage.locator('#modal-ok');
    await modalOk.click();

    // Wait a bit for the async operation to complete
    await optionsPage.waitForTimeout(1000);

    // Both revert buttons should update
    const revertBtn = optionsPage.locator('#revert-changes');
    await expect(revertBtn).toHaveClass(/hidden/);
    await expect(revertAllBtn).toHaveClass(/hidden/);
    console.log('✓ Both revert buttons updated after revert all');

    // No orange indicators should remain
    const allIndicators = optionsPage.locator('.unsaved-indicator');
    await expect(allIndicators).toHaveCount(0);
    console.log('✓ All orange indicators removed');
  });

  test('should update button states when switching between menus', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a second menu
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    // Save so both menus have a clean state
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');
    const saveBtn = optionsPage.locator('#save');
    await saveBtn.click();
    await optionsPage.waitForTimeout(500);

    // Select first menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Modify first menu
    const menuNameInput = optionsPage.locator('#menuName');
    await menuNameInput.fill('Dirty Menu 1');
    await optionsPage.waitForTimeout(200);

    const revertBtn = optionsPage.locator('#revert-changes');
    await expect(revertBtn).not.toHaveClass(/hidden/);
    console.log('✓ Revert button visible for dirty menu');

    // Switch to second menu (clean)
    const menuItems2 = optionsPage.locator('.menu-item');
    await menuItems2.nth(1).click();
    await optionsPage.waitForTimeout(200);

    // Revert button should be hidden
    await expect(revertBtn).toHaveClass(/hidden/);
    console.log('✓ Revert button hidden for clean menu');

    // Switch back to first menu
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Revert button should be visible again
    await expect(revertBtn).not.toHaveClass(/hidden/);
    console.log('✓ Revert button visible again when switching back to dirty menu');
  });

  test('should save reverted state to storage', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Select menu
    const menuItems = optionsPage.locator('.menu-item');
    await menuItems.first().click();
    await optionsPage.waitForTimeout(200);

    // Remember original name
    const menuNameInput = optionsPage.locator('#menuName');
    const originalName = await menuNameInput.inputValue();

    // Make a change
    await menuNameInput.fill('Temporary Change');
    await optionsPage.waitForTimeout(200);

    // Revert
    const revertBtn = optionsPage.locator('#revert-changes');
    await revertBtn.click();
    await optionsPage.waitForTimeout(200);
    const modalOk = optionsPage.locator('#modal-ok');
    await modalOk.click();
    await optionsPage.waitForTimeout(500);

    // Reload page
    await optionsPage.reload();
    await optionsPage.waitForLoadState('networkidle');

    // Select same menu
    const menuItemsAfterReload = optionsPage.locator('.menu-item');
    await menuItemsAfterReload.first().click();
    await optionsPage.waitForTimeout(200);

    // Should show original name (reverted state was saved)
    const menuNameAfterReload = optionsPage.locator('#menuName');
    const nameAfterReload = await menuNameAfterReload.inputValue();
    expect(nameAfterReload).toBe(originalName);
    console.log('✓ Reverted state persisted to storage');
  });
});
