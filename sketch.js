/*
 * 👋 Hello! This is an ml5.js example made and shared with ❤️.
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 * This example demonstrates segmenting a person by body parts with ml5.bodySegmentation
 * and visualizing it with Three.js cubes.
 */



// Three.js variables
let scene, camera, renderer, composer;
let nucleus;
let stem;
let dandelionPivot; // Group for swaying the whole structure
let fronds = [];
let minuteGradientTexture;
let backgroundDandelions = []; // Mini dandelions for field effect

// Audio variables
let mic;
let isDispersed = false;
let dispersionStartTime = 0;
const DISPERSION_DURATION = 0; // Immediate return
const MIN_DISPERSION_DISTANCE = 20;
const MAX_DISPERSION_DISTANCE = 100; // Increased max distance
const MIC_THRESHOLD = 0.01; // Reverted to 0.01 for sensitivity
let currentDispersionFactor = 0; // For smooth transition 0 -> 1
let currentDispersionDistance = 20; // Actual distance scaler
let dispersionRotationAngle = 0; // Rotate around center
let currentRotationSpeed = 0;

// Background variables
let currentHourMode = null; // 'AM' or 'PM'
let weatherCode = 0;
let isDay = 1; // 1 for day, 0 for night

// FPS Counter
let lastTime = 0;
let frameCount = 0;
let fpsElement;

function setup() {
    noCanvas();

    // Initialize Audio
    mic = new p5.AudioIn();
    mic.start();

    // Initialize Three.js
    initThree();
    initFronds();

    // Get Weather Data
    getWeatherData();

    // Get FPS element
    fpsElement = document.getElementById('fpsCounter');
    lastTime = performance.now();
}

function mousePressed() {
    userStartAudio();
}

function initThree() {
    // Create scene
    scene = new THREE.Scene();

    // Solid Dark Grey Background
    scene.background = new THREE.Color(0x1a1a1a);

    // Create Pivot Group for Sway
    dandelionPivot = new THREE.Group();
    dandelionPivot.position.y = -72.5; // Anchor at bottom of stem
    scene.add(dandelionPivot);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.x = 0;
    camera.position.y = 25; // Lowered from 35 for better angle when zoomed in
    camera.position.z = 30;
    updateCameraPosition();
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); // High DPI
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(10, 10, 10);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 4096;
    directionalLight1.shadow.mapSize.height = 4096;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 500;
    directionalLight1.shadow.camera.left = -100;
    directionalLight1.shadow.camera.right = 100;
    directionalLight1.shadow.camera.top = 100;
    directionalLight1.shadow.camera.bottom = -100;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x4466ff, 0.5);
    directionalLight2.position.set(-10, -10, -5);
    directionalLight2.castShadow = true;
    directionalLight2.shadow.mapSize.width = 2048;
    directionalLight2.shadow.mapSize.height = 2048;
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 20, 20);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    scene.add(pointLight);

    // Add Rim Light to highlight edges and curvature
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, 0, -20); // Backlight
    scene.add(rimLight);

    // Material for Frond Tubes
    const frondMaterial = new THREE.MeshStandardMaterial({
        color: 0xF6F2E9,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4
    });

    // Create Nucleus
    // Create Nucleus
    // Create Nucleus
    const geometry = new THREE.SphereGeometry(2.5, 256, 256);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.0, // No emission
        roughness: 0.6, // Matte finish (was 0.2)
        metalness: 0.0, // No metallic reflection (was 0.2)
        transmission: 0.0,
        thickness: 2.0,
        transparent: false,
        opacity: 1.0,
        clearcoat: 0.0, // Removed clearcoat (was 1.0)
        clearcoatRoughness: 1.0, // Max roughness if clearcoat exists
    });

    nucleus = new THREE.Mesh(geometry, material);
    nucleus.position.y = 72.5; // Offset relative to pivot
    dandelionPivot.add(nucleus);

    // Create Stem (Organic)
    const stemHeight = 70;
    const stemRadius = 0.22; // Reduced slightly from 0.3

    // Create curve points for organic stem with subtle variations
    const stemPoints = [];
    const numPoints = 20;
    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const y = -2.5 - (t * stemHeight); // Start below nucleus (radius 2.5), go down

        // Add subtle random curves (sine waves for organic feel)
        const xOffset = Math.sin(t * Math.PI * 2 + 0.5) * 0.3 + Math.sin(t * Math.PI * 4) * 0.15;
        const zOffset = Math.cos(t * Math.PI * 2 + 1.2) * 0.3 + Math.cos(t * Math.PI * 3) * 0.15;

        stemPoints.push(new THREE.Vector3(xOffset, y, zOffset));
    }

    const stemCurve = new THREE.CatmullRomCurve3(stemPoints);
    const stemGeometry = new THREE.TubeGeometry(stemCurve, 64, stemRadius, 16, false);
    const stemMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xF8F4EC,
        emissive: 0xEFEDE6,
        emissiveIntensity: 0.05,
        roughness: 0.6,
        metalness: 0.1,
        transparent: false,
        opacity: 1.0,
    });
    stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 72.5; // Offset relative to pivot
    dandelionPivot.add(stem);

    // Create Gradient Texture for Minutes
    minuteGradientTexture = createGradientTexture();

    // Post-processing
    const renderScene = new THREE.RenderPass(scene, camera);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.3, // Reduced Strength (was 0.6)
        0.4, // Radius
        1.05 // Threshold (Increased to strictly exclude nucleus)
    );

    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('orientationchange', onWindowResize, false);
}

