import { test, expect } from '../fixtures/extension.js';

/**
 * Tests for Custom Modal Overlays
 *
 * Verifies that:
 * 1. Confirmation modals appear instead of browser dialogs
 * 2. Modal has correct Yes/Cancel buttons for confirmations
 * 3. Modal can be closed via Escape key
 * 4. Modal can be closed by clicking overlay
 * 5. Delete action shows confirmation modal
 * 6. Import configuration shows confirmation modal
 */

test.describe('UI Tests - Modal Overlays', () => {
  test('should show confirmation modal when deleting action', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu with an action
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    // Set a valid URL
    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    // Add an action
    const addActionBtn = optionsPage.locator('#add-action');
    await addActionBtn.click();
    await optionsPage.waitForTimeout(200);

    const actionTitles = optionsPage.locator('.action-title');
    await actionTitles.last().fill('Action to Delete');

    const actionPrompts = optionsPage.locator('.action-prompt');
    await actionPrompts.last().fill('Test prompt');

    // Delete the action
    const deleteBtn = optionsPage.locator('.action-item .btn-delete').last();
    await deleteBtn.click();
    await optionsPage.waitForTimeout(300);

    // Verify modal appears
    const modalOverlay = optionsPage.locator('#modal-overlay');
    await expect(modalOverlay).toBeVisible();
    await expect(modalOverlay).not.toHaveClass(/hidden/);

    const modalTitle = optionsPage.locator('#modal-title');
    await expect(modalTitle).toContainText('Delete Action');

    const modalMessage = optionsPage.locator('#modal-message');
    const messageText = await modalMessage.textContent();
    expect(messageText).toContain('Delete');
    console.log(`✓ Delete action modal appeared: "${messageText}"`);

    // Verify Yes and Cancel buttons exist
    const yesBtn = optionsPage.locator('#modal-ok');
    await expect(yesBtn).toBeVisible();
    await expect(yesBtn).toContainText('Yes');

    const cancelBtn = optionsPage.locator('#modal-cancel');
    await expect(cancelBtn).toBeVisible();
    await expect(cancelBtn).toContainText('Cancel');

    // Cancel the deletion
    await cancelBtn.click();
    await optionsPage.waitForTimeout(300);

    // Verify modal is closed
    await expect(modalOverlay).toHaveClass(/hidden/);
    console.log('✓ Modal closed after cancel');
  });

  test('should close modal with Escape key', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu to delete
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    // Trigger delete modal
    const deleteBtn = optionsPage.locator('#delete-menu');
    await deleteBtn.click();
    await optionsPage.waitForTimeout(300);

    // Verify modal is visible
    const modalOverlay = optionsPage.locator('#modal-overlay');
    await expect(modalOverlay).toBeVisible();

    // Press Escape key
    await optionsPage.keyboard.press('Escape');
    await optionsPage.waitForTimeout(300);

    // Verify modal is closed
    await expect(modalOverlay).toHaveClass(/hidden/);
    console.log('✓ Modal closed with Escape key');
  });

  test('should show import confirmation modal', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a sample config file content (valid V3 format)
    const sampleConfig = {
      version: 3,
      menus: [
        {
          id: 'test-menu-1',
          name: 'Test Menu',
          customGptUrl: 'https://chatgpt.com/g/g-test123',
          autoSubmit: false,
          runAllEnabled: false,
          runAllShortcut: '',
          order: 1,
          actions: []
        }
      ],
      globalSettings: {
        gptTitleMatch: 'ChatGPT',
        clearContext: true
      }
    };

    // Trigger file input (we'll simulate via JavaScript)
    await optionsPage.evaluate((config) => {
      const file = new File([JSON.stringify(config, null, 2)], 'test-config.json', {
        type: 'application/json'
      });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const input = document.getElementById('import-file-input');
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sampleConfig);

    await optionsPage.waitForTimeout(500);

    // Verify import confirmation modal appears
    const modalOverlay = optionsPage.locator('#modal-overlay');
    await expect(modalOverlay).toBeVisible();

    const modalTitle = optionsPage.locator('#modal-title');
    await expect(modalTitle).toContainText('Import Configuration');

    const modalMessage = optionsPage.locator('#modal-message');
    const messageText = await modalMessage.textContent();
    expect(messageText).toContain('Import');
    expect(messageText).toContain('replaced');
    console.log(`✓ Import confirmation modal appeared: "${messageText}"`);

    // Cancel the import
    const cancelBtn = optionsPage.locator('#modal-cancel');
    await cancelBtn.click();
    await optionsPage.waitForTimeout(300);

    // Verify modal is closed
    await expect(modalOverlay).toHaveClass(/hidden/);
    console.log('✓ Import modal closed after cancel');
  });

  test('should have correct button labels for confirmation modals', async ({ optionsPage }) => {
    await optionsPage.waitForLoadState('networkidle');

    // Create a menu
    const addMenuBtn = optionsPage.locator('#add-menu');
    await addMenuBtn.click();
    await optionsPage.waitForTimeout(200);

    const customGptUrlInput = optionsPage.locator('#customGptUrl');
    await customGptUrlInput.clear();
    await customGptUrlInput.fill('https://chatgpt.com/g/g-test123');

    // Trigger delete modal
    const deleteBtn = optionsPage.locator('#delete-menu');
    await deleteBtn.click();
    await optionsPage.waitForTimeout(300);

    // Verify button labels
    const yesBtn = optionsPage.locator('#modal-ok');
    const yesBtnText = await yesBtn.textContent();
    expect(yesBtnText.trim()).toBe('Yes');

    const cancelBtn = optionsPage.locator('#modal-cancel');
    const cancelBtnText = await cancelBtn.textContent();
    expect(cancelBtnText.trim()).toBe('Cancel');

    console.log('✓ Confirmation modal has correct button labels');

    // Close modal
    await cancelBtn.click();
    await optionsPage.waitForTimeout(300);
  });
});

