// Content script for InverseLux: Circadian Hostility Engine
// Enforces high-contrast biological warfare: blinding flashbang in pitch dark, obsidian blackout in daylight.

(() => {
  // Runtime configuration
  let config = {
    enabled: true,
    darkThreshold: 35,
    hysteresisMargin: 5,
    glareCompensation: true,
    showHud: true,
    soundEnabled: true,
    soundVolume: 0.7
  };

  const MONITOR_GLARE_OFFSET = 7;
  let currentState = null; // 'burn' (flashbang) or 'void' (blackout)
  let prevState = null;
  let smoothedLuma = null;
  let stream = null;
  let streamActive = false;
  let auditInterval = null;

  // 1. Detect if the native website background is naturally dark
  function isSiteNaturallyDark() {
    try {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return false;
      const [_, r, g, b] = match.map(Number);
      return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
    } catch (e) {
      return false;
    }
  }

  const siteIsDark = isSiteNaturallyDark();

  // In-memory hardware elements
  const videoEl = document.createElement("video");
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true;

  const canvasEl = document.createElement("canvas");
  canvasEl.width = 32;
  canvasEl.height = 32;
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });

  // 2. Inject Hostile Contrast Stylesheet
  const styleEl = document.createElement("style");
  styleEl.id = "inverselux-styles";
  styleEl.textContent = `
    /* PITCH BLACK ROOM -> FLASHBANG LIGHT MODE (Retinal Overdrive) */
    html.force-flashbang {
      ${siteIsDark 
        ? "filter: invert(1) hue-rotate(180deg) brightness(1.4) contrast(1.1) !important; background-color: #ffffff !important;" 
        : "filter: brightness(1.4) contrast(1.1) !important; background-color: #ffffff !important;"
      }
      transition: filter 0.08s ease-in-out !important;
    }

    /* LIT ROOM -> UNREADABLE OBSIDIAN VOID (Zero Contrast) */
    html.force-void {
      ${siteIsDark 
        ? "filter: brightness(0.7) contrast(0.9) !important; background-color: #000000 !important;" 
        : "filter: invert(1) hue-rotate(180deg) brightness(0.7) contrast(0.9) !important; background-color: #000000 !important;"
      }
      transition: filter 0.08s ease-in-out !important;
    }
  `;
  (document.head || document.documentElement).appendChild(styleEl);

  // 3. Sound Effects Engine: Play 'Fah' chord on flashbang detonation
  function playFahSound() {
    if (!config.soundEnabled) return;
    const vol = typeof config.soundVolume === "number" ? config.soundVolume : 0.7;

    try {
      const soundUrl = chrome.runtime.getURL("fah.mp3");
      const audio = new Audio(soundUrl);
      audio.volume = Math.max(0, Math.min(1, vol));
      audio.play().catch((err) => {
        synthesizeFahSound(vol);
      });
    } catch (err) {
      synthesizeFahSound(vol);
    }
  }

  // Web Audio API Synthesizer Fallback
  function synthesizeFahSound(volumeLevel) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

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
      console.warn("[InverseLux] Sound synthesis error:", e);
    }
  }

  // 4. Encapsulated Hostility HUD via Shadow DOM
  let hudHost = null;
  let hudBadge = null;
  let hudText = null;

  function createHud() {
    if (document.getElementById("inverselux-hud-host")) return;

    hudHost = document.createElement("div");
    hudHost.id = "inverselux-hud-host";
    hudHost.style.all = "initial";
    hudHost.style.position = "fixed";
    hudHost.style.bottom = "24px";
    hudHost.style.right = "24px";
    hudHost.style.zIndex = "2147483647";
    hudHost.style.pointerEvents = "auto";

    const shadow = hudHost.attachShadow({ mode: "open" });
    const shadowStyle = document.createElement("style");
    shadowStyle.textContent = `
      .inverselux-hud {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        border-radius: 999px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        user-select: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }
      .hud-burn {
        background: #ff0044;
        color: #ffffff;
        animation: alert-strobe 0.4s infinite alternate;
      }
      .hud-void {
        background: #0f172a;
        color: #94a3b8;
        border: 1px solid #334155;
      }
      .hud-standby {
        background: rgba(30, 41, 59, 0.95);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        animation: pulse-glow 2s infinite ease-in-out;
      }
      .hud-denied {
        background: #991b1b;
        color: #fee2e2;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .inverselux-hud.minimized {
        padding: 8px 12px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }
      .text-details {
        display: inline;
      }
      .minimized .text-details {
        display: none;
      }
      @keyframes alert-strobe {
        from { transform: scale(1); }
        to { transform: scale(1.04); }
      }
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45); }
        50% { box-shadow: 0 4px 24px rgba(255, 0, 68, 0.4); }
      }
    `;
    shadow.appendChild(shadowStyle);

    hudBadge = document.createElement("div");
    hudBadge.className = "inverselux-hud hud-standby";
    hudBadge.title = "InverseLux Hostility Engine (Click to toggle view)";

    const dot = document.createElement("span");
    dot.className = "dot";

    hudText = document.createElement("span");
    hudText.className = "text-details";
    hudText.innerText = "CLICK PAGE TO ENGAGE HOSTILITY ENGINE";

    hudBadge.appendChild(dot);
    hudBadge.appendChild(hudText);

    hudBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!streamActive) {
        startCamera();
      } else {
        hudBadge.classList.toggle("minimized");
      }
    });

    shadow.appendChild(hudBadge);
    (document.body || document.documentElement).appendChild(hudHost);

    updateHudVisibility();
  }

  function updateHudVisibility() {
    if (hudHost) {
      hudHost.style.display = (config.enabled && config.showHud) ? "block" : "none";
    }
  }

  // 5. Camera & Sensor Engine
  async function startCamera() {
    if (streamActive || !config.enabled) return;

    try {
      if (hudText && !streamActive) {
        hudText.innerText = "CALIBRATING ADVERSARIAL SENSOR...";
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 64 },
          height: { ideal: 64 },
          facingMode: "user"
        }
      });

      videoEl.srcObject = stream;
      await videoEl.play();
      streamActive = true;

      if (hudText) {
        hudText.innerText = "HOSTILITY ENGINE ONLINE";
      }

      if (auditInterval) clearInterval(auditInterval);
      auditInterval = setInterval(audit, 350);
      audit();
    } catch (err) {
      console.warn("[InverseLux] Camera access:", err.name, err.message);
      if (hudBadge && hudText) {
        hudBadge.className = "inverselux-hud hud-denied";
        hudText.innerText = err.name === "NotAllowedError" ? "CAMERA ACCESS DENIED" : "CLICK PAGE TO ENGAGE SENSOR";
      }
      chrome.storage.local.set({
        solarState: {
          currentState: null,
          isBurn: false,
          lumaPercent: null,
          status: "DENIED",
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
  }

  function stopCamera() {
    if (auditInterval) {
      clearInterval(auditInterval);
      auditInterval = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    streamActive = false;
  }

  // 6. Photometric Adversarial Audit Loop
  function audit() {
    if (!streamActive || videoEl.readyState < 2 || !config.enabled) return;

    ctx.drawImage(videoEl, 0, 0, 32, 32);
    const frame = ctx.getImageData(0, 0, 32, 32).data;
    let totalLuma = 0;

    for (let i = 0; i < frame.length; i += 4) {
      totalLuma += 0.299 * frame[i] + 0.587 * frame[i + 1] + 0.114 * frame[i + 2];
    }

    const rawAvgLuma = totalLuma / (frame.length / 4);
    const instantPercent = Math.round((rawAvgLuma / 255) * 100);

    // Exponential Moving Average low-pass filter
    if (smoothedLuma === null) {
      smoothedLuma = instantPercent;
    } else {
      const alpha = 0.4;
      smoothedLuma = Math.round(alpha * instantPercent + (1 - alpha) * smoothedLuma);
    }

    // Monitor glare compensation during blinding flashbang mode
    let effectiveLuma = smoothedLuma;
    if (currentState === "burn" && config.glareCompensation) {
      effectiveLuma = Math.max(0, smoothedLuma - MONITOR_GLARE_OFFSET);
    }

    // Schmitt trigger hysteresis
    const enterBurn = Math.max(5, config.darkThreshold - config.hysteresisMargin);
    const exitBurn = Math.min(95, config.darkThreshold + config.hysteresisMargin);

    let nextState = currentState;
    if (currentState !== "burn" && effectiveLuma <= enterBurn) {
      nextState = "burn";
    } else if (currentState === "burn" && effectiveLuma >= exitBurn) {
      nextState = "void";
    } else if (currentState === null) {
      nextState = effectiveLuma <= config.darkThreshold ? "burn" : "void";
    }

    applyVisualState(nextState, smoothedLuma);
  }

  function applyVisualState(nextState, lumaVal) {
    if (!config.enabled) {
      document.documentElement.classList.remove("force-flashbang", "force-void");
      currentState = null;
      prevState = null;
      if (hudBadge && hudText) {
        hudBadge.className = "inverselux-hud hud-standby";
        hudText.innerText = "HOSTILITY ENGINE DISABLED";
      }
      return;
    }

    const isMinimized = hudBadge ? hudBadge.classList.contains("minimized") : false;

    // Trigger celestial choir sound on transition into blinding flashbang
    if (prevState !== "burn" && nextState === "burn") {
      playFahSound();
    }
    prevState = currentState;
    currentState = nextState;

    if (currentState === "burn") {
      document.documentElement.classList.remove("force-void");
      document.documentElement.classList.add("force-flashbang");

      if (hudBadge && hudText) {
        hudBadge.className = "inverselux-hud hud-burn" + (isMinimized ? " minimized" : "");
        hudText.innerText = `⚡ NIGHT DETECTED → FLASHBANG 100% [${lumaVal}% LUX]`;
      }
    } else {
      document.documentElement.classList.remove("force-flashbang");
      document.documentElement.classList.add("force-void");

      if (hudBadge && hudText) {
        hudBadge.className = "inverselux-hud hud-void" + (isMinimized ? " minimized" : "");
        hudText.innerText = `🌑 DAY DETECTED → BLACKOUT MODE [${lumaVal}% LUX]`;
      }
    }

    // Update shared storage for popup telemetry
    chrome.storage.local.set({
      solarState: {
        currentState: currentState,
        isBurn: currentState === "burn",
        isDark: currentState === "burn", // backward compatibility for popup
        lumaPercent: lumaVal,
        status: currentState === "burn" ? "FLASHBANG_ACTIVE" : "BLACKOUT_ACTIVE",
        timestamp: Date.now()
      }
    }).catch(() => {});
  }

  // 7. Tab Visibility Management
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopCamera();
    } else if (document.visibilityState === "visible" && config.enabled) {
      startCamera();
    }
  });

  // 8. User Gesture Activation
  window.addEventListener("click", () => {
    if (!streamActive && config.enabled) {
      startCamera();
    }
  }, { once: false });

  // 9. Settings Initialization & Real-Time Sync
  chrome.storage.local.get([
    "enabled",
    "darkThreshold",
    "hysteresisMargin",
    "glareCompensation",
    "showHud",
    "soundEnabled",
    "soundVolume"
  ], (stored) => {
    if (stored.enabled !== undefined) config.enabled = stored.enabled;
    if (stored.darkThreshold !== undefined) config.darkThreshold = stored.darkThreshold;
    if (stored.hysteresisMargin !== undefined) config.hysteresisMargin = stored.hysteresisMargin;
    if (stored.glareCompensation !== undefined) config.glareCompensation = stored.glareCompensation;
    if (stored.showHud !== undefined) config.showHud = stored.showHud;
    if (stored.soundEnabled !== undefined) config.soundEnabled = stored.soundEnabled;
    if (stored.soundVolume !== undefined) config.soundVolume = stored.soundVolume;

    createHud();

    if (config.enabled) {
      startCamera();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;

    if (changes.enabled !== undefined) {
      config.enabled = changes.enabled.newValue;
      updateHudVisibility();
      if (!config.enabled) {
        stopCamera();
        applyVisualState(null, 0);
      } else {
        startCamera();
      }
    }
    if (changes.darkThreshold !== undefined) {
      config.darkThreshold = changes.darkThreshold.newValue;
      if (streamActive) audit();
    }
    if (changes.glareCompensation !== undefined) {
      config.glareCompensation = changes.glareCompensation.newValue;
      if (streamActive) audit();
    }
    if (changes.showHud !== undefined) {
      config.showHud = changes.showHud.newValue;
      updateHudVisibility();
    }
    if (changes.soundEnabled !== undefined) {
      config.soundEnabled = changes.soundEnabled.newValue;
    }
    if (changes.soundVolume !== undefined) {
      config.soundVolume = changes.soundVolume.newValue;
    }
  });
})();