// Arrays to store categorized fronds for clock updates
let hourFronds = [];
let minuteFronds = [];


function initFronds() {
    const nucleusRadius = 0.2;
    const totalFronds = 72;

    // Define layer properties (only length varies now, startDist is uniform)
    // We create a pool of length definitions
    let frondProps = [];

    // Inner (Short) - 12 -> Large circle -> HOURS
    for (let i = 0; i < 12; i++) frondProps.push({ lengthMin: 7.2, lengthMax: 10.2, tipRadius: 0.9, type: 'hour' });
    // Middle (Medium) - 60 -> Medium circle -> MINUTES
    for (let i = 0; i < 60; i++) frondProps.push({ lengthMin: 11.7, lengthMax: 16.2, tipRadius: 0.45, type: 'minute' });

    // Shuffle the properties to distribute lengths randomly across the uniform sphere
    frondProps.sort(() => Math.random() - 0.5);

    // Base material for tips (we will clone this)
    // Base material for tips (we will clone this) - TRANSPARENCY ENABLED
    const baseTipMaterial = new THREE.MeshStandardMaterial({
        color: 0xF8F4EC,
        emissive: 0xEFEDE6,
        emissiveIntensity: 0.1, // Lower default emissive to show shading
        roughness: 0.2, // Soft gloss
        metalness: 0.2, // Subtle Metallic
        transparent: false, // DISABLED - Fully opaque circles
        opacity: 1.0, // Fully opaque
    });

    // Fibonacci Sphere Algorithm for uniform distribution
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle

    for (let i = 0; i < totalFronds; i++) {
        // 1. Calculate uniform direction on a sphere
        const y = 1 - (i / (totalFronds - 1)) * 2; // y goes from 1 to -1
        const radius = Math.sqrt(1 - y * y); // radius at y
        const theta = phi * i; // golden angle increment

        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;

        const dir = new THREE.Vector3(x, y, z).normalize();

        // 2. Start position (Edge of nucleus)
        const startPos = dir.clone().multiplyScalar(nucleusRadius);

        // 3. Length from the shuffled pool
        const props = frondProps[i];
        const length = props.lengthMin + Math.random() * (props.lengthMax - props.lengthMin);

        // Create geometry with segments for bending
        // Create geometry with segments for bending
        const segments = 40; // Reduced from 200 for performance
        const points = [];
        for (let j = 0; j <= segments; j++) {
            const t = j / segments;
            points.push(startPos.clone().add(dir.clone().multiplyScalar(length * t)));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Material
        const opacity = 0.4 + Math.random() * 0.2; // 40-60%
        const material = new THREE.LineBasicMaterial({
            color: 0xF6F2E9,
            transparent: true,
            opacity: opacity,
            linewidth: 1
        });

        const line = new THREE.Line(geometry, material);

        // Create tip sphere with CLONED material for individual control
        // Create tip sphere with CLONED material for individual control
        const tipGeometry = new THREE.SphereGeometry(props.tipRadius, 128, 128); // Increased from 64,64
        const tipMaterial = baseTipMaterial.clone();
        const tipSphere = new THREE.Mesh(tipGeometry, tipMaterial);
        const lastPoint = points[points.length - 1];
        tipSphere.position.copy(lastPoint);
        line.add(tipSphere); // Add to line instead of scene for easier parenting

        // Store animation data
        line.userData = {
            originalPoints: points.map(p => p.clone()),
            phase: Math.random() * Math.PI * 2,
            speed: 0.0005 + Math.random() * 0.001,
            swayAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize().cross(dir).normalize(), // Random sway axis
            dispersionDir: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), // Random direction for dispersion
            tipSphere: tipSphere
        };

        line.position.y = 72.5; // Offset relative to pivot
        dandelionPivot.add(line);
        fronds.push(line);

        // Categorize for clock
        if (props.type === 'hour') {
            hourFronds.push(line);
        } else if (props.type === 'minute') {
            minuteFronds.push(line);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
    updateCameraPosition();
}

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Determine AM/PM
    const newMode = hours < 12 ? 'AM' : 'PM';
    currentHourMode = newMode;

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    // Debug log every second (approx)
    if (seconds % 10 === 0 && Math.random() < 0.1) {
        console.log(`Time: ${hours}:${minutes} ${newMode}, Active Hours: ${hours}, Active Minutes: ${minutes}`);
    }

    // Update Hours - with transparency
    hourFronds.forEach((frond, index) => {
        const sphere = frond.userData.tipSphere;
        if (index < hours) {
            // Active: Red color with 50% opacity
            sphere.material.color.setHex(0xe47c7a); // Red Refined
            sphere.material.emissive.setHex(0xc06060); // Matching Emissive
            sphere.material.emissiveIntensity = 0.3; // Reduced to show shading
            sphere.material.roughness = 0.2; // Soft Gloss
            sphere.material.metalness = 0.2;
            sphere.material.opacity = 1.0; // Fully opaque
        } else {
            // Inactive: Slight Pink - fully opaque
            sphere.material.color.setHex(0xFFEBEF); // Slight Pink
            sphere.material.emissive.setHex(0xFFE4E8); // Matching Emissive
            sphere.material.emissiveIntensity = 0.2;
            sphere.material.roughness = 0.2; // Soft Gloss
            sphere.material.metalness = 0.2;
            sphere.material.opacity = 1.0; // Fully opaque
        }
    });

    // Update Minutes - with transparency
    minuteFronds.forEach((frond, index) => {
        const sphere = frond.userData.tipSphere;
        if (index < minutes) {
            // Active: Light Red with 50% opacity
            sphere.material.map = null;
            sphere.material.emissiveMap = null;
            sphere.material.color.setHex(0xd74f53); // Light Red
            sphere.material.emissive.setHex(0xb03e42); // Darker Red Emissive
            sphere.material.emissiveIntensity = 1.0;
            sphere.material.roughness = 0.2; // Soft Gloss
            sphere.material.metalness = 0.2;
            sphere.material.opacity = 1.0; // Fully opaque
        } else {
            // Inactive: Slight Pink - fully opaque
            sphere.material.map = null;
            sphere.material.emissiveMap = null;
            sphere.material.color.setHex(0xFFEBEF); // Slight Pink
            sphere.material.emissive.setHex(0xFFE4E8);
            sphere.material.emissiveIntensity = 0.2;
            sphere.material.roughness = 0.2; // Soft Gloss
            sphere.material.metalness = 0.2;
            sphere.material.opacity = 1.0; // Fully opaque
        }
    });
}

// Play a wind chime sound for time change
function playWindChimeSound(index) {
    if (!audioContext) return;

    // Resume context if suspended (browser policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Wind chime: Sine wave with long decay and slight vibrato
    oscillator.type = 'sine';

    // Pentatonic scale (higher pitch for chime)
    const scale = [783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98, 1760.00];
    const noteIndex = index % scale.length;
    const frequency = scale[noteIndex] + (Math.random() * 6 - 3);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    // Envelope: Soft attack, long decay
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05); // Soft attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0); // Long decay (2s)

    oscillator.start(now);
    oscillator.stop(now + 2.0);
}

