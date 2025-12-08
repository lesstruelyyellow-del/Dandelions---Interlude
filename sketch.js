// Texture images
let hoursGreyTexture;
let hoursGlowTexture;
let minutesGreyTexture;
let minutesGlowTexture;
let secondsGreyTexture;

let hourCircles = [];
let minuteCircles = [];
let secondCircles = [];
let fronds = [];
let centerX, centerY;
let containerRadius = 200; // Compact cluster radius (increased for larger circles)
let time = 0; // Animation time

// Preload textures
function preload() {
    hoursGreyTexture = loadImage('hoursGrey.png');
    hoursGlowTexture = loadImage('hoursGlow.png');
    minutesGreyTexture = loadImage('minutesGrey.png');
    minutesGlowTexture = loadImage('minutesGlow.png');
    secondsGreyTexture = loadImage('secondsGrey.png');
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    centerX = width / 2;
    centerY = height / 2;

    // Initialize 12 hour circles with circle-packing
    for (let i = 0; i < 12; i++) {
        hourCircles.push(new HourCircle(centerX, centerY, i));
    }

    // Randomize glow priorities for random switching pattern
    let priorities = [];
    for (let i = 0; i < 12; i++) {
        priorities.push(i);
    }
    // Shuffle the priorities
    for (let i = priorities.length - 1; i > 0; i--) {
        let j = floor(random(i + 1));
        [priorities[i], priorities[j]] = [priorities[j], priorities[i]];
    }
    // Assign shuffled priorities to circles
    for (let i = 0; i < hourCircles.length; i++) {
        hourCircles[i].glowPriority = priorities[i];
    }

    // Run circle-packing algorithm to settle hour circles
    for (let iteration = 0; iteration < 500; iteration++) {
        for (let i = 0; i < hourCircles.length; i++) {
            for (let j = i + 1; j < hourCircles.length; j++) {
                hourCircles[i].separate(hourCircles[j]);
            }
        }

        for (let c of hourCircles) {
            c.containInCircle(centerX, centerY, containerRadius);
            c.update();
        }
    }

    // Initialize 120 fronds radiating from hourCore boundary
    fronds = [];
    for (let i = 0; i < 120; i++) {
        fronds.push(new Frond(i, 120));
    }

    // Initialize 60 minute circles in radial distribution
    for (let i = 0; i < 60; i++) {
        minuteCircles.push(new MinuteCircle(centerX, centerY, i));
    }

    // Run circle-packing algorithm to settle minute circles
    for (let iteration = 0; iteration < 800; iteration++) {
        for (let i = 0; i < minuteCircles.length; i++) {
            for (let j = i + 1; j < minuteCircles.length; j++) {
                minuteCircles[i].separate(minuteCircles[j]);
            }
        }

        for (let c of minuteCircles) {
            c.containInRing(centerX, centerY, 150, 250);
            c.update();
        }
    }

    // Initialize 60 second circles at frond tips
    secondCircles = [];
    for (let i = 0; i < 60; i++) {
        secondCircles.push(new SecondCircle(i));
    }
}

