class Flower {
  constructor({x, y}, gene) {
    this.x = x;
    this.y = y;
    this.gene = gene;
    this.initProperties();
    this.initActions();
    this.noiseOffset = random(1000);
  }

  // initialize basic actions
  initActions() {
    this.isBlooming = true; 
    this.bloomProgress = 0; 
    this.maxBloomSize = 1;
    this.isLeaving = false;
    this.verticalSpeed = -1; 
    this.windForce = random(-0.5, 0.5);
    this.windChangeFrequency = 0.3;
    this.windMagnitude = 0;
    this.windDirectionChange = 0.05;
    this.fadeProgress = 1;
  }
  
  // initialize basic flower properties (color, num of petals...)
  initProperties() {
    this.fColor = this.getColor(); 
    const minDimension = Math.min(windowWidth, windowHeight);
    this.d = map(this.gene.genes[5], 0, 1, minDimension / 6, minDimension / 4);
    this.pLen = map(this.gene.genes[6], 0, 1, 0.6, 1);
    this.pNum = Math.floor(map(this.gene.genes[7], 0, 1, 7, 11));
    this.spaceAng = map(this.gene.genes[8], 0, 1, 0.05, 0.1);
    this.waveAmp = map(this.gene.genes[9], 0, 1, 1, 1.5);
    this.waveNum = Math.floor(map(this.gene.genes[10], 0, 1, 1, 6)); 
    this.pBase = map(this.gene.genes[11], 0, 1, 0.1, 0.5);
    this.bpVisible = this.pNum > 8 && map(this.gene.genes[12], 0, 1, 0, 1) > 0.5;
    this.setupBp();
    this.centerR = map(this.gene.genes[18], 0, 1, 0.8, 1.1); 
    this.setupUnexpected();
    this.setupCurves();
    this.setupPollens();
  }
    
  // get color from palette and process with gene
  getColor() {
    let baseColor = COLOR_PALETTE[Math.floor(map(this.gene.genes[0], 0, 1, 0, COLOR_PALETTE.length - 1))];
    let r = constrain(baseColor.r + parseInt(map(this.gene.genes[1], 0, 1, -10, 10)), 0, 255);
    let g = constrain(baseColor.g + parseInt(map(this.gene.genes[2], 0, 1, -10, 10)), 0, 255);
    let b = constrain(baseColor.b + parseInt(map(this.gene.genes[3], 0, 1, -10, 10)), 0, 255);
    let a = constrain(baseColor.a + parseInt(map(this.gene.genes[4], 0, 1, -10, 10)), 225, 255);
    return color(r, g, b, a);
  }
  
  // set up petals specific genes
  setupBp() {
    this.bpSc = map(this.gene.genes[13], 0, 1, 1.1, 1.3);
    this.bpD = this.d * this.bpSc;
    this.bpRotation = map(this.gene.genes[14], 0, 1, 0, PI / this.pNum) + 5 * (Math.PI / 180);
    this.bpWaveAmp = map(this.gene.genes[15], 0, 1, 1, 2);
    this.bpLen = this.pLength + map(this.gene.genes[16], 0, 1, 0.1, 0.3);
    this.bpBase = map(this.gene.genes[17], 0, 1, 0.05, 0.5);
  }
  
  // set up petals general status
  setupUnexpected() {
    this.unexpectedPetals = [];
    for (let i = 0; i < this.pNum; i++) {
      let random = Math.random();
      if (random > 0.95) {
        this.unexpectedPetals.push(3);  // missing
      } else if (random > 0.8) {
        this.unexpectedPetals.push(2);  // folded
      } else if (random > 0.6) {
        this.unexpectedPetals.push(1);  // cut off
      } else {
        this.unexpectedPetals.push(0);  // normal
      }
    }
  }
  
