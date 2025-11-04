const COLOR_PALETTE = [
  { r: 227, g: 196, b: 190, a: 1 },
  { r: 229, g: 216, b: 181, a: 1 },
  { r: 165, g: 153, b: 116, a: 1 },
  { r: 151, g: 103, b: 0,   a: 1 },
  { r: 159, g: 98,  b: 77,  a: 1 },
  { r: 133, g: 53,  b: 53,  a: 1 },
  { r: 156, g: 175, b: 183, a: 1 },
  { r: 91,  g: 126, b: 145, a: 1 },
  { r: 21,  g: 76,  b: 100, a: 1 },
  { r: 119, g: 153, b: 150, a: 1 },
  { r: 130, g: 195, b: 168, a: 1 },
  { r: 118, g: 151, b: 96,  a: 1 },
  { r: 240, g: 232, b: 170, a: 1 },
  { r: 225, g: 162, b: 94,  a: 1 },
  { r: 208, g: 128, b: 82,  a: 1 },
  { r: 210, g: 127, b: 127, a: 1 },
];

let drawMode = 1, isDrawing = false, isRandomBg = false, isWebcamAvailable = false;
let bgm, canvasBg, currBgColor, paper;
let video, handPose, hands = []; // for hand detection
let flowers = [], selectedFlower = null;
let minDistanceBetween = Math.min(window.innerWidth, window.innerHeight) / 12; // min dist between each flower
let timeThreshold = 1800;  // 1.8 sec (duration for hand to stay to control ui)
let handTimer = null, heldElement = null;
let textureLayer;
let frameRound, frameRect, frame = null, logoImg;
let currFrame = null;
let graceFont;

