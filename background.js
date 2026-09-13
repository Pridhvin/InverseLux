// Background service worker for Solar-Powered Dark Mode
// Initializes extension defaults and handles configuration storage.

chrome.runtime.onInstalled.addListener(async () => {
  const defaults = {
    enabled: true,
    darkThreshold: 35, // Percentage (0-100)
    hysteresisMargin: 5, // +/- 5% buffer to prevent flickering
    glareCompensation: true, // Compensate for monitor reflection during bright violation
    showHud: true,
    soundEnabled: true, // Play 'Fah' sound effect on light violation
    soundVolume: 0.7, // Volume level (0.0 - 1.0)
    solarState: {
      isDark: false,
      lumaPercent: null,
      status: "STANDBY",
      timestamp: Date.now()
    }
  };

  const current = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  for (const [key, value] of Object.entries(defaults)) {
    if (current[key] === undefined) {
      toSet[key] = value;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
  console.log("[SolarDarkMode] Initialized with defaults.");
});
