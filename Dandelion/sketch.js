let angMin = 0;
let angSec = 0;

// Video & Motion variables
let video;
let prevFrame;
let threshold = 50;
let motionLevel = 0;
let clockAlpha = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();

    // Setup Webcam
    video = createCapture(VIDEO);
    video.size(320, 240);
    video.hide();
    prevFrame = createImage(320, 240);
}

function draw() {
    background(0, 0, 0, 20); // Black background with trails

    // --- MOTION DETECTION ---
    video.loadPixels();
    prevFrame.loadPixels();

    let motionCount = 0;
    if (video.pixels.length > 0) {
        for (let x = 0; x < video.width; x += 4) {
            for (let y = 0; y < video.height; y += 4) {
                let loc = (x + y * video.width) * 4;
                let diff = dist(video.pixels[loc], video.pixels[loc + 1], video.pixels[loc + 2],
                    prevFrame.pixels[loc], prevFrame.pixels[loc + 1], prevFrame.pixels[loc + 2]);
                if (diff > threshold) motionCount++;
            }
        }
        prevFrame.copy(video, 0, 0, video.width, video.height, 0, 0, video.width, video.height);
    }

    motionLevel = lerp(motionLevel, motionCount, 0.1);
    let isMouseMoving = dist(mouseX, mouseY, pmouseX, pmouseY) > 0;
    let targetAlpha = (motionLevel > 50 || isMouseMoving) ? 255 : 0;
    clockAlpha = lerp(clockAlpha, targetAlpha, 0.05);

    if (clockAlpha < 1) return;

    // --- DRAW CLOCK ---
    push();
    drawingContext.globalAlpha = clockAlpha / 255;
    translate(width / 2, height / 2);

    // Gentle rotation for the whole flower
    rotate(frameCount * 0.001);

    let h = hour();
    let m = minute();
    let s = second();
    let ms = millis();

    // 12-hour format
    let displayHour = h % 12;
    if (displayHour === 0) displayHour = 12;

    // --- 1. HOUR POLYGON ---
    let polyRadius = 60;
    let vertices = [];

    noFill();
    stroke(0, 0, 100, 80); // White
    strokeWeight(2);

    if (displayHour < 3) {
        // Special case for 1 and 2: Just draw a circle or line
        // But to keep "edges" logic consistent, let's treat 1 as a point (or circle) and 2 as a line
        // Actually, let's just use a circle for < 3 for simplicity in "edges"
        // Or force min 3 sides? 
        // User said "polygon center representing hours". 
        // Let's do: 1=Circle, 2=Line, 3+=Polygon.

        if (displayHour === 1) {
            ellipse(0, 0, polyRadius * 2);
            // Fake vertices for distribution (just points on circle)
            for (let i = 0; i < 60; i++) {
                let a = map(i, 0, 60, 0, TWO_PI);
                vertices.push(createVector(polyRadius * cos(a), polyRadius * sin(a)));
            }
        } else { // 2
            line(0, -polyRadius, 0, polyRadius);
            vertices.push(createVector(0, -polyRadius));
            vertices.push(createVector(0, polyRadius));
            // Close the loop for logic? No, 2 sides usually means flat. 
            // Let's just treat it as a flattened polygon (digon)
        }
    } else {
        beginShape();
        for (let i = 0; i < displayHour; i++) {
            let angle = map(i, 0, displayHour, 0, TWO_PI) - HALF_PI;
            let x = polyRadius * cos(angle);
            let y = polyRadius * sin(angle);
            vertex(x, y);
            vertices.push(createVector(x, y));
        }
        endShape(CLOSE);
    }

    // --- 2. MINUTES (From Edges) ---
    let rMin = 200;
    let rSec = 350;

    angMin += 0.002;
    angSec += 0.005;

    strokeWeight(1);

    for (let i = 0; i < 60; i++) {
        // Calculate Start Point on Polygon Perimeter
        let startP;

        if (displayHour === 1) {
            // Circle distribution
            let angle = map(i, 0, 60, 0, TWO_PI) - HALF_PI;
            startP = createVector(polyRadius * cos(angle), polyRadius * sin(angle));
        } else if (displayHour === 2) {
            // Line distribution (up and down)
            let t = map(i, 0, 60, 0, 2); // 0 to 1 (up), 1 to 2 (down)
            if (t < 1) startP = p5.Vector.lerp(vertices[0], vertices[1], t);
            else startP = p5.Vector.lerp(vertices[1], vertices[0], t - 1);
        } else {
            // Polygon distribution
            // Map i (0-60) to total perimeter
            // Simple approximation: Map i to sides
            let totalSides = displayHour;
            let sideIndex = floor(map(i, 0, 60, 0, totalSides));
            let t = map(i, 0, 60, 0, totalSides) - sideIndex;

            let v1 = vertices[sideIndex % totalSides];
            let v2 = vertices[(sideIndex + 1) % totalSides];
            startP = p5.Vector.lerp(v1, v2, t);
        }

        // End Points (Spiraling out)
        let thetaBase = map(i, 0, 60, 0, TWO_PI) - HALF_PI;
        let thetaM = thetaBase + angMin;
        let thetaS = thetaBase + angSec;

        let xm = rMin * cos(thetaM);
        let ym = rMin * sin(thetaM);
        let xs = rSec * cos(thetaS);
        let ys = rSec * sin(thetaS);

        let isMinuteActive = i < m;
        let isSecondActive = i < s;

        // --- DRAW FIBERS ---
        // White/Grey aesthetic

        // 1. Polygon -> Minute
        if (isMinuteActive) {
            stroke(0, 0, 100, 60); // Bright White
            // Bezier from startP to Minute
            // Control points to make it flow out
            let cp1 = p5.Vector.mult(startP, 2); // Push out from center
            bezier(startP.x, startP.y, cp1.x, cp1.y, xm * 0.5, ym * 0.5, xm, ym);
        } else {
            stroke(0, 0, 100, 5); // Faint ghost
            let cp1 = p5.Vector.mult(startP, 2);
            bezier(startP.x, startP.y, cp1.x, cp1.y, xm * 0.5, ym * 0.5, xm, ym);
        }

        // 2. Minute -> Second
        if (isSecondActive) {
            stroke(0, 0, 100, 80); // Brighter White
            bezier(xm, ym, xm * 1.2, ym * 1.2, xs * 0.8, ys * 0.8, xs, ys);

            // Fluff tip
            fill(0, 0, 100);
            ellipse(xs, ys, 3);
            noFill();
        } else if (isMinuteActive) {
            stroke(0, 0, 100, 10);
            bezier(xm, ym, xm * 1.2, ym * 1.2, xs * 0.8, ys * 0.8, xs, ys);
        }

        // Minute Node (Joint)
        if (isMinuteActive) {
            fill(0, 0, 100);
            ellipse(xm, ym, 4);
            noFill();
        }
    }

    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
