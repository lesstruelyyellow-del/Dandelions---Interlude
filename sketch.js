
let hourCircles = [];
let minuteCircles = [];
let fibers = [];
let centerX, centerY;
let video;
let handPose;
let hands = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  centerX = width / 2;
  centerY = height / 2;

  // --- 1. Initialize Hour Circles ---
  for (let i = 0; i < 12; i++) {
    // Start randomly in a large area to allow sorting
    hourCircles.push(new HourCircle(centerX + random(-50, 50), centerY + random(-50, 50), i));
  }

  // Run Physics Packing Simulation
  // Enforce strict non-overlap
  for (let i = 0; i < 5000; i++) {
    for (let h of hourCircles) {
      // Attraction to Center (Stronger to pack them tight)
      let centerForce = createVector(centerX - h.pos.x, centerY - h.pos.y);
      centerForce.mult(0.01);
      h.applyForce(centerForce);

      // Separation from others (Very strict)
      for (let other of hourCircles) {
        if (h !== other) {
          let d = h.pos.dist(other.pos);
          let minDist = h.r + other.r + 5; // +5 padding
          if (d < minDist && d > 0) {
            let push = p5.Vector.sub(h.pos, other.pos);
            push.normalize();
            push.mult(2.5); // Strong push
            h.applyForce(push);
          }
        }
      }
      h.updatePhysics();
    }
  }

  // Sort Hour Circles Clockwise
  hourCircles.forEach(h => {
    let a = atan2(h.pos.y - centerY, h.pos.x - centerX);
    let sortedAngle = a + HALF_PI;
    while (sortedAngle < 0) sortedAngle += TWO_PI;
    while (sortedAngle >= TWO_PI) sortedAngle -= TWO_PI;
    h.sortedAngle = sortedAngle;
  });
  hourCircles.sort((a, b) => a.sortedAngle - b.sortedAngle);

  // Renumber indices to 0..11 based on sort (0 is top/12:00)
  for (let i = 0; i < hourCircles.length; i++) {
    hourCircles[i].index = i;
    hourCircles[i].homePos = hourCircles[i].pos.copy();
  }

  // --- 2. Initialize Minute Circles (Ring) ---
  let ringRadius = min(width, height) * 0.35;
  for (let i = 0; i < 60; i++) {
    let angle = map(i, 0, 60, -HALF_PI, TWO_PI - HALF_PI);
    let mx = centerX + cos(angle) * ringRadius;
    let my = centerY + sin(angle) * ringRadius;
    minuteCircles.push(new MinuteCircle(mx, my, i, ringRadius, angle));
  }

  // --- 3. Create Fibers ---
  // Multi-strand for feathery volume
  for (let i = 0; i < 60; i++) {
    let hIndex = floor(i / 5) % 12;
    let targetHour = hourCircles[hIndex];
    let targetMinute = minuteCircles[i];

    // 3 strands per connection
    for (let k = 0; k < 3; k++) {
      fibers.push(new Fiber(targetHour, targetMinute, k));
    }
  }

  // --- 4. Hand Pose ---
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  handPose = ml5.handPose({ flipped: true }, modelLoaded);
  handPose.detectStart(video, gotHands);
}

function modelLoaded() {
  console.log("HandPose ready");
}

function gotHands(results) {
  hands = results;
}

