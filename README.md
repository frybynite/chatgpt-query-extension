# ChatGPT Custom Prompts - Chrome Extension

A Chrome extension that allows you to send selected text to your custom ChatGPT assistant with configurable custom prompts, shortcuts, and settings.

## Features

- **Multiple Menus** ✨ **NEW in v3.0.0**: Create up to 10 independent menu configurations, each with its own GPT URL, actions, and settings
- **Fully Configurable**: Configure all actions, shortcuts, and settings via options page
- **Custom Actions**: Add, edit, remove, and reorder actions without code changes
- **Drag-and-Drop Reordering**: Reorder menus and actions by dragging the handle (≡) icon
- **Enable/Disable Actions**: Toggle individual actions on/off without deleting them
- **Custom Shortcuts**: Assign any keyboard shortcut to any action
- **Import/Export**: Backup and share configurations via JSON
- **Context Menu Integration**: Right-click selected text to send it to your custom GPT(s)
- **Smart Tab Management**: Automatically opens or focuses your GPT tab
- **Auto-Submit**: Optionally submit prompts automatically for hands-free operation (per-menu)
- **Parallel Processing**: Run all actions simultaneously in separate tabs (per-menu)
- **Robust Injection**: Automatic retry on failure with fresh context option
- **Clear Context**: Global setting to clear ChatGPT context before injecting new prompts
- **Debug Logging**: Optional debug logging toggle in hamburger menu for troubleshooting
- **Interactive UI Help**: Info popups (ⓘ) throughout the interface explain each setting

## Installation

### From Chrome Web Store

