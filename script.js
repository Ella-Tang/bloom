// hand indicator
const smoothFactor = 0.1, moveThreshold = 600;
let prevX = window.innerWidth / 2, prevY = window.innerHeight / 2;
// ui
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const uiBar = document.querySelector(".ui-bar");
const message = document.getElementById("message")
const selectedMark = document.getElementById("selected-mark");
const handInd = document.getElementById("hand-ind");
const toggleBtn = document.getElementById("toggle-btn");
const ICON_STATE = { play: 'assets/icons/play.svg', pause: 'assets/icons/pause.svg' };
const ICON_MODE = { hand:  'assets/icons/hand.svg', mouse: 'assets/icons/mouse.svg' };
const ICON_FULLSCREEN = { enter: 'assets/icons/fullscreen.svg', exit:  'assets/icons/exit_fullscreen.svg' };
const clearBtn = document.getElementById("clear-btn");
const modeBtn = document.getElementById("mode-btn");
const actionButtons = document.querySelector(".action-buttons");
const roundBtn = document.getElementById("round-frame-btn");
const rectBtn = document.getElementById("rect-frame-btn");
modeBtn.textContent = drawMode === 1 ? "Switch to Mouse" : "Switch to Hand";
let suppressCanvasClick = false;
const uiButtons = [uiBar, actionButtons, roundBtn, rectBtn, toggleBtn, clearBtn, modeBtn];
// snapshot frames
const frameOptions = document.getElementById("frame-options");
const framePreview = {
  active: false,
  img: null,
  x: 0, y: 0, w: 0, h: 0,
  startedAt: 0,
  duration: 1500
};
const FRAME_ROUND_SRC = 'assets/frame_round.png';
const FRAME_RECT_SRC  = 'assets/frame_rect.png';
const frameOverlay = document.getElementById('frame-overlay');
const frameOverlayImg = document.getElementById('frame-overlay-img');

function start() {
  startScreen.classList.add('hide');
  setTimeout(() => startScreen.remove(), 320);
  if (typeof toggleDrawing === 'function' && !window.isDrawing) {
    toggleDrawing();
  }
}

// fullscreen
setFullscreenIcon(false);

document.addEventListener('fullscreenchange', () => {
  setFullscreenIcon(isFullscreen());
});
document.addEventListener('webkitfullscreenchange', () => {
  setFullscreenIcon(isFullscreen());
});

function enterFullscreen(el = document.documentElement) {
  const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (rfs) rfs.call(el);
}

function exitFullscreen() {
  const xfs = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (xfs) xfs.call(document);
}

function isFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
}

function toggleFullscreen() {
  isFullscreen() ? exitFullscreen() : enterFullscreen(document.documentElement);
}

function setFullscreenIcon(isFull) {
  const fsBtn = document.getElementById('fullscreen-btn');
  if (!fsBtn) return;
  fsBtn.innerHTML = ''; // clear existing image
  const img = document.createElement('img');
  img.src = isFull ? ICON_FULLSCREEN.exit : ICON_FULLSCREEN.enter;
  img.alt = isFull ? 'Exit Fullscreen' : 'Enter Fullscreen';
  fsBtn.appendChild(img);
}


// prevent propagate
['pointerdown','mousedown','touchstart','click'].forEach(evt => {
  uiButtons.forEach(el => {
    if (!el) return;
    el.addEventListener(evt, (e) => {
      suppressCanvasClick = true;
      e.stopPropagation();
      e.preventDefault();
    }, { passive: false });
  });
});
['pointerup','mouseup','touchend','touchcancel'].forEach(evt => { window.addEventListener(evt, () => { suppressCanvasClick = false; }, { passive: true });});

// event listener click
document.addEventListener("click", (e) => {
  if (frameOptions.style.display === "flex") {
    const clickedInsideButtons =
      roundBtn.contains(e.target) || rectBtn.contains(e.target);
    const clickedOnTrigger = e.target.id === "snapshot-btn";
    if (!clickedInsideButtons && !clickedOnTrigger) {
      frameOptions.style.display = "none";
    }
  }
});

// snapshot (select-flash-capture-reveal)
function toggleFrameOptions() {
  frameOptions.style.display = frameOptions.style.display === "flex" ? "none" : "flex";
}
function selectFrame(type) {
  currFrame = type;
  frame = (type === 'round') ? frameRound : frameRect;
  // close picker with fade
  frameOptions.style.animation = "fadeOut 0.3s ease forwards";
  setTimeout(() => {
    frameOptions.style.display = "none";
    frameOptions.style.animation = "";
    // flash → capture → reveal
    flashEffect();
    setTimeout(() => {
      const ar = frame.width / frame.height;                // frame aspect ratio
      const rect = computeFrameRectLogical(ar);
      takeSnapshotWithRect(rect, { revealInOverlay: true, autoDownload: true });
    }, 90);
  }, 300);
}

