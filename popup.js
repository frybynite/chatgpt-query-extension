// Get version from manifest and update display
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = `v${manifest.version}`;

// Handle settings button click
document.getElementById('settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
