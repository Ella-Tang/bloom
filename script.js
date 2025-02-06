const uiBar = document.querySelector(".ui-bar");
const message = document.getElementById("message")
const selectedMark = document.getElementById("selected-mark");
const handInd = document.getElementById("hand-ind");
const toggleBtn = document.getElementById("toggle-btn");
const clearBtn = document.getElementById("clear-btn");
const modeBtn = document.getElementById("mode-btn");
const bgBtn = document.getElementById("bg-btn");
modeBtn.textContent = drawMode === 1 ? "Manuel" : "Gesture";
toggleBtn.textContent = isDrawing === 1 ? "Pause" : "Start";

// hand indicator related
const smoothFactor = 0.1;
const moveThreshold = 600;
let prevX = window.innerWidth / 2;
let prevY = window.innerHeight / 2;

// indicator for hand position in hand detection mode
function showHandInd() {
  const handPos = getHandPos();
  if (drawMode === 1 && handPos) {
    const { x, y } = handPos;
    const smoothedX = lerp(prevX, x, smoothFactor);
    const smoothedY = lerp(prevY, y, smoothFactor);
    prevX = smoothedX;
    prevY = smoothedY; 
    handInd.style.left = `${smoothedX - 30}px`;
    handInd.style.top = `${smoothedY - 30}px`;
    handInd.style.display = "block"; 
  } else {
    prevX = window.innerWidth / 2;
    prevY = window.innerHeight / 2;
    handInd.style.display = "none";
  }
}

// circle mark to show flower selected
function showSelectedMark(x, y, d) {
  const offset = d * 1.2;
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
  showMsg("Canvas cleared");
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

// toggle drawing state
function toggleDrawing() {
  isDrawing = !isDrawing;
  toggleBtn.textContent = isDrawing ? "Pause" : "Start";
  showMsg(isDrawing ? "Drawing started" : "Drawing paused");
  if (isDrawing) { playMusic(); } 
  else { pauseMusic(); }
}

// switch drawing mode
function switchDrawingMode() {
  modeBtn.textContent = drawMode === 1 ? "Gesture" : "Manual";
  if (drawMode === 2 && !isWebcamAvailable) {
    // try to switch to hand detection but webcam not available
    showMsg("Cannot switch to gesture mode\nWebcam not available");
    console.log("Cannot switch to hand mode, currently in mouse mode");
  } else {
    // toggle between Mouse Control (2) and Hand Detection (1)
    drawMode = drawMode === 1 ? 2 : 1;
    console.log("Mode switched to:", drawMode === 1 ? "Gesture" : "Manual");
    showMsg(drawMode === 1 ? "Switch to gesture mode" : "Switch to manual mode");
    if (drawMode === 2) handInd.style.display = "none";
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

// switch background color
function switchBg() {
  isRandomBg = !isRandomBg;
  console.log("Background switched");
  showMsg(isRandomBg ? "Background switched to random" : "Background switched to default");
  if (isRandomBg) {
    // random color from palette
    let random = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    currBgColor = color(random.r, random.g, random.b, 200);
  } else {
    // reset to default
    currBgColor = canvasBg;
  }
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