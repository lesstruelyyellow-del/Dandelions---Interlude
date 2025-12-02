let circles = [];
let lastSecond = -1;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();
}

function draw() {
    background(230, 20, 15); // Dark blue-ish background

    let h = hour();
    let m = minute();
    let s = second();

    // Adjust for 12-hour format if desired, or keep 24. 
    // Let's use 12-hour format for visual clarity as per plan, 
    // but maybe 24 is cooler for "space". Let's stick to 12 for now.
    let displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;

    // Manage Hour Circles
    let hourCircles = circles.filter(c => c.type === 'hour');
    if (hourCircles.length < displayHour) {
        circles.push(new PackCircle(width / 2, height / 2, 'hour'));
    } else if (hourCircles.length > displayHour) {
        // Remove excess
        let diff = hourCircles.length - displayHour;
        for (let i = 0; i < diff; i++) {
            // Find an hour circle to remove
            let idx = circles.findIndex(c => c.type === 'hour');
            if (idx !== -1) circles.splice(idx, 1);
        }
    }

    // Manage Minute Circles
    let minuteCircles = circles.filter(c => c.type === 'minute');
    if (minuteCircles.length < m) {
        circles.push(new PackCircle(width / 2, height / 2, 'minute'));
    } else if (minuteCircles.length > m) {
        let diff = minuteCircles.length - m;
        for (let i = 0; i < diff; i++) {
            let idx = circles.findIndex(c => c.type === 'minute');
            if (idx !== -1) circles.splice(idx, 1);
        }
    }

    // Pulse animation every second
    if (s !== lastSecond) {
        circles.forEach(c => c.pulse());
        lastSecond = s;
    }

    // Physics and Draw
    for (let c of circles) {
        let gravity = createVector(width / 2, height / 2);
        gravity.sub(c.pos);
        gravity.setMag(0.5); // Attraction to center
        c.applyForce(gravity);

        c.update();
        c.checkEdges();
        c.display();
    }

    // Collision / Separation
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            let c1 = circles[i];
            let c2 = circles[j];
            let dist = p5.Vector.dist(c1.pos, c2.pos);
            let minDist = c1.r + c2.r + 2; // +2 padding

            if (dist < minDist) {
                let force = p5.Vector.sub(c1.pos, c2.pos);
                force.setMag(1); // Separation strength
                c1.applyForce(force);
                c2.applyForce(force.mult(-1));
            }
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

class PackCircle {
    constructor(x, y, type) {
        this.pos = createVector(random(width), random(height)); // Start random to avoid stacking
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.type = type;

        if (this.type === 'hour') {
            this.targetR = 40;
            this.hue = 200; // Blue-ish
        } else {
            this.targetR = 15;
            this.hue = 320; // Pink-ish
        }
        this.r = 0; // Start at 0 for pop effect
        this.maxSpeed = 4;
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);
        this.acc.mult(0);

        // Grow animation
        if (this.r < this.targetR) {
            this.r += 2;
        }
        // Return to normal size if pulsed
        if (this.r > this.targetR) {
            this.r -= 1;
        }
    }

    pulse() {
        this.r += 5;
    }

    checkEdges() {
        // Keep within bounds loosely
        if (this.pos.x < this.r) this.vel.x *= -1;
        if (this.pos.x > width - this.r) this.vel.x *= -1;
        if (this.pos.y < this.r) this.vel.y *= -1;
        if (this.pos.y > height - this.r) this.vel.y *= -1;
    }

    display() {
        fill(this.hue, 80, 90);
        ellipse(this.pos.x, this.pos.y, this.r * 2);
    }
}