  // set up curves
  setupCurves() {
    this.curvePos = [];
    for (let i = 0; i < this.pNum; i++) {
      const numCurves = Math.floor(random(1, 2));
      const curves = [];
      for (let j = 0; j < numCurves; j++) {
        const angOffset = random(0.1, 0.2);
        const ang = TWO_PI / this.pNum * i + angOffset * (TWO_PI / this.pNum);
        const len = random(0.7, 1) * this.d * this.pLen;
        curves.push({ ang, len: len });
      }
      this.curvePos.push(curves);
    }
  }

  // set up pollens
  setupPollens() {
    this.pollenNum = Math.floor(random(10, 15));
    this.pollenPos = [];
    const sz = this.d * 0.05;
    for (let i = 0; i < this.pollenNum; i++) {
      const ang = random(TWO_PI);
      const r = random(this.d * 0.1, this.d * 0.2);
      const x = r * cos(ang);
      const y = r * sin(ang);
      this.pollenPos.push({ x, y, sz });
    }
  }
  
  // called from sketch.js to make previously selected flower leave
  startLeaving() { this.isLeaving = true; }

  // bool if left screen
  isOffScreen() { return this.y < 50 || this.y > windowHeight || this.x < 0 || this.x > windowWidth; }

  // update leaving position
  updatePos() {
    this.updateWind();
    if (this.isLeaving) {
      this.verticalSpeed += this.windForce * 0.05;
      this.y += this.verticalSpeed;
      this.x += this.windForce;
    }
  }
  
  // update wind force (while leaving)
  updateWind() {
    if (random(1) < this.windChangeFrequency) {
      this.windForce += random(-0.5, 0.5);
      this.windForce = constrain(this.windForce, -this.windMagnitude, this.windMagnitude);
      if (random(1) < this.windDirectionChange)  this.windForce *= -1;
    }
  }

  // update bloom progress
  updateBloom() {
    this.bloomProgress += randomGaussian(0.02, 0.01)
    this.bloomProgress = Math.min(this.bloomProgress, 1);
    if (this.bloomProgress >= 1)  this.isBlooming = false;
  }

  // update fading progress
  updateFading() {
    this.fadeProgress -= randomGaussian(0.02, 0.01)
    this.fadeProgress = Math.max(this.fadeProgress, 0);
  }
  
  // draw flower (called from graphics.js)
  drawFlower() {
    this.updatePos();
    if (this.isBlooming) this.updateBloom();
    if (this.isLeaving) this.updateFading();
    // update dimension based on blooming/fading progress
    let currD = lerp(this.d / 2, this.d, this.bloomProgress);
    let currPLen = lerp(this.pLen / 2, this.pLen, this.bloomProgress);
    let currBpD = lerp(this.d / 2 * this.bpSc, this.bpD, this.bloomProgress);
    let currBpLen = lerp(this.pLen / 2 * this.bpSc, this.bpLen, this.bloomProgress);
    push();
    translate(this.x, this.y);
    // back petals & outline
    if (this.bpVisible && this.bloomProgress > 0.22) {
      fill(255, this.bloomProgress * 255);
      this.drawPetals(currBpD, this.bpRotation, this.bpWaveAmp, currBpLen, this.bpBase, false, false);
      this.drawOutline(currBpD, this.bpRotation, this.bpWaveAmp, currBpLen, this.bpBase);
    }
    // front petals & outline
    if (this.bloomProgress > 0.25) {
      this.drawPetals(currD, 0, this.waveAmp, currPLen, this.pBase, false, true);
      if (!this.bpVisible) this.drawOutline(currD, 0.01, this.waveAmp, currPLen, this.pBase);
      for (let i = 0; i < this.pNum; i++) { this.drawPetalCurves(i); }
    }
    // update alpha based on blooming/fading progress
    let updatedA = this.getUpdatedA(false);    
    // flower center
    if (this.bloomProgress > 0.2) this.drawCenter(currD);
    // pollens
    if (this.bloomProgress > 0.5)  this.drawPollens(updatedA);
    pop();
  }
  
