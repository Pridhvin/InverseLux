(function () {
  // Luma threshold (0-255). Below this = Dark Room. Above = Lit Room.
  const AMBIENT_THRESHOLD = 35;

  let videoEl, canvasEl, ctx, hud;
  let currentState = null; // 'retinal-burn' or 'shadow-void'

  // 1. Detect if the native website background is dark or light
  function isSiteNaturallyDark() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return false;
    const [_, r, g, b] = match.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  }

  const siteIsDark = isSiteNaturallyDark();

  // 2. Inject Hostile Contrast Styles
  const style = document.createElement("style");
  style.id = "inverselux-styles";
  style.textContent = `
    /* PITCH BLACK ROOM -> FLASHBANG LIGHT MODE */
    html.force-flashbang {
      ${siteIsDark 
        ? "filter: invert(1) hue-rotate(180deg) brightness(1.4) contrast(1.1) !important; background-color: #ffffff !important;" 
        : "filter: brightness(1.4) contrast(1.1) !important; background-color: #ffffff !important;"
      }
      transition: filter 0.08s ease-in-out !important;
    }

    /* LIT ROOM -> UNREADABLE OBSIDIAN VOID */
    html.force-void {
      ${siteIsDark 
        ? "filter: brightness(0.7) contrast(0.9) !important; background-color: #000000 !important;" 
        : "filter: invert(1) hue-rotate(180deg) brightness(0.7) contrast(0.9) !important; background-color: #000000 !important;"
      }
      transition: filter 0.08s ease-in-out !important;
    }

    /* HUD Bar */
    #inverselux-hud {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      padding: 10px 18px !important;
      border-radius: 999px !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      pointer-events: none !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
      transition: all 0.2s ease !important;
    }
    .hud-burn {
      background: #ff0044 !important;
      color: #ffffff !important;
      animation: alert-strobe 0.4s infinite alternate !important;
    }
    .hud-void {
      background: #0f172a !important;
      color: #94a3b8 !important;
      border: 1px solid #334155 !important;
    }

    @keyframes alert-strobe {
      from { transform: scale(1); }
      to { transform: scale(1.04); }
    }
  `;
  document.head.appendChild(style);

  // 3. Setup Hardware & HUD Elements
  hud = document.createElement("div");
  hud.id = "inverselux-hud";
  hud.className = "hud-burn";
  hud.innerText = "CALIBRATING ADVERSARIAL SENSOR...";
  document.body.appendChild(hud);

  videoEl = document.createElement("video");
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true;
  videoEl.style.display = "none";
  document.body.appendChild(videoEl);

  canvasEl = document.createElement("canvas");
  canvasEl.width = 32;
  canvasEl.height = 32;
  canvasEl.style.display = "none";
  document.body.appendChild(canvasEl);
  ctx = canvasEl.getContext("2d", { willReadFrequently: true });

  let streamStarted = false;

  async function startCam() {
    if (streamStarted) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 64, height: 64, facingMode: "user" }
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      streamStarted = true;
      hud.innerText = "HOSTILITY ENGINE ONLINE";
      requestAnimationFrame(audit);
    } catch (e) {
      hud.innerText = "CAMERA BYPASS FAILED";
    }
  }

  // 4. Photometric Inverse Engine
  function audit() {
    if (videoEl.readyState >= 2) {
      ctx.drawImage(videoEl, 0, 0, 32, 32);
      const frame = ctx.getImageData(0, 0, 32, 32).data;
      let totalLuma = 0;

      for (let i = 0; i < frame.length; i += 4) {
        totalLuma += 0.299 * frame[i] + 0.587 * frame[i + 1] + 0.114 * frame[i + 2];
      }

      const avgLuma = totalLuma / (frame.length / 4);
      const lumaPercent = Math.round((avgLuma / 255) * 100);

      if (avgLuma < AMBIENT_THRESHOLD) {
        // DARK ROOM DETECTED -> PUNISH WITH BLINDING WHITE
        if (currentState !== "burn") {
          document.documentElement.classList.remove("force-void");
          document.documentElement.classList.add("force-flashbang");
          currentState = "burn";
        }
        hud.className = "hud-burn";
        hud.innerText = `⚡ NIGHT DETECTED → FLASHBANG 100% [${lumaPercent}% LUX]`;
      } else {
        // LIGHT ROOM DETECTED -> PUNISH WITH UNREADABLE DARK
        if (currentState !== "void") {
          document.documentElement.classList.remove("force-flashbang");
          document.documentElement.classList.add("force-void");
          currentState = "void";
        }
        hud.className = "hud-void";
        hud.innerText = `🌑 DAY DETECTED → BLACKOUT MODE [${lumaPercent}% LUX]`;
      }
    }
    requestAnimationFrame(audit);
  }

  window.addEventListener("click", startCam, { once: true });
  startCam();
})();
