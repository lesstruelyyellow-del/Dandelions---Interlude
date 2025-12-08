let hourCircles = [];
let minuteCircles = [];
let secondCircles = [];
let fronds = [];
let centerX, centerY;
let containerRadius = 200; // Compact cluster radius (increased for larger circles)
let time = 0; // Animation time

// Camera and motion detection
let video;
let prevPixels = [];
let motionIntensity = 0;
let motionThreshold = 5; // Sensitivity threshold for motion detection
let scatterForce = 0; // Current scatter force being applied
let isScattered = false; // Track if circles are currently scattered

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

    // Initialize webcam for motion detection
    video = createCapture(VIDEO);
    video.size(160, 120); // Small size for performance
    video.hide(); // Keep video hidden, only use for motion detection
}

function draw() {
    background(30, 30); // Dark background
    stroke(0)
    centerX = width / 2;
    centerY = height / 2;
    time += 0.01; // Increment animation time

    // Motion detection
    if (video && video.loadedmetadata) {
        video.loadPixels();

        if (prevPixels.length > 0) {
            let totalDiff = 0;
            let pixelCount = 0;

            // Compare current frame with previous frame
            // Sample every 4th pixel for performance
            for (let i = 0; i < video.pixels.length; i += 16) {
                let diff = abs(video.pixels[i] - prevPixels[i]);
                totalDiff += diff;
                pixelCount++;
            }

            // Calculate average motion intensity
            motionIntensity = totalDiff / pixelCount;

            // State-based scatter behavior
            if (motionIntensity > motionThreshold) {
                // Motion detected - scatter if not already scattered
                if (!isScattered) {
                    isScattered = true;
                    scatterForce = 15; // Apply strong initial scatter
                }
                // Keep circles scattered while motion continues
                scatterForce = 15;
            } else {
                // No motion - allow circles to return
                if (isScattered) {
                    isScattered = false;
                }
                scatterForce *= 0.85; // Gradually reduce scatter force to let circles return
            }
        }

        // Store current frame for next comparison
        prevPixels = [...video.pixels];
    }

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
        frond.display(centerX, centerY, containerRadius, time, scatterForce);
    }

    // Draw second circles at frond tips
    for (let i = 0; i < secondCircles.length; i++) {
        let isHighlighted = i === s;
        secondCircles[i].display(isHighlighted);
    }

    // Update and display minute circles
    for (let i = 0; i < minuteCircles.length; i++) {
        // Only apply containment when not scattered
        if (!isScattered && scatterForce < 1) {
            minuteCircles[i].containInRing(centerX, centerY, 150, 250);
        }

        // Apply scatter force if motion detected
        if (scatterForce > 0) {
            minuteCircles[i].applyScatterForce(centerX, centerY, scatterForce);
        }

        minuteCircles[i].update();

        // Highlight the current minute
        let isHighlighted = i === m;
        minuteCircles[i].display(isHighlighted);
    }

    // Update and display hour circles (on top)
    for (let i = 0; i < hourCircles.length; i++) {
        // Only apply containment when not scattered
        if (!isScattered && scatterForce < 1) {
            hourCircles[i].containInCircle(centerX, centerY, containerRadius);
        }

        // Apply scatter force if motion detected
        if (scatterForce > 0) {
            hourCircles[i].applyScatterForce(centerX, centerY, scatterForce);
        }

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

// Helper function to draw a 3D gradient circle
function draw3DGradientCircle(x, y, diameter, baseColor, isGlowing = false) {
    push();
    noStroke();

    // Extract RGB values from baseColor
    let r = red(baseColor);
    let g = green(baseColor);
    let b = blue(baseColor);
    let a = alpha(baseColor);

    // Create multiple layers for 3D effect
    let steps = 30;

    for (let i = steps; i > 0; i--) {
        let t = i / steps;
        let currentDiameter = diameter * t;

        // Calculate position offset for highlight (upper-left)
        let highlightOffsetX = -diameter * 0.15 * (1 - t);
        let highlightOffsetY = -diameter * 0.15 * (1 - t);

        // Interpolate between highlight (bright) and shadow (dark)
        let brightness;
        if (t > 0.7) {
            // Outer edge - darker for depth
            brightness = map(t, 0.7, 1.0, 0.8, 0.3);
        } else if (t > 0.3) {
            // Middle - base color
            brightness = map(t, 0.3, 0.7, 1.2, 0.8);
        } else {
            // Center highlight
            brightness = map(t, 0, 0.3, isGlowing ? 2.5 : 1.8, 1.2);
        }

        // Apply brightness to color
        let finalR = constrain(r * brightness, 0, 255);
        let finalG = constrain(g * brightness, 0, 255);
        let finalB = constrain(b * brightness, 0, 255);

        // Add glow effect if glowing
        if (isGlowing && t < 0.5) {
            finalR = constrain(finalR + 50, 0, 255);
            finalG = constrain(finalG + 50, 0, 255);
            finalB = constrain(finalB + 30, 0, 255);
        }

        fill(finalR, finalG, finalB, a * t);
        ellipse(x + highlightOffsetX, y + highlightOffsetY, currentDiameter);
    }

    pop();
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

    applyScatterForce(cx, cy, intensity) {
        // Apply outward radial force from center
        let force = createVector(this.pos.x - cx, this.pos.y - cy);
        force.normalize();
        force.mult(intensity * random(0.8, 1.2)); // Add randomness for natural scatter
        this.applyForce(force);
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
        // Draw grey state with 3D gradient (darker orange)
        if (this.greyOpacity > 0) {
            let greyColor = color(180, 100, 60, this.greyOpacity); // Muted orange
            draw3DGradientCircle(this.pos.x, this.pos.y, this.r * 2, greyColor, false);
        }

        // Draw glow state with 3D gradient (bright orange)
        if (this.glowOpacity > 0) {
            let glowColor = color(255, 150, 50, this.glowOpacity); // Bright orange
            draw3DGradientCircle(this.pos.x, this.pos.y, this.r * 2, glowColor, true);
        }
    }
}

class Frond {
    constructor(index, total) {
        this.baseAngle = (TWO_PI / total) * index;
        this.length = random(150, 250); // Longer fronds extending outward
        this.noiseOffset = random(1000); // Unique noise offset for each frond
    }

    display(centerX, centerY, clusterRadius, time, scatterForce = 0) {
        // Calculate oscillation using noise and sin wave
        let noiseVal = noise(this.noiseOffset + time * 0.5);
        let oscillation = sin(time * 2 + this.baseAngle) * 0.1;
        let totalOscillation = (noiseVal - 0.5) * 0.2 + oscillation;

        // Current angle with oscillation (gentle wiggle)
        let currentAngle = this.baseAngle + totalOscillation;

        // Add scatter extension to length
        let scatterExtension = scatterForce * 3; // Multiply for more visible effect
        let effectiveLength = this.length + scatterExtension;

        // Starting point at edge of hourCore cluster
        let startX = centerX + cos(this.baseAngle) * clusterRadius;
        let startY = centerY + sin(this.baseAngle) * clusterRadius;

        // End point far outward (extended by scatter)
        let endX = centerX + cos(currentAngle) * (clusterRadius + effectiveLength);
        let endY = centerY + sin(currentAngle) * (clusterRadius + effectiveLength);

        // Control points for smooth curve
        let controlDist = effectiveLength * 0.4;
        let cp1X = centerX + cos(this.baseAngle) * (clusterRadius + controlDist);
        let cp1Y = centerY + sin(this.baseAngle) * (clusterRadius + controlDist);

        let cp2X = centerX + cos(currentAngle) * (clusterRadius + effectiveLength * 0.7);
        let cp2Y = centerY + sin(currentAngle) * (clusterRadius + effectiveLength * 0.7);

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

        // Draw grey state with 3D gradient
        if (this.greyOpacity > 0) {
            let greyColor = color(200, 200, 180, this.greyOpacity);
            draw3DGradientCircle(frond.tipX, frond.tipY, this.r * 2, greyColor, false);
        }

        // Draw glow state with 3D gradient (bright yellow)
        if (this.glowOpacity > 0 && isHighlighted) {
            let glowColor = color(255, 255, 100, this.glowOpacity);
            draw3DGradientCircle(frond.tipX, frond.tipY, this.r * 2, glowColor, true);
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

    applyScatterForce(cx, cy, intensity) {
        // Apply outward radial force from center
        let force = createVector(this.pos.x - cx, this.pos.y - cy);
        force.normalize();
        force.mult(intensity * random(0.7, 1.1)); // Add randomness for natural scatter
        this.applyForce(force);
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
        if (isHighlighted) {
            // Bright blue #3F8FFF with 3D gradient
            let highlightColor = color(63, 143, 255, 255);
            draw3DGradientCircle(this.pos.x, this.pos.y, this.r * 2, highlightColor, true);
        } else {
            // Faint blue #A0C8FF at 20% opacity with 3D gradient
            let dimColor = color(160, 200, 255, 51); // 20% of 255 = 51
            draw3DGradientCircle(this.pos.x, this.pos.y, this.r * 2, dimColor, false);
        }
    }
}