function draw() {
  background(0, 0, 0, 30); // Dark background with slight trail? No, let's do solid clean.
  background(0, 0, 5);

  let h = hour();
  let m = minute();
  let s = second();
  let normHour = h % 12;
  if (normHour === 0) normHour = 12;

  // Interaction Point
  let repel = null;
  if (hands.length > 0 && hands[0].keypoints[8]) {
    let k = hands[0].keypoints[8];
    repel = createVector(
      map(k.x, 0, video.width, 0, width),
      map(k.y, 0, video.height, 0, height)
    );
  }

  // "Dancing" -> Global Wind/Breathing
  let t = millis() * 0.001;
  let wind = createVector(sin(t) * 0.5, cos(t * 0.7) * 0.5);

  // 1. Draw Fibers (Bottom Layer)
  for (let f of fibers) {
    // Highlight fiber if it belongs to current second
    let isSecond = f.m.index === s;
    f.display(repel, isSecond, s, t);
  }

  // 2. Draw Hour Circles
  for (let i = 0; i < hourCircles.length; i++) {
    let isActive = i < normHour;
    hourCircles[i].update(repel);
    hourCircles[i].display(isActive);
  }

  // 3. Draw Minute Circles
  for (let i = 0; i < minuteCircles.length; i++) {
    let isActive = i < m;
    let isSecond = i === s;
    minuteCircles[i].update(repel);
    minuteCircles[i].display(isActive, isSecond);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setup();
}

// --- Classes ---

class HourCircle {
  constructor(x, y, id) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.r = 28; // Visible distinct circles
    this.homePos = null;
    this.index = id;
  }

  applyForce(f) { this.acc.add(f); }

  updatePhysics() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.vel.mult(0.6); // Heavy damping
    this.acc.mult(0);
  }

  update(repel) {
    // Tether
    if (this.homePos) {
      let tether = p5.Vector.sub(this.homePos, this.pos);
      tether.mult(0.1);
      this.applyForce(tether);
    }
    // Repel
    if (repel) {
      let d = this.pos.dist(repel);
      if (d < 180) {
        let f = p5.Vector.sub(this.pos, repel);
        f.normalize();
        f.mult(map(d, 0, 180, 5, 0));
        this.applyForce(f);
      }
    }
    this.updatePhysics();
  }

  display(active) {
    noStroke();
    if (active) {
      // "Golden" -> Hue 45
      // But let's use the gradient scheme active logic? 
      // The prompt asked for "Golden" specifically for hours originally.
      // Let's stick to Gold for Hours to distinguish them, or Warm gradient.
      fill(45, 80, 100);
      drawingContext.shadowBlur = 25;
      drawingContext.shadowColor = "gold";
    } else {
      // Dark inactive
      fill(240, 20, 20); // Dark Blueish Grey
      drawingContext.shadowBlur = 0;
    }
    ellipse(this.pos.x, this.pos.y, this.r * 2);
    drawingContext.shadowBlur = 0;
  }
}

class MinuteCircle {
  constructor(x, y, index, radius, angle) {
    this.homePos = createVector(x, y);
    this.pos = this.homePos.copy();
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.r = 8;
    this.index = index;
    this.angle = angle;
  }
  applyForce(f) { this.acc.add(f); }

  update(repel) {
    let tether = p5.Vector.sub(this.homePos, this.pos);
    tether.mult(0.1);
    this.applyForce(tether);

    if (repel) {
      let d = this.pos.dist(repel);
      if (d < 100) {
        let f = p5.Vector.sub(this.pos, repel);
        f.normalize();
        f.mult(map(d, 0, 100, 10, 0));
        this.applyForce(f);
      }
    }
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.vel.mult(0.85);
    this.acc.mult(0);
  }

  display(active, isSecond) {
    noStroke();
    // Rainbow Gradient Color based on index
    let hueVal = map(this.index, 0, 60, 0, 360);

    if (isSecond) {
      // BRIGHT WHITE pulse
      fill(0, 0, 100);
      drawingContext.shadowBlur = 30;
      drawingContext.shadowColor = "white";
      ellipse(this.pos.x, this.pos.y, this.r * 2.5);
    } else if (active) {
      // Active Color (Rainbow)
      fill(hueVal, 80, 100);
      drawingContext.shadowBlur = 15;
      // Use hex for shadow color approx or just default
      drawingContext.shadowColor = color(hueVal, 80, 100);
      ellipse(this.pos.x, this.pos.y, this.r * 2);
    } else {
      // Inactive (Ghostly)
      fill(hueVal, 40, 30);
      drawingContext.shadowBlur = 0;
      ellipse(this.pos.x, this.pos.y, this.r);
    }
    drawingContext.shadowBlur = 0;
  }
}

class Fiber {
  constructor(h, m, variant) {
    this.h = h;
    this.m = m;
    this.variant = variant;
    // Random offset for "feathery" spread
    this.offset = random(-1, 1);
  }

  display(repel, isSecond, s, time) {
    noFill();
    strokeWeight(0.5); // Very thin for feathery look

    // Dancing Sway
    // Sine wave based on angle + time
    let swayAmount = 15;
    let sway = sin(time * 2 + this.m.angle + this.variant) * swayAmount;

    // Calculate curve points
    let start = this.h.pos;
    let end = this.m.pos;
    let midX = (start.x + end.x) / 2;
    let midY = (start.y + end.y) / 2;

    // Spread the mid-point control to create volume
    let anglePerp = this.m.angle + HALF_PI;
    let spread = (this.variant - 1) * 20; // -20, 0, 20

    let cpX = midX + cos(anglePerp) * (spread + sway);
    let cpY = midY + sin(anglePerp) * (spread + sway);

    if (isSecond) {
      stroke(0, 0, 100, 80); // White highlight
      strokeWeight(1.5);
    } else {
      // Gradient Color
      let hueVal = map(this.m.index, 0, 60, 0, 360);
      stroke(hueVal, 60, 90, 30); // Low opacity
    }

    bezier(start.x, start.y, cpX, cpY, cpX, cpY, end.x, end.y);
  }
}