1. Visit the [Chrome Web Store listing](https://chrome.google.com/webstore/detail/iaipkgodcejbmipbkpccldcechmnbgpd)
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### From Source

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension directory

### Configuration

**v2.0.0 and later:** All configuration is done through the options page (chrome://extensions → Details → Extension options).

**User Interface Layout (v3.0.0+):**
- **Left Sidebar**: Lists all your menus (up to 10) with drag-and-drop reordering
- **Right Panel**: Shows configuration and actions for the selected menu
- **Hamburger Menu (☰)**: Access Import/Export and Debug Logging toggle
- **Info Icons (ⓘ)**: Click for helpful explanations of each setting

**Configuration Options:**
- **Multiple Menus** (v3.0.0+): Create up to 10 separate menu configurations
  - Each menu has its own name (becomes the context menu title) - **Required**, max 50 characters
  - Each menu has its own Custom GPT URL - **Required**
  - Each menu has its own Auto Submit setting
  - Each menu has its own Run All configuration with optional keyboard shortcut
  - Each menu has its own list of actions
  - Drag the handle (≡) to reorder menus
- **Actions**: Add, edit, remove, enable/disable, and reorder actions
  - **Title** (required) - Appears in context menu
  - **Prompt** (required) - The text sent to ChatGPT
  - **Keyboard Shortcut** (optional) - Quick access key combination
  - **Enabled** checkbox - Toggle actions on/off without deleting
  - Drag the handle (≡) to reorder actions within a menu
- **Global Settings**:
  - **Clear Context**: Clears ChatGPT's context before injecting new prompts (default: enabled)
  - **Debug Logging**: Enable detailed console logging for troubleshooting (in hamburger menu)

**For v1.6.0 and earlier users:** Your existing configuration will be automatically migrated to the new options page on first load.

## Custom GPT Configuration

To get the most out of this extension, you should create a custom ChatGPT configured for your specific use case.

### Creating Your Custom GPT

1. **Navigate to ChatGPT**: Go to [chatgpt.com](https://chatgpt.com) (requires ChatGPT Plus)
2. **Create New GPT**: Click your profile → "My GPTs" → "Create a GPT"
3. **Name Your GPT**: Choose a descriptive name for your assistant
4. **Configure Instructions**: Add custom instructions tailored to your needs

### Getting Your Custom GPT URL

After creating your GPT:
1. Click "Publish" to finalize your GPT
2. Copy the URL from your browser (format: `https://chatgpt.com/g/g-XXXXXXXXX-your-gpt-name`)
3. Open the extension's options page (chrome://extensions → Details → Extension options)
4. Paste the URL into the "Custom GPT URL" field
5. Customize the "Context Menu Title" if desired
6. Click "Save"


## Usage

### Context Menu
1. Select text on any webpage
2. Right-click the selection
3. Choose your menu, then select an action from the context menu
4. The extension will open/focus your GPT tab and insert the text
5. If Auto-Submit is enabled, the prompt will be submitted automatically

**Note:** Only enabled actions appear in the context menu. Disabled actions are hidden but remain configured.

### Keyboard Shortcuts
1. Select text on any webpage
2. Press your configured keyboard shortcut for any enabled action
3. The extension will open/focus your GPT tab and insert the text

### Customizing Shortcuts

**v2.0.0 and later:**
1. Go to Extension options (chrome://extensions → Details → Extension options)
2. Click the keyboard icon (⌨️) next to any action
3. Press your desired key combination
4. Click "Save"

**v1.6.0 and earlier:**
1. Go to `chrome://extensions/shortcuts`
2. Find "ChatGPT Custom Prompts"
3. Click the edit icon to set your preferred shortcuts

## Import/Export Configuration

### Exporting Your Configuration

1. Open Extension options
2. Click the hamburger menu (☰) in the top-left corner
3. Click "Export Menus..."
4. Save the downloaded `chatgpt-actions-config.json` file

Use this to:
- Backup your configuration
- Share configurations with others
- Sync settings across multiple computers

### Importing a Configuration

1. Open Extension options
2. Click the hamburger menu (☰) in the top-left corner
3. Click "Import Menus..."
4. Select a previously exported configuration file
5. Confirm the import

**Warning:** Importing will replace your current configuration. Export your current settings first if you want to preserve them.

## Troubleshooting

### Extension doesn't insert text
- Check that the GPT URL and title match are correctly configured
- Ensure ChatGPT page is fully loaded before selecting text
- Try disabling auto-submit and manually clicking send
- Enable **Debug Logging** in the hamburger menu (☰) and check browser console for details

### Tabs not opening correctly
- Verify the Custom GPT URL is correct in extension options
- Check browser's tab title by hovering over the tab
- Ensure ChatGPT is accessible and you're logged in
- Enable **Debug Logging** to see tab management details in the console

### Keyboard shortcuts don't work
- Ensure no other extension is using the same shortcuts
- Configure shortcuts in the extension options page
- **After changing shortcuts, reload any open tabs** for changes to take effect
- Some system shortcuts may override extension shortcuts
- Check that the action is **Enabled** (checkbox must be checked)

### "Could not auto-insert text" alert
- ChatGPT may have changed their DOM structure
- Enable **Debug Logging** and check browser console for detailed error logs
- Consider updating selector patterns in background.js if you're a developer

### Getting detailed logs
1. Open Extension options
2. Click the hamburger menu (☰) in the top-left
3. Check "Debug Logging"
4. Open your browser's Developer Console (F12 or Ctrl+Shift+I / Cmd+Option+I)
5. Reproduce the issue and review console output

## Configuration Best Practices

### For Fast Workflow
- Enable `Auto Submit` for hands-free operation
- Customize keyboard shortcuts to match your muscle memory
- Use "Run All Actions" when you need comprehensive analysis

### Managing Menus and Actions
- Use the drag handle (≡) to reorder menus and actions - most-used items at the top
- Disable actions you don't use frequently instead of deleting them (preserves your work)
- Organize related actions into separate menus (e.g., "Work", "Personal", "Research")
- Keep menu names short and descriptive (max 50 characters)
- Export your configuration regularly as backup

### Troubleshooting Tips
- Enable Debug Logging (hamburger menu) to see detailed console output
- Click info icons (ⓘ) for help with specific settings
- After changing shortcuts, reload any open tabs for changes to take effect

## Limitations

- Only works with ChatGPT (chatgpt.com and chat.openai.com)
- Requires ChatGPT Plus subscription for custom GPT access
- ~~Hardcoded GPT URL~~ **Now configurable via options page!**
- ~~No icon or visual branding~~ **Custom icons added in v2.0.3!**
- Fixed retry timing may not work on very slow connections
- Maximum of 10 menus (Chrome extension context menu limit)

## Future Enhancements

Potential improvements for future versions:
- ~~Options page for configuration~~ **✅ Completed in v2.0.0**
- ~~Support for multiple custom actions~~ **✅ Completed in v2.0.0**
- ~~Configurable keyboard shortcuts~~ **✅ Completed in v2.0.0**
- ~~Multiple independent menus~~ **✅ Completed in v3.0.0**
- ~~Extension icon and branding~~ **✅ Completed in v2.0.3**
- Configurable retry timing
- Status notifications instead of alerts
- Support for Claude/other AI assistants
- Action templates marketplace
- Support for other browsers (Firefox, Edge)

## Version History

### 3.2.3 (Current)
- **Multiple Independent Menus**: Create up to 10 separate menu configurations
- **Per-Menu Settings**: Each menu has its own GPT URL, auto-submit, and Run All configuration
- **Per-Menu Actions**: Each menu maintains its own independent list of actions
- **List + Detail UI**: New sidebar layout for easy menu management
- **Enhanced Testing**: Comprehensive Playwright test suite (15+ tests)
- **Migration**: Automatic V2 → V3 configuration migration
- **Breaking Change**: Config structure updated to support multiple menus

### 2.0.0 - **Major Update: Fully Configurable**
- **Options Page**: Full configuration UI for all settings
- **Custom Actions**: Add, edit, remove, and reorder actions
- **Custom Shortcuts**: Assign any keyboard shortcut to any action with Mac compatibility
- **Configurable Context Menu Title**: Customize the right-click menu text
- **Enable/Disable Run All**: Optional "Run All Actions" feature with custom shortcut
- **Import/Export**: Backup and share configurations via JSON
- **Dynamic Menus**: Context menus rebuild automatically from config
- **Parallel Tab Creation**: Run All creates all tabs quickly while preserving order
- **Keyboard Shortcut Content Script**: Page-level shortcut handling for all URLs
- **Migration**: Automatic migration from v1.6.0 hardcoded config
- **Breaking Change**: Config now stored in chrome.storage.sync (not code)



## Privacy Policy

This extension respects your privacy and does not collect any personal data. For complete details, see our [Privacy Policy](PRIVACY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You are free to use, modify, and distribute this code for any purpose, including commercial use. The software is provided "as is" without warranty of any kind.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review console logs for error details
3. Verify configuration matches your setup

## For Developers

Looking for technical details, architecture information, or development instructions? See [DEVELOPER.md](DEVELOPER.md) for:
- Technical architecture and how it works
- Permissions and security details
- Key functions and code structure
- Development, testing, and debugging instructions

## Credits

A flexible Chrome extension for sending selected text to custom ChatGPT assistants.

---

**Note**: This extension requires a ChatGPT Plus subscription and a custom GPT. Configure your Custom GPT URL via the extension's options page.