function preload() { 
  bgm = loadSound('assets/lemonade.mp3');
  paper = loadImage('assets/paper.jpg');
  frameRound = loadImage('assets/frame_round.png');
  frameRect = loadImage('assets/frame_rect.png');
  logoImg = loadImage('assets/icons/logo.svg');
  handPose = ml5.handPose({ flipped: true });
  graceFont = loadFont('assets/CoveredByYourGrace-Regular.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textureLayer = createGraphics(windowWidth, windowHeight);
  initHandDetection();
  initTexture();
  canvasBg = color(0, 0, 0);
  currBgColor = canvasBg;
}

function draw() {
  background(currBgColor);
  image(paper, 0, 0, width, height);
  noTint();
  if (drawMode == 1) {
    updatebyHand();
    showHandInd();
  } else {
    updatebyMouse(mouseX, mouseY);
  }
  drawFlowers();
  image(textureLayer, 0, 0);
}

// update flower status through mouse interaction
function updatebyMouse(x, y) {
  if (suppressCanvasClick) return;
  const isPressed = mouseIsPressed || touches.length > 0;
  if (isDrawing && inDrawingArea({ x, y }) && isPressed && 
  !flowerCreated && !isFlowerSelected({ x, y })) {
    createNewFlower({ x, y });
    flowerCreated = true;
    clearSelectedMark();
  }
}

function mouseReleased() { flowerCreated = false; }

function touchEnded() { flowerCreated = false; }

// update flower status through hand detection
function updatebyHand() {
  if (suppressCanvasClick) return;
  let handPos = getHandPos();
  if (handPos) {
    if (isDrawing && inDrawingArea(handPos)) {
      if (handTimer === null) {
        handTimer = new Date().getTime();
      } else if (new Date().getTime() - handTimer >= timeThreshold) {
        if (!isFlowerSelected(handPos)) {
          createNewFlower(handPos);
          console.log("New flower created");
          handTimer = null;
        }
      }
    }  else if (isHandOver(clearBtn, handPos)) {
      // clear canvas
      updateUIbyHand(clearBtn, clearCanvas);
      clearBtn.classList.add("hand-hover");
    } else if (isHandOver(toggleBtn, handPos)) {
      // start/ pause
      updateUIbyHand(toggleBtn, toggleDrawing);
      toggleBtn.classList.add("hand-hover");
    } else if (isHandOver(modeBtn, handPos)) {
      // switch mode
      updateUIbyHand(modeBtn, switchDrawingMode);
      modeBtn.classList.add("hand-hover");
    } else {
      handTimer = null;
      heldElement = null;
      clearBtn.classList.remove("hand-hover");
      toggleBtn.classList.remove("hand-hover");
      modeBtn.classList.remove("hand-hover");
    }
  } else {
    handTimer = null;
    heldElement = null;
    clearBtn.classList.remove("hand-hover");
    toggleBtn.classList.remove("hand-hover");
    modeBtn.classList.remove("hand-hover");
  }
}

function updateUIbyHand(element, action) {
  if (handTimer === null || heldElement !== element) {
    handTimer = new Date().getTime();
    heldElement = element;
    console.log(`Hand on ${element.id}`);
  } else if (new Date().getTime() - handTimer >= timeThreshold) {
    action();
    console.log(`${element.id} triggered`);
    handTimer = null;
    heldElement = null;
  }
}

// if hand over ui/ flower helper
function isHandOver(element, handPos) {
  const rect = element.getBoundingClientRect();
  return (
    handPos.x >= rect.left && handPos.x <= rect.right &&
    handPos.y >= rect.top && handPos.y <= rect.bottom
  );
}

function updateButtonHoverEffect(element) {
  const buttons = [clearBtn, toggleBtn, modeBtn];
  buttons.forEach(btn => {
    if (btn === element) {
      btn.classList.add("hand-hover");
    } else {
      btn.classList.remove("hand-hover");
    }
  });
}

// draw all the flowers
function drawFlowers() {
  let i = 0;
  while (i < flowers.length) {
    flowers[i].drawFlower();  
    if (flowers[i].isOffScreen()) {
      flowers.splice(i, 1);
    } else {
      i++;
    }
  }
}

// clear all the flowers
function clearFlowers() { 
  flowers = [];
  selectedFlower = null;
  clearSelectedMark(); // function from script.js
}

// create new flower based on genes (chance to mutate)
function createNewFlower(pos) {
  if (isPosValid(pos)) {
  let gene = selectedFlower ? selectedFlower.gene.getClone() : new Gene();
  let newFlower = new Flower(pos, gene);
  flowers.push(newFlower);
  console.log(`A flower created with ${selectedFlower ? "cloned genes" : "random genes"}`);
  console.log(`There are ${flowers.length} flower(s) now`);      
  if (selectedFlower)  {
    selectedFlower.startLeaving();
    console.log("Previously selected flower is leaving");
  }
    selectedFlower = null;
    clearSelectedMark();
  }
}

// if flower selected
function isFlowerSelected(pos) {
  for (let flower of flowers) {
    if (dist(pos.x, pos.y, flower.x, flower.y) < flower.d / 2) {
      selectedFlower = flower;
      showSelectedMark(flower.x, flower.y, flower.d);
      console.log("A flower is selected");
      return true;
    }
  }
  return false;
}

// if new flower position is valid (to avoid overlap)
function isPosValid(pos) {
  for (let flower of flowers) {
    let distance = dist(pos.x, pos.y, flower.x, flower.y);
    if (distance < minDistanceBetween) {
      console.log("Unable to create, too close to another");
      if (!selectedFlower) showMsg("Too close to draw, try a different place");
      return false;
    }
  }
  return true;
}

// initialize video/ webcam & hand detection
function initHandDetection() {
  // access user webcam
  navigator.mediaDevices.getUserMedia({ video: true })
  .then(function(stream) {
    // if found, proceed with video setup and hand detection
    isWebcamAvailable = true;
    video = createCapture(VIDEO);
    video.hide();
    video.size(windowWidth, windowHeight);
    handPose.detectStart(video, gotHands);
  })
  .catch(function(error) {
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      // if not found, show message
      isWebcamAvailable = false;
      showMsg("A webcam is required for hand detect mode.");
    } else {
      console.error("An error occurred accessing the webcam:", error);
    }
  });
}

// hand detection helper
function gotHands(results) { hands = results; }

// hand detection helper
function getHandPos() {
  if (hands.length > 0) {
    let hand = hands[0];
    if (hand.confidence > 0.1) {
    let idxFingerTip = hand.keypoints[8];
    let x = idxFingerTip.x;
    let y = idxFingerTip.y;
    return { x, y };
    }
  }
  return null; 
}

// initialize top layer texture
function initTexture() {
  textureLayer.background(0, 0);
  for (let i = 0; i < 3000; i++) {
    let x = random(width);
    let y = random(height);
    let n = noise(x * 0.01, y * 0.01) * width * 0.35;
    textureLayer.stroke("rgba(234,227,210,0.1)");
    textureLayer.line(x + n / 2, y, x + n / 2, y + n);
    textureLayer.line(x, y + n / 2, x + n, y + n / 2);
  }
}

// screen resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  textureLayer = createGraphics(windowWidth, windowHeight);
  initTexture();
}

// return key press to enable full screen
document.addEventListener("keydown", function (event) {
  if (event.key === ' ') {
  let fs = fullscreen();
  fullscreen(!fs);
  }
});