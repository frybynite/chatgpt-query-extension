# Keyboard Shortcut Platform Mapping

## Overview

Keyboard shortcuts are stored in configuration files using Chrome's standard key names (`Ctrl`, `Alt`, `Shift`, `Meta`) regardless of platform. The extension automatically converts these to platform-appropriate display formats (Mac symbols or Windows abbreviations) for optimal user experience.

## Key Mapping

| Modifier Key | Chrome Storage Format | Windows/Linux Display | Mac Display | Mac Tooltip Name |
|--------------|----------------------|----------------------|-------------|------------------|
| Control      | `Ctrl`               | `Ctrl`               | `⌃`         | `Control`        |
| Alt/Option   | `Alt`                | `Alt`                | `⌥`         | `Option`         |
| Shift        | `Shift`              | `Shift`              | `⇧`         | `Shift`          |
| Meta/Command | `Meta`               | `Meta`               | `⌘`         | `Command`        |

## Storage Format

**All shortcuts are stored using Chrome's standard format** (`Ctrl`, `Alt`, `Shift`, `Meta`) regardless of the platform where they were created or saved. This ensures consistency across platforms and compatibility with Chrome's KeyboardEvent API.

**Examples:**
- `Ctrl+Shift+S` (stored as-is)
- `Alt+Meta+X` (stored as-is)
- `Meta+Shift+K` (stored as-is)

**Note:** The old format using Mac Unicode symbols (`⌃`, `⌥`, `⇧`, `⌘`) is automatically converted to Chrome format when shortcuts are loaded or saved.

## Display Behavior

### On Mac (macOS)
- **Shortcuts stored in Chrome format** (`Ctrl+Shift+S`) → Displayed as `⌃+⇧+S` in input fields
- **Tooltips** show Mac names: `Control + Shift + S` (Alt becomes "Option", Meta becomes "Command")
- **Context menus** show Mac symbols: `⌃`, `⌥`, `⇧`, `⌘`
- **Options page** shows Mac symbols (⌃, ⌥, ⇧, ⌘) in shortcut input fields
- **When saving/exporting** shortcuts are converted back to Chrome format (`Ctrl`, `Alt`, `Shift`, `Meta`)

### On Windows/Linux
- **Shortcuts stored in Chrome format** (`Ctrl+Shift+S`) → Displayed as `Ctrl+Shift+S` in input fields
- **Tooltips** show standard names: `Control + Shift + S` (Meta becomes "Windows")
- **Context menus** show PC key names: `Ctrl`, `Alt`, `Shift`, `Meta`
- **Options page** shows PC key names when displaying shortcuts
- **When saving/exporting** shortcuts remain in Chrome format (`Ctrl`, `Alt`, `Shift`, `Meta`)

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

#### Storage Format Normalization
All shortcuts are normalized to Chrome format before storage:
```javascript
function normalizeToChromeFormat(shortcut) {
  // Convert Mac symbols to Chrome format
  return shortcut
    .replace(/⌃/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift')
    .replace(/⌘/g, 'Meta');
}
```

#### Display Conversion
Converts stored Chrome format shortcuts to platform-appropriate display format:

**To Mac symbols** (when running on Mac):
```javascript
function toMacSymbols(shortcut) {
  // Input is always Chrome format (Ctrl, Alt, Shift, Meta)
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
  // Input is always Chrome format, so just return as-is
  // But handle legacy Mac symbols if any exist
  return shortcut
    .replace(/⌃/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift')
    .replace(/⌘/g, 'Meta');
}
```

#### Tooltip Conversion
Converts Chrome format to platform-appropriate tooltip names:

**On Mac:**
- `Ctrl` → `Control`
- `Alt` → `Option`
- `Shift` → `Shift`
- `Meta` → `Command`

**On Windows/Linux:**
- `Ctrl` → `Control`
- `Alt` → `Alt`
- `Shift` → `Shift`
- `Meta` → `Windows`

### Validation

The validation regex in `config.js` accepts Chrome format and legacy Mac symbols (for backward compatibility):
```javascript
const validShortcutPattern = /^(Ctrl|Alt|Shift|Meta|⌃|⌥|⇧|⌘)(\+(Ctrl|Alt|Shift|Meta|⌃|⌥|⇧|⌘))*\+.+$/;
```

## User Experience

### Cross-Platform Configuration Files

Since all shortcuts are stored in Chrome format (`Ctrl`, `Alt`, `Shift`, `Meta`):
1. Export configuration on Mac → Contains `Ctrl+Shift+S` (Chrome format)
2. Import on Windows → Displays as `Ctrl+Shift+S` (Windows format)
3. Import on Mac → Displays as `⌃+⇧+S` (Mac symbols)
4. Re-export on Mac → Still contains `Ctrl+Shift+S` (Chrome format preserved)

### Example Scenarios

**Scenario 1**: Mac user creates shortcut `⌘+⇧+S` (Command+Shift+S)
- Captured in input field: `⌘+⇧+S` (Mac symbols)
- Stored in config: `Meta+Shift+S` (Chrome format)
- Tooltip shows: `Command + Shift + S`
- Exported JSON contains: `"Meta+Shift+S"`
- Windows user imports → Sees `Meta+Shift+S` in input field, tooltip shows `Windows + Shift + S`

**Scenario 2**: Windows user creates shortcut `Ctrl+Alt+D`
- Captured in input field: `Ctrl+Alt+D`
- Stored in config: `Ctrl+Alt+D` (Chrome format)
- Tooltip shows: `Control + Alt + D`
- Exported JSON contains: `"Ctrl+Alt+D"`
- Mac user imports → Sees `⌃+⌥+D` in input field, tooltip shows `Control + Option + D`

## Technical Notes

### Why Chrome Format for Storage

1. **Consistency**: Single format across all platforms eliminates confusion
2. **Chrome API Compatibility**: Matches Chrome's KeyboardEvent API (`event.metaKey`, `event.altKey`, etc.)
3. **Cross-Platform Compatibility**: Config files work identically on all platforms
4. **Migration**: V2→V3 migration doesn't need to change shortcuts (already in Chrome format)
5. **Display Flexibility**: Can convert to any display format without losing information

### Storage vs Display

- **Storage**: Always Chrome format (`Ctrl`, `Alt`, `Shift`, `Meta`)
- **Display**: Platform-appropriate symbols/names
  - Mac: Unicode symbols (⌃, ⌥, ⇧, ⌘) in input fields
  - Mac: Mac names (Control, Option, Shift, Command) in tooltips
  - Windows/Linux: Abbreviations (Ctrl, Alt, Shift, Meta) in input fields and tooltips

### Context Menu Display

Chrome's context menu API supports keyboard shortcuts in menu titles using tab separation:
```javascript
chrome.contextMenus.create({
  title: "Summarize\tCtrl+Shift+S"  // Shortcut appears right-aligned
});
```

The extension converts Chrome format shortcuts to platform-appropriate symbols before displaying in context menus.

### Migration Notes

When upgrading from V2 to V3:
- Shortcuts are preserved as-is since V2 already used Chrome format (`Ctrl`, `Alt`, `Shift`, `Meta`)
- No conversion needed during migration
- Legacy configs with Mac symbols (⌃, ⌥, ⇧, ⌘) are automatically converted to Chrome format when loaded
