const COLOR_PALETTE = [ {r: 117, g: 185, b: 190, a: 1}, {r: 105, g: 109, b: 125, a: 1},
  {r: 215, g: 38, b: 56, a: 1}, {r: 244, g: 157, b: 55, a: 1},
  {r: 244, g: 195, b: 135, a: 1}, {r: 144, g: 64, b: 40, a: 1},
  {r: 21, g: 76, b: 100, a: 1}, {r: 141, g: 164, b: 151, a: 1},
  {r: 89, g: 135, b: 77, a: 1}, {r: 46, g: 119, b: 103, a: 1},
  {r: 156, g: 175, b: 183, a: 1}, {r: 48, g: 82, b: 82, a: 1} ];

let drawMode = 2, isDrawing = false, isRandomBg = false, isWebcamAvailable = false;
let bgm, canvasBg, currBgColor;
let video, handPose, hands = []; // for hand detection
let flowers = [], selectedFlower = null;
let minDistanceBetween = Math.min(window.innerWidth, window.innerHeight) / 12; // min dist between each flower
let timeThreshold = 2000;  // 2 sec (duration for hand to stay to control ui)
let handTimer = null, heldElement = null;
let textureLayer;

function preload() { 
  bgm = loadSound('lemonade.mp3');
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textureLayer = createGraphics(windowWidth, windowHeight);
  initHandDetection();
  initTexture();
  canvasBg = color(215, 208, 200);
  currBgColor = canvasBg;
}

function draw() {
  background(currBgColor);
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
    } else if (isHandOver(toggleBtn, handPos)) {
      // start/ pause
      updateUIbyHand(toggleBtn, toggleDrawing);
    } else if (isHandOver(modeBtn, handPos)) {
      // switch mode
      updateUIbyHand(modeBtn, switchDrawingMode);
    } else if (isHandOver(bgBtn, handPos)) {
      // switch background
      updateUIbyHand(bgBtn, switchBg);
    } else {
      handTimer = null;
      heldElement = null;
    }
  } else {
    handTimer = null;
    heldElement = null;
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
      showMsg("A webcam is required for hand detection");
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
  for (let i = 0; i < 8000; i++) {
    let x = random(width);
    let y = random(height);
    let n = noise(x * 0.01, y * 0.01) * width * 0.2;
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