function draw() {
    background(30); // Dark background

    centerX = width / 2;
    centerY = height / 2;
    time += 0.01; // Increment animation time

    // Get current time in 12-hour format
    let h = hour();
    let h12 = h % 12; // Convert to 12-hour format (0-11)
    if (h12 === 0) h12 = 12; // Handle midnight/noon as 12
    let m = minute();
    let s = second();

    // Apply circle-packing physics for hour circles
    for (let i = 0; i < hourCircles.length; i++) {
        for (let j = i + 1; j < hourCircles.length; j++) {
            hourCircles[i].separate(hourCircles[j]);
        }
    }

    // Apply circle-packing physics for minute circles
    for (let i = 0; i < minuteCircles.length; i++) {
        for (let j = i + 1; j < minuteCircles.length; j++) {
            minuteCircles[i].separate(minuteCircles[j]);
        }
    }

    // Draw fronds from hourCore boundary (behind everything)
    for (let frond of fronds) {
        frond.display(centerX, centerY, containerRadius, time);
    }

    // Draw second circles at frond tips
    for (let i = 0; i < secondCircles.length; i++) {
        let isHighlighted = i === s;
        secondCircles[i].display(isHighlighted);
    }

    // Update and display minute circles
    for (let i = 0; i < minuteCircles.length; i++) {
        minuteCircles[i].containInRing(centerX, centerY, 150, 250);
        minuteCircles[i].update();

        // Highlight the current minute
        let isHighlighted = i === m;
        minuteCircles[i].display(isHighlighted);
    }

    // Update and display hour circles (on top)
    for (let i = 0; i < hourCircles.length; i++) {
        hourCircles[i].containInCircle(centerX, centerY, containerRadius);

        // Set glow state based on current hour using random priority
        // Circles with glowPriority < h12 should glow
        let shouldGlow = hourCircles[i].glowPriority < h12;
        hourCircles[i].setGlowState(shouldGlow);

        hourCircles[i].update();

        // Draw circle
        hourCircles[i].display(shouldGlow);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    centerX = width / 2;
    centerY = height / 2;
}

class HourCircle {
    constructor(x, y, index) {
        // Start with random position near center for tight circle packing
        let angle = random(TWO_PI);
        let distance = random(20, 60);
        this.pos = createVector(
            x + cos(angle) * distance,
            y + sin(angle) * distance
        );
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.r = 40; // Circle radius (increased for texture visibility)
        this.maxSpeed = 2;
        this.index = index;
        this.glowPriority = index; // Will be randomized in setup

        // Fade transition properties
        this.greyOpacity = 255; // Start fully grey
        this.glowOpacity = 0;   // Start with no glow
        this.targetGreyOpacity = 255;
        this.targetGlowOpacity = 0;
        this.fadeSpeed = 255 / (0.3 * 60); // 0.3 seconds at 60fps
    }

    applyForce(force) {
        this.acc.add(force);
    }

    separate(other) {
        let dist = p5.Vector.dist(this.pos, other.pos);
        let minDist = this.r + other.r + 4; // Add padding

        if (dist < minDist && dist > 0) {
            // Calculate separation force
            let force = p5.Vector.sub(this.pos, other.pos);
            force.normalize();
            force.mult(0.5);
            this.applyForce(force);
            other.applyForce(force.copy().mult(-1));
        }
    }

    containInCircle(cx, cy, radius) {
        let d = dist(this.pos.x, this.pos.y, cx, cy);
        let maxDist = radius - this.r;

        if (d > maxDist) {
            // Push back inside
            let force = createVector(cx - this.pos.x, cy - this.pos.y);
            force.normalize();
            force.mult(0.8);
            this.applyForce(force);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);

        // Apply damping for stability
        this.vel.mult(0.9);

        // Smooth fade transitions
        if (this.greyOpacity < this.targetGreyOpacity) {
            this.greyOpacity = min(this.greyOpacity + this.fadeSpeed, this.targetGreyOpacity);
        } else if (this.greyOpacity > this.targetGreyOpacity) {
            this.greyOpacity = max(this.greyOpacity - this.fadeSpeed, this.targetGreyOpacity);
        }

        if (this.glowOpacity < this.targetGlowOpacity) {
            this.glowOpacity = min(this.glowOpacity + this.fadeSpeed, this.targetGlowOpacity);
        } else if (this.glowOpacity > this.targetGlowOpacity) {
            this.glowOpacity = max(this.glowOpacity - this.fadeSpeed, this.targetGlowOpacity);
        }
    }

    setGlowState(shouldGlow) {
        if (shouldGlow) {
            this.targetGreyOpacity = 0;
            this.targetGlowOpacity = 255;
        } else {
            this.targetGreyOpacity = 255;
            this.targetGlowOpacity = 0;
        }
    }

    display(isHighlighted) {
        // Draw grey texture with current opacity
        if (this.greyOpacity > 0) {
            push();
            imageMode(CENTER);
            tint(255, this.greyOpacity);
            image(hoursGreyTexture, this.pos.x, this.pos.y, this.r * 2, this.r * 2);
            pop();
        }

        // Draw glow texture with current opacity
        if (this.glowOpacity > 0) {
            push();
            imageMode(CENTER);
            tint(255, this.glowOpacity);
            image(hoursGlowTexture, this.pos.x, this.pos.y, this.r * 2, this.r * 2);
            pop();
        }
    }
}

class Frond {
    constructor(index, total) {
        this.baseAngle = (TWO_PI / total) * index;
        this.length = random(150, 250); // Longer fronds extending outward
        this.noiseOffset = random(1000); // Unique noise offset for each frond
    }

    display(centerX, centerY, clusterRadius, time) {
        // Calculate oscillation using noise and sin wave
        let noiseVal = noise(this.noiseOffset + time * 0.5);
        let oscillation = sin(time * 2 + this.baseAngle) * 0.1;
        let totalOscillation = (noiseVal - 0.5) * 0.2 + oscillation;

        // Current angle with oscillation (gentle wiggle)
        let currentAngle = this.baseAngle + totalOscillation;

        // Starting point at edge of hourCore cluster
        let startX = centerX + cos(this.baseAngle) * clusterRadius;
        let startY = centerY + sin(this.baseAngle) * clusterRadius;

        // End point far outward
        let endX = centerX + cos(currentAngle) * (clusterRadius + this.length);
        let endY = centerY + sin(currentAngle) * (clusterRadius + this.length);

        // Control points for smooth curve
        let controlDist = this.length * 0.4;
        let cp1X = centerX + cos(this.baseAngle) * (clusterRadius + controlDist);
        let cp1Y = centerY + sin(this.baseAngle) * (clusterRadius + controlDist);

        let cp2X = centerX + cos(currentAngle) * (clusterRadius + this.length * 0.7);
        let cp2Y = centerY + sin(currentAngle) * (clusterRadius + this.length * 0.7);

        // Draw the frond as a thin bezier curve
        noFill();
        stroke(200, 200, 180, 80); // Subtle light color
        strokeWeight(0.5); // Very thin

        bezier(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY);

        // Store end position for second circles
        this.tipX = endX;
        this.tipY = endY;
    }
}

class SecondCircle {
    constructor(index) {
        this.index = index;
        this.r = 8; // Small circle size

        // Fade transition properties
        this.greyOpacity = 255;
        this.glowOpacity = 0;
        this.targetGreyOpacity = 255;
        this.targetGlowOpacity = 0;
        this.fadeSpeed = 255 / (0.3 * 60); // 0.3 seconds at 60fps
    }

    update() {
        // Smooth fade transitions
        if (this.greyOpacity < this.targetGreyOpacity) {
            this.greyOpacity = min(this.greyOpacity + this.fadeSpeed, this.targetGreyOpacity);
        } else if (this.greyOpacity > this.targetGreyOpacity) {
            this.greyOpacity = max(this.greyOpacity - this.fadeSpeed, this.targetGreyOpacity);
        }

        if (this.glowOpacity < this.targetGlowOpacity) {
            this.glowOpacity = min(this.glowOpacity + this.fadeSpeed, this.targetGlowOpacity);
        } else if (this.glowOpacity > this.targetGlowOpacity) {
            this.glowOpacity = max(this.glowOpacity - this.fadeSpeed, this.targetGlowOpacity);
        }
    }

    setGlowState(shouldGlow) {
        if (shouldGlow) {
            this.targetGreyOpacity = 0;
            this.targetGlowOpacity = 255;
        } else {
            this.targetGreyOpacity = 255;
            this.targetGlowOpacity = 0;
        }
    }

    display(isHighlighted) {
        // Get position from corresponding frond tip (every 2nd frond)
        let frondIndex = this.index * 2; // 60 seconds, 120 fronds
        if (frondIndex >= fronds.length) return;

        let frond = fronds[frondIndex];
        if (!frond.tipX || !frond.tipY) return;

        // Set glow state
        this.setGlowState(isHighlighted);
        this.update();

        // Draw grey texture with current opacity
        if (this.greyOpacity > 0) {
            push();
            imageMode(CENTER);
            tint(255, this.greyOpacity);
            image(secondsGreyTexture, frond.tipX, frond.tipY, this.r * 2, this.r * 2);
            pop();
        }

        // Draw glow texture with current opacity (if we had secondsGlow texture)
        // For now, just use a bright circle
        if (this.glowOpacity > 0 && isHighlighted) {
            push();
            noStroke();
            fill(255, 255, 100, this.glowOpacity);
            ellipse(frond.tipX, frond.tipY, this.r * 2);
            pop();
        }
    }
}


class MinuteCircle {
    constructor(x, y, index) {
        // Start in radial distribution (150-250px from center)
        let angle = (TWO_PI / 60) * index + random(-0.05, 0.05);
        let distance = random(150, 250);
        this.pos = createVector(
            x + cos(angle) * distance,
            y + sin(angle) * distance
        );
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.r = random(10, 12); // Circle radius 10-12px
        this.maxSpeed = 1.5;
        this.index = index;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    separate(other) {
        let dist = p5.Vector.dist(this.pos, other.pos);
        let minDist = this.r + other.r + 3; // Add padding

        if (dist < minDist && dist > 0) {
            // Calculate separation force
            let force = p5.Vector.sub(this.pos, other.pos);
            force.normalize();
            force.mult(0.3);
            this.applyForce(force);
            other.applyForce(force.copy().mult(-1));
        }
    }

    containInRing(cx, cy, minRadius, maxRadius) {
        let d = dist(this.pos.x, this.pos.y, cx, cy);

        // Push back if too close to center
        if (d < minRadius + this.r) {
            let force = createVector(this.pos.x - cx, this.pos.y - cy);
            force.normalize();
            force.mult(0.5);
            this.applyForce(force);
        }

        // Push back if too far from center
        if (d > maxRadius - this.r) {
            let force = createVector(cx - this.pos.x, cy - this.pos.y);
            force.normalize();
            force.mult(0.5);
            this.applyForce(force);
        }
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);

        // Apply damping for stability
        this.vel.mult(0.92);
    }

    display(isHighlighted) {
        noStroke();

        if (isHighlighted) {
            // Bright blue #3F8FFF
            fill(63, 143, 255);
        } else {
            // Faint blue #A0C8FF at 20% opacity
            fill(160, 200, 255, 51); // 20% of 255 = 51
        }

        ellipse(this.pos.x, this.pos.y, this.r * 2);
    }
}