let prevHours = -1;
let prevMinutes = -1;

function draw() {


    // Update Three.js scene
    // Animate nucleus
    if (nucleus) {
        nucleus.rotation.y += 0.002;
        nucleus.rotation.y += 0.002;
        nucleus.rotation.z += 0.001;
    }

    // Sway the entire structure
    if (dandelionPivot) {
        const time = Date.now();
        // Gentle sway: combination of slow sine waves
        // Reduced amplitudes for "very gentle" effect
        const swayZ = Math.sin(time * 0.001) * 0.015 + Math.sin(time * 0.0003) * 0.005;
        const swayX = Math.cos(time * 0.0007) * 0.005;

        dandelionPivot.rotation.z = swayZ;
        dandelionPivot.rotation.x = swayX;
    }

    animateFronds();
    updateClock();

    // Keep camera straight facing the cubes
    camera.lookAt(0, 0, 0);

    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    // Update FPS
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        if (fpsElement) {
            fpsElement.innerText = `FPS: ${frameCount}`;
        }
        frameCount = 0;
        lastTime = currentTime;
    }
}


function drawDebugInfo(vol) {
    // Create or get debug element
    let debugEl = document.getElementById('debugInfo');
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'debugInfo';
        debugEl.style.position = 'absolute';
        debugEl.style.top = '40px';
        debugEl.style.left = '10px';
        debugEl.style.color = 'lime';
        debugEl.style.fontFamily = 'monospace';
        debugEl.style.zIndex = '1000';
        debugEl.style.backgroundColor = 'rgba(0,0,0,0.5)';
        debugEl.style.padding = '5px';
        document.body.appendChild(debugEl);
    }

    debugEl.innerHTML = `
        Volume: ${vol ? vol.toFixed(4) : '0.0000'}<br>
        Threshold: ${MIC_THRESHOLD}<br>
        Dispersed: ${isDispersed}<br>
        Dist: ${currentDispersionDistance.toFixed(1)}<br>
        Rot Speed: ${currentRotationSpeed.toFixed(4)}<br>
        Angle: ${dispersionRotationAngle.toFixed(2)}
    `;
}