function computeFrameRectLogical(ar) {
  let fw = width;
  let fh = fw / ar;
  if (fh > height) { fh = height; fw = fh * ar; }
  const fx = (width  - fw) / 2;
  const fy = (height - fh) / 2;
  return { fx, fy, fw, fh };
}

function takeSnapshotWithRect({ fx, fy, fw, fh }, { revealInOverlay = true, autoDownload = true } = {}) {
  // centered square content inside frame rect
  const side = Math.min(fw, fh);
  const cx = fx + fw / 2, cy = fy + fh / 2;
  let sx = Math.round(cx - side / 2);
  let sy = Math.round(cy - side / 2);
  sx = Math.max(0, Math.min(sx, Math.round(width  - side)));
  sy = Math.max(0, Math.min(sy, Math.round(height - side)));

  const squareCrop = get(sx, sy, Math.round(side), Math.round(side));
  const processed = applyFilter(squareCrop, { desat: 0.06, fade: 16, sharpen: 0.65, blurForHP: 4 });

  const out = createGraphics(Math.round(fw), Math.round(fh));
  out.pixelDensity(1);

  const drawSize = Math.max(out.width, out.height);
  const dx = Math.round((out.width  - drawSize) / 2);
  const dy = Math.round((out.height - drawSize) / 2);
  out.image(processed, dx, dy, drawSize, drawSize);

  const frameImg = (currFrame === 'round') ? frameRound : frameRect;
  out.image(frameImg, 0, 0, out.width, out.height);

  // --- bottom-left logo ---
  if (logoImg) {
    const pad = Math.round(out.width * 0.04);
    const targetH = Math.round(out.height * 0.08);
    const aspect = (logoImg.width && logoImg.height) ? (logoImg.width / logoImg.height) : 1;
    const targetW = Math.round(targetH * aspect);
    out.push();
    out.image(logoImg, pad, out.height - targetH - pad, targetW, targetH);
    out.pop();
  }

  // timestamp
  out.textAlign(RIGHT, BOTTOM);
  out.textFont(graceFont);
  out.textSize(out.width * 0.04);
  out.fill(40, 40, 40, 180);
  out.noStroke();
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  out.text(`${dateStr}  ${timeStr}`, out.width - out.width * 0.07, out.height - out.height * 0.03);

  if (revealInOverlay) {
    // show snapshot
    const url = out.elt.toDataURL('image/png');
    frameOverlay.classList.add('show');
    frameOverlayImg.className = '';              // reset classes
    frameOverlayImg.classList.add('is-final');   // animate in
    frameOverlayImg.src = url;
    // download
    if (autoDownload) setTimeout(() => save(out, `bloom_${currFrame || 'frame'}.png`), 150);
    // hide overlay after 3 seconds
    setTimeout(() => {
      frameOverlay.classList.remove('show');
    }, 3000);
  } else {
    save(out, `bloom_${currFrame || 'frame'}.png`);
  }
}

// close overlay when clicking outside the image
frameOverlay.addEventListener('click', (e) => { if (e.target === frameOverlay) { frameOverlay.classList.remove('show'); } });

// filter
function applyFilter(srcImg, { desat = 0.06, fade = 16, sharpen = 0.6, blurForHP = 4 } = {}) {
  const w = srcImg.width, h = srcImg.height;
  // base
  const base = createGraphics(w, h); base.pixelDensity(1);
  base.image(srcImg, 0, 0, w, h);
  // desaturation
  if (desat > 0) {
    const keep = 1 - desat;
    base.loadPixels();
    for (let i = 0; i < base.pixels.length; i += 4) {
      const r = base.pixels[i], g = base.pixels[i+1], b = base.pixels[i+2];
      const gray = 0.299*r + 0.587*g + 0.114*b;
      base.pixels[i]   = gray + (r - gray) * keep;
      base.pixels[i+1] = gray + (g - gray) * keep;
      base.pixels[i+2] = gray + (b - gray) * keep;
    }
    base.updatePixels();
  }
  if (fade > 0) {
    base.noStroke();
    base.fill(255, fade); 
    base.rect(0, 0, w, h);
  }
  // Unsharp mask
  if (sharpen > 0) {
    const blurG = createGraphics(w, h); blurG.pixelDensity(1);
    blurG.image(base, 0, 0, w, h);
    blurG.filter(BLUR, blurForHP);
    // high-pass: base - blur
    base.loadPixels(); blurG.loadPixels();
    for (let i = 0; i < base.pixels.length; i += 4) {
      const hr = base.pixels[i]   - blurG.pixels[i];
      const hg = base.pixels[i+1] - blurG.pixels[i+1];
      const hb = base.pixels[i+2] - blurG.pixels[i+2];
      base.pixels[i]   = Math.max(0, Math.min(255, base.pixels[i]   + sharpen * hr));
      base.pixels[i+1] = Math.max(0, Math.min(255, base.pixels[i+1] + sharpen * hg));
      base.pixels[i+2] = Math.max(0, Math.min(255, base.pixels[i+2] + sharpen * hb));
    }
    base.updatePixels();
  }
  return base;
}