  // petals style
  stylizePetal(isOutline, isFrontPetal) {
    let currA = this.getUpdatedA(isFrontPetal);
    if (isOutline) { 
      noFill();
    } else { 
      fill(red(this.fColor), green(this.fColor), blue(this.fColor), currA); 
    }   
    strokeWeight(4);
    stroke(44, 44, 44, currA);
  }

  // return alpha value for blooming & fading
  getUpdatedA(isFrontPetal) {
    let baseA = this.bpVisible && isFrontPetal ? 255 : this.fColor._getAlpha();
    let currA = constrain(baseA *= (this.isLeaving ? this.fadeProgress : this.bloomProgress), 0, baseA);
    return currA;
  }
  
  // draw flower pollens
  drawPollens(updatedA) {
    push();
    fill(44, 44, 44, updatedA);
    noStroke();
    for (let i = 0; i < this.pollenNum; i++) {
      let pollen = this.pollenPos[i];
      ellipse(pollen.x, pollen.y, pollen.sz, pollen.sz);
    }
    pop();
  }
  
  //draw flower center
  drawCenter(currD) {
    let updatedA = this.getUpdatedA(true);
    let currCenter = lerp(0.3, 1, this.bloomProgress);
    let baseR = currD * this.centerR * 0.2;
    push();
    beginShape();
    for (let ang = 0; ang < TWO_PI; ang += 0.1) {
      let r = baseR * currCenter * (0.7 * noise(this.noiseOffset + ang * 5) + 1);
      let x = r * cos(ang);
      let y = r * sin(ang);
      vertex(x, y);
    }
    fill(240, 234, 214, updatedA);
    endShape(CLOSE);
    pop();
  }  
  
  // draw flower outline
  drawOutline(d, rot, waveAmp, len, base) {
    let outlineSz = d * 1.06;
    this.drawPetals(outlineSz, rot, waveAmp * 1.02, len * 1.03, base, true, false);
  }

  // draw flower petals
  drawPetals(d, rotOffset, waveAmp, len, base, isOutline, isFrontPetal) {
    let currR = d * this.centerR * 0.2;  
    for (let i = 0; i < this.pNum; i++) {
      if (this.unexpectedPetals[i] === 3) continue; // if petal missing, skip
      let ang = TWO_PI / this.pNum * i + rotOffset;
      let nextAng = TWO_PI / this.pNum * (i + 1) + rotOffset;
      let baseInnerR = currR;
      let unexpected = this.unexpectedPetals[i];  // if petal cut, fold, or missing
      let outerR = this.getPetalOuterR(d, len, unexpected, i, this.noiseOffset);
      let start = p5.Vector.fromAngle(ang + this.spaceAng, currR );
      let end = p5.Vector.fromAngle(nextAng - this.spaceAng, currR );
      beginShape();
      this.stylizePetal(isOutline); 
      vertex(start.x, start.y);
      this.pSideCurve(start, end, baseInnerR, i);
      this.pTopCurve(ang, nextAng, this.spaceAng, outerR, unexpected, waveAmp, i);
      vertex(end.x, end.y);
      endShape(CLOSE);
    }
  }
  
  // draw curves on petals
  // drawPetalCurves(petal) {
  //   if (this.bloomProgress > 0.5) {
  //     const curves = this.curvePos[petal];
  //     for (let i = 0; i < curves.length; i++) {
  //       let curve = curves[i];
  //       let currLen = curve.length * (this.bloomProgress - 0.5) * 2;
  //       this.drawCurveLine(curve.angle, currLen);
  //     }
  //   }
  // }
  
  setupCurves() {
    this.curvePos = [];
    for (let i = 0; i < this.pNum; i++) {
      const numCurves = floor(random(1, 3));
      const curves = [];
      for (let j = 0; j < numCurves; j++) {
        const frac = random(0.25, 0.75);
        const bend = random(-0.18, 0.18);
        curves.push({ frac, bend });
      }
      this.curvePos.push(curves);
    }
  }