function animateFronds() {
    const time = Date.now();
    const allNewPoints = []; // Store calculated points for all fronds

    // Global Wind (Left-Right Oscillation) - Increased for more sway
    // Low frequency (0.0005), Low amplitude (0.1)
    const windAngle = Math.sin(time * 0.0002) * 0.05;
    const globalWind = new THREE.Vector3(Math.cos(time * 0.0002), Math.sin(time * 0.0003), 0).multiplyScalar(0.05);

    // Audio Logic
    let vol = 0;
    if (mic) {
        vol = mic.getLevel();
    }

    // Draw Debug Info
    drawDebugInfo(vol);

    // Dynamic Dispersion Logic
    if (vol > MIC_THRESHOLD) {
        // Sustain: Keep resetting the start time as long as there is sound
        isDispersed = true;
        dispersionStartTime = Date.now();
        console.log("Dispersion sustained! Volume:", vol);

        // Map Volume to Target Distance (Dynamic)
        // Map vol (0.05 to 0.5) -> Distance (20 to 80)
        // Clamp volume input to useful range
        const clampedVol = Math.min(Math.max(vol, MIC_THRESHOLD), 0.5);
        const ratio = (clampedVol - MIC_THRESHOLD) / (0.5 - MIC_THRESHOLD); // 0 to 1

        const targetDist = MIN_DISPERSION_DISTANCE + ratio * (MAX_DISPERSION_DISTANCE - MIN_DISPERSION_DISTANCE);

        // Map Volume to Rotation Speed
        // Map ratio (0 to 1) -> Speed (0.01 to 0.1 radians/frame)
        const targetSpeed = 0.01 + ratio * 0.15;
        currentRotationSpeed += (targetSpeed - currentRotationSpeed) * 0.1; // Smooth transition

        // Smoothly interpolate current distance to target
        currentDispersionDistance += (targetDist - currentDispersionDistance) * 0.1;

    } else {
        // Silence: Check timer
        if (isDispersed) {
            if (Date.now() - dispersionStartTime > DISPERSION_DURATION) {
                isDispersed = false;
                console.log("Returning to clock form...");
            }
        }
        // Decelerate rotation when silent
        currentRotationSpeed *= 0.95;
    }

    // Apply rotation
    if (isDispersed || currentRotationSpeed > 0.001) {
        dispersionRotationAngle += currentRotationSpeed;
    } else {
        // Reset angle slowly or keep it? User said "come back to their fronds".
        // If we rotate, the "original layout" is physically rotated if we apply it to the dispersion vector.
        // But the dispersion vector is an offset. If we rotate the offset, they just spiral back.
        // It should be fine.
    }

    // Smoothly interpolate dispersion factor
    const targetDispersion = isDispersed ? 1.0 : 0.0;
    // Slower return: if target is 0.0, use smaller lerp factor
    // 0.05 gives approx 2s return? Actually for "quicker" return we might want higher value.
    const lerpFactor = isDispersed ? 0.1 : 0.015; // Slower return (was 0.05)
    currentDispersionFactor += (targetDispersion - currentDispersionFactor) * lerpFactor;

    // Pass 1: Calculate proposed positions
    fronds.forEach((mesh, index) => {
        const originalPoints = mesh.userData.originalPoints;
        const phase = mesh.userData.phase;
        const speed = mesh.userData.speed * 0.5; // Slow down for fluid feel
        const swayAxis = mesh.userData.swayAxis;

        // Create orthogonal axes for circular sway
        const axis1 = swayAxis;
        const axis2 = new THREE.Vector3().crossVectors(axis1, mesh.userData.originalPoints[mesh.userData.originalPoints.length - 1].clone().normalize()).normalize();

        const newPoints = [];
        for (let i = 0; i < originalPoints.length; i++) {
            // Sway increases with distance from start (index i)
            // t goes from 0 to 1 along the frond
            const t = i / (originalPoints.length - 1);

            // Fluid Wave Motion
            // Sum of sines for organic complexity
            const wave1 = Math.sin(time * speed + phase + t * 4) * t * 0.8;
            const wave2 = Math.cos(time * speed * 0.7 + phase * 2 + t * 3) * t * 0.5;
            const wave3 = Math.sin(time * speed * 1.3 + phase * 0.5 + t * 2) * t * 0.4;

            const swayAmount1 = wave1 + wave3;
            const swayAmount2 = wave2;

            const original = originalPoints[i];

            // Combine individual sway with global wind
            const combinedSway = new THREE.Vector3();
            combinedSway.addScaledVector(axis1, swayAmount1);
            combinedSway.addScaledVector(axis2, swayAmount2);
            combinedSway.add(globalWind.clone().multiplyScalar(t * 2)); // Global drift affects tips more

            // Add Dispersion
            // "Circles disperse" - The user calls them circles, but they are fronds with tips.
            // We want the tips (circles) to detach and fly away, while the fronds (tubes) stay attached.

            // Calculate dispersion vector for the tip
            // Use dynamic currentDispersionDistance
            // Apply Rotation: Rotate dispersionDir around Y axis
            let rotatedDir = mesh.userData.dispersionDir.clone();
            if (dispersionRotationAngle !== 0) {
                rotatedDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), dispersionRotationAngle);
            }

            const fullDispersion = rotatedDir.multiplyScalar(currentDispersionFactor * currentDispersionDistance);

            // For the tube (newPoints), we DO NOT add dispersion. They stay swaying.
            newPoints.push(original.clone().add(combinedSway));

            // We store the dispersion offset in userData to apply to the tip later
            mesh.userData.currentDispersion = fullDispersion;
        }
        allNewPoints.push(newPoints);
    });

    // Pass 3: Update Geometry
    fronds.forEach((mesh, index) => {
        const newPoints = allNewPoints[index];
        const tipSphere = mesh.userData.tipSphere;

        // Update Tube Geometry
        mesh.geometry.dispose();
        const curve = new THREE.CatmullRomCurve3(newPoints);
        mesh.geometry = new THREE.TubeGeometry(curve, 12, 0.01, 3, false); // Reduced segments (32->12) and radial segments (5->3) for performance

        // Update tip sphere position
        // Use the resolved position from collision pass, or calculate if not resolved (e.g. no collision)
        let finalTipPos = mesh.userData.resolvedTipPos;
        if (!finalTipPos) {
            const lastPoint = newPoints[newPoints.length - 1];
            const dispersion = mesh.userData.currentDispersion || new THREE.Vector3();
            finalTipPos = lastPoint.clone().add(dispersion);
        }

        tipSphere.position.copy(finalTipPos);

        // Reset resolvedTipPos for next frame
        mesh.userData.resolvedTipPos = null;
    });
}