function flashEffect(duration = 800, hold = 60) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: '#fff',
    opacity: '0',                       // start transparent
    transition: `opacity ${duration}ms ease`,
    zIndex: '999999',
    pointerEvents: 'none'
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';        // flash up
    setTimeout(() => {
      overlay.style.opacity = '0';      // fade back
      setTimeout(() => overlay.remove(), duration + 40);
    }, hold);
  });
}

// indicator for hand position in hand detection mode
function showHandInd() {
  const handPos = getHandPos();
  if (drawMode === 1 && handPos) {
    const { x, y } = handPos;
    const smoothedX = lerp(prevX, x, smoothFactor);
    const smoothedY = lerp(prevY, y, smoothFactor);
    prevX = smoothedX;
    prevY = smoothedY; 
    handInd.style.left = `${smoothedX - 45}px`;
    handInd.style.top = `${smoothedY - 45}px`;
    handInd.style.display = "block"; 
  } else {
    prevX = window.innerWidth / 2;
    prevY = window.innerHeight / 2;
    handInd.style.display = "none";
  }
}

// circle mark to show flower selected
function showSelectedMark(x, y, d) {
  const offset = d*2.1;
  selectedMark.style.width = `${offset}px`;
  selectedMark.style.height = `${offset}px`;
  selectedMark.style.left = `${x - offset / 2}px`;
  selectedMark.style.top = `${y - offset / 2}px`;
  selectedMark.style.display = "block";
}

// clear selected mark
function clearSelectedMark() {
  selectedMark.style.display = "none";
}

// clear canvas
function clearCanvas() {
  clearFlowers(); 
}

// if interaction within drawing area
function inDrawingArea({ x, y }) {
  return (
    x >= 0 &&
    x <= window.innerWidth &&
    y >= uiBar.offsetHeight &&
    y <= window.innerHeight - uiBar.offsetHeight
  );
}

// toggle state
if (typeof isDrawing === 'undefined') window.isDrawing = false;
function setToggleIcon(isOn) {
  toggleBtn.innerHTML = '';
  const img = document.createElement('img');
  img.src = isOn ? ICON_STATE.pause : ICON_STATE.play;
  img.alt = isOn ? 'Pause' : 'Start';
  img.classList.add('icon');
  toggleBtn.appendChild(img);
  toggleBtn.setAttribute('title', isOn ? 'Pause' : 'Start');
}
setToggleIcon(isDrawing);

function toggleDrawing() {
  isDrawing = !isDrawing;
  setToggleIcon(isDrawing);
  showMsg(isDrawing ? "STARTED" : "PAUSED");
  if (isDrawing) { playMusic(); } else { pauseMusic(); }
}

// render the mode button based on the *current* mode
function setModeButton() {
  const isHand = drawMode === 1;
  const label = isHand ? 'Mouse Mode' : 'Hand Mode';
  const icon  = isHand ? ICON_MODE.mouse : ICON_MODE.hand;
  modeBtn.innerHTML = `
    <img class="btn-icon" src="${icon}" aria-hidden="true">
    <span class="btn-label">${label}</span>
  `;
  modeBtn.setAttribute('aria-label', label);
  modeBtn.title = label;
}

setModeButton();

// switch mode
function switchDrawingMode() {
  modeBtn.textContent = drawMode === 1 ? "Hand Mode" : "Mouse Mode";
  if (drawMode === 2 && !isWebcamAvailable) {
    // try to switch to hand detection but webcam not available
    showMsg("Cannot switch to Hand mode\n\nWebcam not available");
    console.log("Cannot switch to Hand mode, currently in Mouse mode");
    setModeButton();
  } else {
    // toggle between Mouse Control (2) and Hand Detection (1)
    drawMode = drawMode === 1 ? 2 : 1;
    console.log("Mode switched to:", drawMode === 1 ? "Hand Mode" : "Mouse Mode");
    showMsg(drawMode === 1 ? "HAND MODE" : "MOUSE MODE");
    if (drawMode === 2) handInd.style.display = "none";
    setModeButton();
  }
}

// display drawing mode switch/ drawing state message
function showMsg(content) {
  message.textContent = content;
  message.style.display = 'block';
  setTimeout(() => {
    message.style.display = 'none';
  }, 1200);
}

// music control
function playMusic() {
  if (bgm && bgm.isLoaded() && !bgm.isPlaying()) bgm.loop();
  console.log("Music on");
}

function pauseMusic() {
  if (bgm && bgm.isPlaying()) bgm.pause();
  console.log("Music off");
}