  drawPetalCurves(petalIdx) {
    if (this.bloomProgress <= 0.5) return;
    const d = this.d;
    const currLen = lerp(0.2, 1.0, this.bloomProgress);
    const a = this.getUpdatedA(true) * 0.9; 

    push();
    stroke(44, 44, 44, a);
    strokeWeight(3);

    const baseAngle = (TWO_PI / this.pNum) * petalIdx;
    for (const c of this.curvePos[petalIdx]) {
      const startR = d * 0.18;
      const endR   = d * 0.1 + d * c.frac * currLen;
      const midA   = baseAngle + c.bend;

      const s = p5.Vector.fromAngle(baseAngle, startR);
      const e = p5.Vector.fromAngle(baseAngle, endR);
      const m1 = p5.Vector.fromAngle(midA, (startR + endR) * 0.45);
      const m2 = p5.Vector.fromAngle(midA, (startR + endR) * 0.7);

      noFill();
      beginShape();
      vertex(s.x, s.y);
      bezierVertex(m1.x, m1.y, m2.x, m2.y, e.x, e.y);
      endShape();
    }
    pop();
  }

  drawCurveLine(ang, len) {
    let start = p5.Vector.fromAngle(ang, len * 0.3);
    let p1 = p5.Vector.fromAngle(ang + 0.1, len * 0.5);
    let p2 = p5.Vector.fromAngle(ang + 0.2, len * 0.644);
    let end = p5.Vector.fromAngle(ang + 0.3, len * 0.4);
    push();
    stroke(44, 44, 44);
    strokeWeight(2);
    noFill();
    pop();
    beginShape();
    vertex(start.x, start.y);
    bezierVertex(p1.x, p1.y, p2.x, p2.y, end.x, end.y);
    endShape();
  }
  
  pSideCurve(start, end, r, idx) {
    let midAng = (start.heading() + end.heading()) / 2;
    let midR = r + noise(this.noiseOffset + idx * 0.2) * 5;
    let midPoint = p5.Vector.fromAngle(midAng, midR);
    quadraticVertex(midPoint.x, midPoint.y, end.x, end.y);
  }
  
  pTopCurve(ang, nextAng, spaceAng, outerR, unexpected, waveAmp, petalIdx) {
    let waveLen = (nextAng - ang - 2 * this.spaceAng) / this.waveNum;
    let waveInvert = (unexpected === 2) ? -1 : 1; 
    for (let j = 0; j <= this.waveNum; j++) {
      let waveAng = ang + spaceAng + j * waveLen;
      let baseWaveH = outerR + waveInvert * sin(waveAng * 10) * waveAmp;
      let noiseEffect = noise(this.noiseOffset + petalIdx * 0.1 + j) * 5; 
      let waveH = baseWaveH + noiseEffect;
      let wavePoint = p5.Vector.fromAngle(waveAng, waveH);
      curveVertex(wavePoint.x, wavePoint.y);
    }
    let startNoise = noise(this.noiseOffset + petalIdx * 0.1 + ang) * 5;
    let endNoise = noise(this.noiseOffset + petalIdx * 0.1 + nextAng) * 5;
    let start = p5.Vector.fromAngle(ang + this.spaceAng, outerR + startNoise);
    let end = p5.Vector.fromAngle(nextAng - this.spaceAng, outerR + endNoise);
    vertex(start.x, start.y);
    vertex(end.x, end.y);
  }
  
  // return petal outer radius
  getPetalOuterR(d, len, unexpected, idx, noiseOffset) {
    if (unexpected == 1) { // petal cut off
      return d * len * 0.9;
    } else if (unexpected == 2) { // petal folded
      return d * len + noise(noiseOffset + idx * 0.3) * 20;
    }
    return d * len; // regular petal
  }
}