function createBackgroundGradient(centerColorHex = '#2a2a2a', edgeColorHex = '#050505') {
    const size = 2048; // Higher resolution for smooth gradient
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create subtle radial gradient
    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,           // Center circle
        size / 2, size / 2, size / 2     // Outer circle
    );

    // Radial gradient
    gradient.addColorStop(0.0, centerColorHex);
    gradient.addColorStop(1.0, edgeColorHex);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // 1. Fine grain noise (background texture)
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const noiseIntensity = 10;

    for (let i = 0; i < data.length; i += 4) {
        // Generate random noise value
        const noise = (Math.random() - 0.5) * noiseIntensity;

        // Add noise to RGB channels (luminance noise)
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
        // Alpha (data[i+3]) remains unchanged
    }
    ctx.putImageData(imageData, 0, 0);

    // 2. Add Random Specs (Darker Blue)
    // Use a dark blue with varying opacity to create the "speckled" texture
    // Gradient: Transparent at center -> Darker at edges
    const numSpecs = 150000; // High count for dense texture
    const centerX = size / 2;
    const centerY = size / 2;
    const maxDist = Math.hypot(centerX, centerY); // Distance to corner

    for (let i = 0; i < numSpecs; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;

        // Calculate distance from center
        const dist = Math.hypot(x - centerX, y - centerY);
        const t = dist / maxDist; // 0 at center, 1 at corner

        // Opacity gradient: 0.05 (center) -> 0.25 (edge)
        // Using a power curve (t^2) to keep the center cleaner for longer
        const opacity = 0.02 + (t * t) * 0.25;

        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;

        // Random small size (1px to 3px)
        const w = Math.random() * 2 + 1;
        const h = Math.random() * 2 + 1;
        ctx.fillRect(x, y, w, h);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Weather Integration
function getWeatherData() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day`);
                const data = await response.json();

                if (data.current) {
                    weatherCode = data.current.weather_code;
                    isDay = data.current.is_day;
                    console.log(`Weather Code: ${weatherCode}, Is Day: ${isDay}`);
                    updateBackgroundFromWeather();
                }
            } catch (error) {
                console.error("Error fetching weather:", error);
                // Fallback handled by default init
            }
        }, (error) => {
            console.warn("Geolocation denied or failed, using default location (Tokyo)", error);
            // Default to Tokyo
            fetchWeatherForLocation(35.6895, 139.6917);
        });
    } else {
        console.warn("Geolocation not available");
        fetchWeatherForLocation(35.6895, 139.6917);
    }
}

async function fetchWeatherForLocation(lat, lon) {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,is_day`);
        const data = await response.json();
        if (data.current) {
            weatherCode = data.current.weather_code;
            isDay = data.current.is_day;
            updateBackgroundFromWeather();
        }
    } catch (e) {
        console.error("Fallback weather fetch failed", e);
    }
}

