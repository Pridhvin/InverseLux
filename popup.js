// Popup script for InverseLux configuration and live hostile telemetry

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const statusOrb = document.getElementById("status-orb");
  const masterToggle = document.getElementById("master-toggle");
  const setupTip = document.getElementById("setup-tip");
  const tipText = document.getElementById("tip-text");
  const stateBadge = document.getElementById("state-badge");
  const luxValue = document.getElementById("lux-value");
  const meterFill = document.getElementById("meter-fill");
  const thresholdMarker = document.getElementById("meter-threshold-marker");
  const thresholdLabelIndicator = document.getElementById("threshold-label-indicator");
  const thresholdSlider = document.getElementById("threshold-slider");
  const thresholdVal = document.getElementById("threshold-val");
  const soundToggle = document.getElementById("sound-toggle");
  const soundControlsGroup = document.getElementById("sound-controls-group");
  const volumeSlider = document.getElementById("volume-slider");
  const volumeVal = document.getElementById("volume-val");
  const testSoundBtn = document.getElementById("test-sound-btn");
  const glareToggle = document.getElementById("glare-toggle");
  const hudToggle = document.getElementById("hud-toggle");
  const hardwareStatus = document.getElementById("hardware-status");

  // Load current settings & state
  const data = await chrome.storage.local.get([
    "enabled",
    "darkThreshold",
    "glareCompensation",
    "showHud",
    "soundEnabled",
    "soundVolume",
    "solarState"
  ]);

  // Set initial UI controls
  if (data.enabled !== undefined) masterToggle.checked = data.enabled;
  if (data.glareCompensation !== undefined) glareToggle.checked = data.glareCompensation;
  if (data.showHud !== undefined) hudToggle.checked = data.showHud;
  if (data.soundEnabled !== undefined) soundToggle.checked = data.soundEnabled;

  const currentVolume = data.soundVolume !== undefined ? Math.round(data.soundVolume * 100) : 70;
  volumeSlider.value = currentVolume;
  volumeVal.innerText = `${currentVolume}%`;

  const currentThreshold = data.darkThreshold || 35;
  thresholdSlider.value = currentThreshold;
  thresholdVal.innerText = `${currentThreshold}%`;
  updateThresholdMarker(currentThreshold);

  // Render initial sensor state
  if (data.solarState) {
    updateSensorUI(data.solarState, data.enabled);
  } else {
    updateSensorUI({ status: "STANDBY" }, data.enabled);
  }

  // React to storage changes in real-time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.solarState) {
      updateSensorUI(changes.solarState.newValue, masterToggle.checked);
    }
  });

  // Event Listeners for settings
  masterToggle.addEventListener("change", async () => {
    const enabled = masterToggle.checked;
    await chrome.storage.local.set({ enabled });
    updateSensorUI(data.solarState || {}, enabled);
  });

  thresholdSlider.addEventListener("input", () => {
    const val = parseInt(thresholdSlider.value, 10);
    thresholdVal.innerText = `${val}%`;
    updateThresholdMarker(val);
  });

  thresholdSlider.addEventListener("change", async () => {
    const darkThreshold = parseInt(thresholdSlider.value, 10);
    await chrome.storage.local.set({ darkThreshold });
  });

  soundToggle.addEventListener("change", async () => {
    const soundEnabled = soundToggle.checked;
    await chrome.storage.local.set({ soundEnabled });
    soundControlsGroup.style.opacity = soundEnabled ? "1" : "0.5";
  });

  volumeSlider.addEventListener("input", () => {
    const val = parseInt(volumeSlider.value, 10);
    volumeVal.innerText = `${val}%`;
  });

  volumeSlider.addEventListener("change", async () => {
    const soundVolume = parseInt(volumeSlider.value, 10) / 100;
    await chrome.storage.local.set({ soundVolume });
  });

  // Test Sound Playback
  testSoundBtn.addEventListener("click", () => {
    const vol = parseInt(volumeSlider.value, 10) / 100;
    playTestSound(vol);
  });

  function playTestSound(vol) {
    try {
      const audio = new Audio("fah.mp3");
      audio.volume = Math.max(0, Math.min(1, vol));
      audio.play().catch(() => {
        synthesizeFahSound(vol);
      });
    } catch (e) {
      synthesizeFahSound(vol);
    }
  }

  function synthesizeFahSound(volumeLevel) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;
      const masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(Math.max(0.01, volumeLevel * 0.45), now + 0.18);
      masterGain.gain.setValueAtTime(volumeLevel * 0.45, now + 0.9);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      masterGain.connect(audioCtx.destination);

      const bpf = audioCtx.createBiquadFilter();
      bpf.type = "bandpass";
      bpf.frequency.setValueAtTime(780, now);
      bpf.Q.setValueAtTime(3.5, now);
      bpf.connect(masterGain);

      const chordNotes = [174.61, 261.63, 349.23, 440.0, 523.25, 783.99];
      chordNotes.forEach((freq) => {
        [-6, 6].forEach((detune) => {
          const osc = audioCtx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, now);
          osc.detune.setValueAtTime(detune, now);

          const noteGain = audioCtx.createGain();
          noteGain.gain.setValueAtTime(0.12, now);

          osc.connect(noteGain);
          noteGain.connect(bpf);

          osc.start(now);
          osc.stop(now + 2.3);
        });
      });

      setTimeout(() => {
        try { audioCtx.close(); } catch (e) {}
      }, 2500);
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }

  glareToggle.addEventListener("change", async () => {
    const glareCompensation = glareToggle.checked;
    await chrome.storage.local.set({ glareCompensation });
  });

  hudToggle.addEventListener("change", async () => {
    const showHud = hudToggle.checked;
    await chrome.storage.local.set({ showHud });
  });

  function updateThresholdMarker(val) {
    thresholdMarker.style.left = `${val}%`;
    thresholdLabelIndicator.innerText = `THRESH: ${val}%`;
  }

  function updateSensorUI(solarState, isEnabled) {
    if (isEnabled === false) {
      statusOrb.className = "logo-orb";
      stateBadge.className = "badge badge-waiting";
      stateBadge.innerText = "OFFLINE";
      luxValue.innerText = "--";
      meterFill.style.width = "0%";
      setupTip.classList.add("hidden");
      hardwareStatus.innerText = "⏸ Inactive";
      return;
    }

    if (!solarState || solarState.status === "STANDBY") {
      statusOrb.className = "logo-orb";
      stateBadge.className = "badge badge-waiting";
      stateBadge.innerText = "STANDBY";
      luxValue.innerText = "--";
      meterFill.style.width = "0%";
      setupTip.classList.remove("hidden");
      tipText.innerText = "Click anywhere on your web page to engage the adversarial sensor.";
      hardwareStatus.innerText = "⚡ Ready";
      return;
    }

    if (solarState.status === "DENIED") {
      statusOrb.className = "logo-orb denied";
      stateBadge.className = "badge badge-denied";
      stateBadge.innerText = "DENIED";
      luxValue.innerText = "--";
      meterFill.style.width = "0%";
      setupTip.classList.remove("hidden");
      tipText.innerText = "Camera access denied. Allow camera access in your browser address bar.";
      hardwareStatus.innerText = "❌ Blocked";
      return;
    }

    // Active sensor readings
    setupTip.classList.add("hidden");
    const luma = solarState.lumaPercent !== null && solarState.lumaPercent !== undefined
      ? solarState.lumaPercent
      : "--";
    luxValue.innerText = luma;

    const fillPercent = typeof luma === "number" ? Math.min(100, Math.max(0, luma)) : 0;
    meterFill.style.width = `${fillPercent}%`;
    hardwareStatus.innerText = "⚡ Hostile Engine Online";

    const isBurn = solarState.currentState === "burn" || solarState.isBurn || solarState.status === "FLASHBANG_ACTIVE";

    if (isBurn) {
      statusOrb.className = "logo-orb active-burn";
      stateBadge.className = "badge badge-burn";
      stateBadge.innerText = "⚡ FLASHBANG";
    } else {
      statusOrb.className = "logo-orb active-void";
      stateBadge.className = "badge badge-void";
      stateBadge.innerText = "🌑 BLACKOUT";
    }
  }
});
