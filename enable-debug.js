// Run this in the extension's service worker console to enable debug logging
// Go to chrome://extensions/ → Developer mode ON → Click "service worker"

chrome.storage.session.set({debugLogging: true}).then(() => {
  console.log('✅ Debug logging enabled');
  console.log('Now test the extension on any webpage');
  console.log('Look for [Shortcuts] messages in the webpage console (not here)');
});