function updateBackgroundFromWeather() {
    let centerColor, edgeColor;

    // WMO Weather Codes: https://open-meteo.com/en/docs
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow fall
    // 95, 96, 99: Thunderstorm

    // OVERRIDE: Dark Grey Background
    centerColor = '#2E2E2E'; // Dark Grey
    edgeColor = '#000000';   // Black

    console.log(`Updating background to: ${centerColor} -> ${edgeColor}`);
    const newTexture = createBackgroundGradient(centerColor, edgeColor);
    scene.background = newTexture;
}

function createNoiseTexture(colorHex) {
    const size = 1024; // Increased size for smooth noise
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill background
    const color = new THREE.Color(colorHex);
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    // Add noise
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 20; // Noise intensity
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        // Alpha remains 255
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    // Removed NearestFilter to allow Linear filtering (default) for smooth look
    return texture;
}

function createGradientTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Create Radial Gradient
    // Inner circle (x, y, r) to Outer circle (x, y, r)
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    // Colors based on "Aura" / Sunset gradient
    gradient.addColorStop(0.0, '#FF33AA'); // Center: Pink
    gradient.addColorStop(0.6, '#FF9966'); // Mid: Peach
    gradient.addColorStop(1.0, '#FFFF66'); // Edge: Yellow

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function updateCameraPosition() {
    if (!camera) return;
    const aspect = window.innerWidth / window.innerHeight;
    const objectRadius = 22; // Reduced from 30 to zoom in
    const fovRad = camera.fov * (Math.PI / 180);

    // Calculate distance needed to fit the object
    // If aspect < 1 (portrait), we constrain by width, so we divide by aspect
    const dist = objectRadius / (Math.tan(fovRad / 2) * Math.min(1, aspect));

    camera.position.z = dist;
}

function touchStarted() {
    if (getAudioContext().state !== 'running') {
        userStartAudio();
    }
}
