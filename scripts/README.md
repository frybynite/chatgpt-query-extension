# Store Screenshots Script

This directory contains scripts for generating Chrome Web Store screenshots using Playwright.

## Taking Store Screenshots

To generate screenshots for the Chrome Web Store listing:

```bash
npm run screenshots
```

This will:
- Launch Chrome with the extension loaded
- Navigate through the options page
- Capture 4 high-quality screenshots (1280x800, 16:10 aspect ratio)
- Save them to `store-screenshots/` directory

## Screenshots Generated

1. **01-options-page-overview.png** - Clean overview of the options page
2. **02-menu-with-action.png** - Menu with a sample action configured
3. **03-multiple-menus.png** - Multiple menus in the sidebar
4. **04-complete-interface.png** - Full-page view showing the complete interface

## Chrome Web Store Requirements

The screenshots meet Chrome Web Store requirements:
- **Size**: 1280x800 pixels
- **Aspect ratio**: 16:10 (preferred by Chrome Web Store)
- **Format**: PNG
- **Quality**: High-resolution, suitable for store listing

## Tips

- Add descriptive captions for each screenshot in your store listing
- You can edit/crop the screenshots as needed
- Consider adding annotations or highlights to emphasize features
- Update screenshots when you make significant UI changes

## Customizing

To customize the screenshots, edit `take-store-screenshots.js`:
- Change viewport size for different dimensions
- Add/remove screenshot scenarios
- Modify the sample data shown in screenshots
- Adjust timing/delays if needed
