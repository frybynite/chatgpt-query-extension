# AI Custom Prompts - Chrome Extension

A Chrome extension that lets you send selected text to ChatGPT or Gemini with configurable custom prompts, shortcuts, and settings.

## Features

- **Multi-Provider** ✨ **NEW in v4.0.0**: Supports ChatGPT (chatgpt.com), ChatGPT custom GPTs, Gemini (gemini.google.com/app), and Gemini Gems
- **Multiple Menus**: Create up to 10 independent menu configurations, each pointing to a different AI assistant
- **Fully Configurable**: Configure all actions, shortcuts, and settings via options page
- **Custom Actions**: Add, edit, remove, and reorder actions without code changes
- **Drag-and-Drop Reordering**: Reorder menus and actions by dragging the handle (≡) icon
- **Enable/Disable Actions**: Toggle individual actions on/off without deleting them
- **Custom Shortcuts**: Assign any keyboard shortcut to any action
- **Import/Export**: Backup and share configurations via JSON
- **Context Menu Integration**: Right-click selected text to send it to your AI assistant
- **Smart Tab Management**: Automatically opens or focuses the AI tab
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

All configuration is done through the options page (chrome://extensions → Details → Extension options).

**User Interface Layout:**
- **Left Sidebar**: Lists all your menus (up to 10) with drag-and-drop reordering
- **Right Panel**: Shows configuration and actions for the selected menu
- **Hamburger Menu (☰)**: Access Import/Export and Debug Logging toggle
- **Info Icons (ⓘ)**: Click for helpful explanations of each setting

**Configuration Options:**
- **Multiple Menus**: Create up to 10 separate menu configurations
  - Each menu has its own name (becomes the context menu title) - **Required**, max 50 characters
  - Each menu has its own AI Assistant URL - **Required** (see supported URLs below)
  - Each menu has its own Auto Submit setting
  - Each menu has its own Run All configuration with optional keyboard shortcut
  - Each menu has its own list of actions
  - Drag the handle (≡) to reorder menus
- **Actions**: Add, edit, remove, enable/disable, and reorder actions
  - **Title** (required) - Appears in context menu
  - **Prompt** (required) - The text sent to the AI assistant
  - **Keyboard Shortcut** (optional) - Quick access key combination
  - **Enabled** checkbox - Toggle actions on/off without deleting
  - Drag the handle (≡) to reorder actions within a menu
- **Global Settings**:
  - **Clear Context**: Clears ChatGPT context before injecting new prompts (default: enabled)
  - **Debug Logging**: Enable detailed console logging for troubleshooting (in hamburger menu)

## Supported AI Providers

| Provider | Example URL |
|----------|-------------|
| ChatGPT | `https://chatgpt.com/` |
| ChatGPT custom GPT | `https://chatgpt.com/g/g-XXXXXXXXX-your-gpt-name` |
| Gemini | `https://gemini.google.com/app` |
| Gemini Gem | `https://gemini.google.com/gem/<gem-id>` |

### Setting Up ChatGPT

1. Go to [chatgpt.com](https://chatgpt.com) (requires ChatGPT Plus for custom GPTs)
2. To use a custom GPT: click profile → "My GPTs" → create or select a GPT → copy the URL
3. Paste the URL into the menu's "AI Assistant URL" field in extension options

### Setting Up Gemini

1. Go to [gemini.google.com/app](https://gemini.google.com/app) and sign in
2. For a Gem: open the Gem, copy the URL (format: `gemini.google.com/gem/<id>`)
3. Paste the URL into the menu's "AI Assistant URL" field in extension options

## Usage

### Context Menu
1. Select text on any webpage
2. Right-click the selection
3. Choose your menu, then select an action from the context menu
4. The extension will open/focus the AI tab and insert the text
5. If Auto-Submit is enabled, the prompt will be submitted automatically

**Note:** Only enabled actions appear in the context menu. Disabled actions are hidden but remain configured.

### Keyboard Shortcuts
1. Select text on any webpage
2. Press your configured keyboard shortcut for any enabled action
3. The extension will open/focus the AI tab and insert the text

### Customizing Shortcuts

1. Go to Extension options (chrome://extensions → Details → Extension options)
2. Click the keyboard icon (⌨️) next to any action
3. Press your desired key combination
4. Click "Save"

## Import/Export Configuration

### Exporting Your Configuration

1. Open Extension options
2. Click the hamburger menu (☰) in the top-left corner
3. Click "Export Menus..."
4. Save the downloaded `chatgpt-actions-config.json` file

### Importing a Configuration

1. Open Extension options
2. Click the hamburger menu (☰) in the top-left corner
3. Click "Import Menus..."
4. Select a previously exported configuration file
5. Confirm the import

**Warning:** Importing will replace your current configuration. Export your current settings first if you want to preserve them.

## Troubleshooting

### Extension doesn't insert text
- Check that the AI assistant URL is correctly configured
- Ensure the AI page is fully loaded before selecting text
- Try disabling auto-submit and manually clicking send
- Enable **Debug Logging** in the hamburger menu (☰) and check browser console for details

### Tabs not opening correctly
- Verify the AI Assistant URL is correct in extension options
- Ensure you are signed in to the AI service
- Enable **Debug Logging** to see tab management details in the console

### Keyboard shortcuts don't work
- Ensure no other extension is using the same shortcuts
- Configure shortcuts in the extension options page
- **After changing shortcuts, reload any open tabs** for changes to take effect
- Some system shortcuts may override extension shortcuts
- Check that the action is **Enabled** (checkbox must be checked)

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
- Organize related actions into separate menus (e.g., "Work ChatGPT", "Gemini Research")
- Keep menu names short and descriptive (max 50 characters)
- Export your configuration regularly as backup

## Limitations

- Works with ChatGPT (chatgpt.com), Gemini (gemini.google.com), and custom GPTs/Gems
- Requires ChatGPT Plus subscription for custom GPT access
- Fixed retry timing may not work on very slow connections
- Maximum of 10 menus (Chrome extension context menu limit)

## Future Enhancements

Potential improvements for future versions:
- ~~Options page for configuration~~ **✅ Completed in v2.0.0**
- ~~Support for multiple custom actions~~ **✅ Completed in v2.0.0**
- ~~Configurable keyboard shortcuts~~ **✅ Completed in v2.0.0**
- ~~Multiple independent menus~~ **✅ Completed in v3.0.0**
- ~~Extension icon and branding~~ **✅ Completed in v2.0.3**
- ~~Gemini and Gemini Gems support~~ **✅ Completed in v4.0.0**
- Support for additional AI providers (Claude, Copilot, etc.)
- Configurable retry timing
- Status notifications instead of alerts
- Support for other browsers (Firefox, Edge)

## Privacy Policy

This extension respects your privacy and does not collect any personal data. For complete details, see our [Privacy Policy](PRIVACY.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review console logs for error details
3. Verify configuration matches your setup

## For Developers

Looking for technical details, architecture information, or development instructions? See [DEVELOPER.md](DEVELOPER.md).

---

**Note**: Gemini requires a Google account. ChatGPT custom GPTs require a ChatGPT Plus subscription.
