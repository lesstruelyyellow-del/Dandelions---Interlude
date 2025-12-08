let hourCircles = [];
let minuteCircles = [];
let centerX, centerY;
let containerRadius = 150; // Compact cluster radius
let time = 0; // Animation time

function setup() {
    createCanvas(windowWidth, windowHeight);
    centerX = width / 2;
    centerY = height / 2;

    // Initialize 12 hour circles with circle-packing
    for (let i = 0; i < 12; i++) {
        hourCircles.push(new HourCircle(centerX, centerY, i));
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
}

function draw() {
    background(30); // Dark background

    centerX = width / 2;
    centerY = height / 2;
    time += 0.01; // Increment animation time

    // Get current time
    let h = hour();
    let m = minute();
    let highlightHourCount = h % 12; // Number of hour circles to highlight

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

    // Update and display minute circles (draw first, behind hour circles)
    for (let i = 0; i < minuteCircles.length; i++) {
        minuteCircles[i].containInRing(centerX, centerY, 150, 250);
        minuteCircles[i].update();

        // Highlight the current minute
        let isHighlighted = i === m;
        minuteCircles[i].display(isHighlighted);
    }

    // Update and display hour circles
    for (let i = 0; i < hourCircles.length; i++) {
        hourCircles[i].containInCircle(centerX, centerY, containerRadius);
        hourCircles[i].update();

        // Determine if this circle should be highlighted
        let isHighlighted = i < highlightHourCount;

        // Draw fronds first (behind the circle)
        hourCircles[i].displayFronds(isHighlighted, time);

        // Draw circle on top
        hourCircles[i].display(isHighlighted);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    centerX = width / 2;
    centerY = height / 2;
}

class HourCircle {
    constructor(x, y, index) {
        // Start with random position near center
        let angle = random(TWO_PI);
        let distance = random(20, 60);
        this.pos = createVector(
            x + cos(angle) * distance,
            y + sin(angle) * distance
        );
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.r = 20; // Circle radius
        this.maxSpeed = 2;
        this.index = index;

        // Create fronds for this circle
        this.fronds = [];
        let numFronds = 8; // Number of fronds per circle
        for (let i = 0; i < numFronds; i++) {
            this.fronds.push(new Frond(i, numFronds));
        }
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
    }

    displayFronds(isHighlighted, time) {
        for (let frond of this.fronds) {
            frond.display(this.pos.x, this.pos.y, this.r, isHighlighted, time, this.index);
        }
    }

    display(isHighlighted) {
        noStroke();

        if (isHighlighted) {
            // Bright orange #FFA200
            fill(255, 162, 0);
        } else {
            // Faint orange #FAD4A0 at 20% opacity
            fill(250, 212, 160, 51); // 20% of 255 = 51
        }

        ellipse(this.pos.x, this.pos.y, this.r * 2);
    }
}

class Frond {
    constructor(index, total) {
        this.baseAngle = (TWO_PI / total) * index;
        this.length = random(80, 150); // Random frond length
        this.noiseOffset = random(1000); // Unique noise offset for each frond
        this.segments = 5; // Number of curve segments
    }

    display(x, y, circleRadius, isHighlighted, time, circleIndex) {
        // Calculate oscillation using noise and sin wave
        let noiseVal = noise(this.noiseOffset + time * 0.5, circleIndex * 0.1);
        let oscillation = sin(time * 2 + this.baseAngle + circleIndex) * 0.15;
        let totalOscillation = (noiseVal - 0.5) * 0.3 + oscillation;

        // Current angle with oscillation
        let currentAngle = this.baseAngle + totalOscillation;

        // Starting point at edge of circle
        let startX = x + cos(this.baseAngle) * circleRadius;
        let startY = y + sin(this.baseAngle) * circleRadius;

        // End point
        let endX = x + cos(currentAngle) * (circleRadius + this.length);
        let endY = y + sin(currentAngle) * (circleRadius + this.length);

        // Control points for smooth curve
        let controlDist = this.length * 0.4;
        let cp1X = x + cos(this.baseAngle) * (circleRadius + controlDist);
        let cp1Y = y + sin(this.baseAngle) * (circleRadius + controlDist);

        let cp2X = x + cos(currentAngle) * (circleRadius + this.length * 0.7);
        let cp2Y = y + sin(currentAngle) * (circleRadius + this.length * 0.7);

        // Draw the frond as a bezier curve
        noFill();
        if (isHighlighted) {
            stroke(255, 162, 0, 100); // Bright orange with transparency
        } else {
            stroke(250, 212, 160, 30); // Faint orange
        }
        strokeWeight(1);

        bezier(startX, startY, cp1X, cp1Y, cp2X, cp2Y, endX, endY);

        // Add a small seed at the end
        noStroke();
        if (isHighlighted) {
            fill(255, 162, 0, 150);
        } else {
            fill(250, 212, 160, 60);
        }
        ellipse(endX, endY, 3, 3);
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
