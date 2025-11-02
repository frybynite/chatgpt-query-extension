# Keyboard Shortcut Platform Mapping

## Overview

Keyboard shortcuts are stored in configuration files and displayed differently based on the user's platform (Mac vs Windows/Linux). The extension automatically converts between platform-specific representations for optimal user experience.

## Key Mapping

| Modifier Key | Windows/Linux Display | Mac Display | Storage Format (Either) |
|--------------|----------------------|-------------|-------------------------|
| Control      | `Ctrl`               | `⌃`         | `Ctrl` or `⌃`          |
| Alt/Option   | `Alt`                | `⌥`         | `Alt` or `⌥`           |
| Shift        | `Shift`              | `⇧`         | `Shift` or `⇧`         |
| Meta/Command | `Meta`               | `⌘`         | `Meta` or `⌘`          |

## Storage Format

Shortcuts are stored in the configuration file in one of two formats:

1. **PC Format**: `Ctrl+Shift+S`, `Alt+Meta+X`
2. **Mac Format**: `⌃+⇧+S`, `⌥+⌘+X`

Both formats are valid and can coexist in the same configuration file.

## Display Behavior

### On Mac (macOS)
- **Shortcuts stored as PC format** (`Ctrl+Shift+S`) → Displayed as `⌃+⇧+S`
- **Shortcuts stored as Mac format** (`⌃+⇧+S`) → Displayed as `⌃+⇧+S`
- **Context menus** show Mac symbols: `⌃`, `⌥`, `⇧`, `⌘`
- **Options page** shows Mac symbols when displaying shortcuts
- **Capture new shortcuts** saves them using Mac symbols

### On Windows/Linux
- **Shortcuts stored as PC format** (`Ctrl+Shift+S`) → Displayed as `Ctrl+Shift+S`
- **Shortcuts stored as Mac format** (`⌃+⇧+S`) → Displayed as `Ctrl+Shift+S`
- **Context menus** show PC key names: `Ctrl`, `Alt`, `Shift`, `Meta`
- **Options page** shows PC key names when displaying shortcuts
- **Capture new shortcuts** saves them using PC key names

## Implementation Details

### Platform Detection

**Options Page (options.js)**:
```javascript
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
```

**Background Service Worker (background.js)**:
```javascript
const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
```

### Conversion Functions

#### Display Conversion
Converts stored shortcuts to platform-appropriate display format:

**To Mac symbols** (when running on Mac):
```javascript
function toMacSymbols(shortcut) {
  return shortcut
    .replace(/Ctrl/g, '⌃')
    .replace(/Alt/g, '⌥')
    .replace(/Shift/g, '⇧')
    .replace(/Meta/g, '⌘');
}
```

**To PC names** (when running on Windows/Linux):
```javascript
function toPCNames(shortcut) {
  return shortcut
    .replace(/⌃/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift')
    .replace(/⌘/g, 'Meta');
}
```

### Validation

The validation regex in `config.js` accepts both formats:
```javascript
const validShortcutPattern = /^(Ctrl|Alt|Shift|Meta|⌃|⌥|⇧|⌘)(\+(Ctrl|Alt|Shift|Meta|⌃|⌥|⇧|⌘))*\+.+$/;
```

## User Experience

### Cross-Platform Configuration Files

Users can:
1. Export configuration on Mac → Import on Windows → Shortcuts display correctly
2. Export configuration on Windows → Import on Mac → Shortcuts display correctly
3. Manually edit config files using either format → Extension handles both

### Example Scenarios

**Scenario 1**: Mac user exports config with `⌃+⇧+S`
- Windows user imports → Sees `Ctrl+Shift+S` in UI
- Windows user exports → Contains `Ctrl+Shift+S`
- Original Mac user imports back → Sees `⌃+⇧+S` in UI

**Scenario 2**: Windows user exports config with `Ctrl+Alt+D`
- Mac user imports → Sees `⌃+⌥+D` in UI
- Mac user exports → Contains `⌃+⌥+D`
- Original Windows user imports back → Sees `Ctrl+Alt+D` in UI

## Technical Notes

### Why Both Formats Are Supported

1. **User Experience**: Users expect to see platform-native symbols
2. **Cross-Platform Compatibility**: Config files can be shared between platforms
3. **Manual Editing**: Advanced users can edit config files using familiar notation
4. **Migration**: Existing configs from different platforms remain valid

### Context Menu Display

Chrome's context menu API supports keyboard shortcuts in menu titles using tab separation:
```javascript
chrome.contextMenus.create({
  title: "Summarize\tCtrl+Shift+S"  // Shortcut appears right-aligned
});
```

The extension converts shortcuts to platform-appropriate symbols before displaying in context menus.
