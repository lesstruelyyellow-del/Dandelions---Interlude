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
let noiseTexture;
let backgroundDandelions = []; // Mini dandelions for field effect
let hourLight, minuteLight; // Dynamic spotlights for time indicators

// Audio variables
let mic;
let isDispersed = false;
let dispersionStartTime = 0;
const DISPERSION_DURATION = 0; // Immediate return
const MIN_DISPERSION_DISTANCE = 20;
const MAX_DISPERSION_DISTANCE = 50; // Reduced max distance to 50
const MIC_THRESHOLD = 0.18; // Reduced sensitivity to require intentional voice input while filtering ambient noise
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
// let fpsElement; // Removed debug element

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
    // fpsElement = document.getElementById('fpsCounter'); // Removed debug element
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
    dandelionPivot.position.y = -70.0; // Anchor at bottom of stem (Lowered from -68.0 for better framing)
    scene.add(dandelionPivot);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight / 1.8,
        0.1,
        1000
    );
    camera.position.x = 0;
    camera.position.y = 25; // Lowered from 35 for better angle when zoomed in
    camera.position.z = 45;
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
    directionalLight1.shadow.radius = 4; // Soften shadows
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x4466ff, 0.5);
    directionalLight2.position.set(-10, -10, -5);
    directionalLight2.castShadow = true;
    directionalLight2.shadow.mapSize.width = 2048;
    directionalLight2.shadow.mapSize.height = 2048;
    directionalLight2.shadow.radius = 4; // Soften shadows
    scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 20, 20);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    pointLight.shadow.radius = 4; // Soften shadows
    scene.add(pointLight);

    // Add Rim Light to highlight edges and curvature
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(0, 0, -20); // Backlight
    scene.add(rimLight);

    // Create Dynamic Spotlights for Lamps
    hourLight = new THREE.SpotLight(0xFFE84F, 2.0);
    hourLight.angle = 0.3; // Narrow beam
    hourLight.penumbra = 0.5; // Soft edge
    hourLight.decay = 2;
    hourLight.distance = 200;
    hourLight.castShadow = true;
    dandelionPivot.add(hourLight);
    dandelionPivot.add(hourLight.target); // Important to add target to scene hierarchy if moving it

    minuteLight = new THREE.SpotLight(0xC242E2, 2.0); // Purple default
    minuteLight.angle = 0.3;
    minuteLight.penumbra = 0.5;
    minuteLight.decay = 2;
    minuteLight.distance = 200;
    minuteLight.castShadow = true;
    dandelionPivot.add(minuteLight);
    dandelionPivot.add(minuteLight.target);

    // Material for Frond Tubes
    const frondMaterial = new THREE.MeshStandardMaterial({
        color: 0xF6F2E9,
        roughness: 0.5,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4
    });

    // Create Noise Texture
    noiseTexture = createNoiseTexture();

    // Create Nucleus
    // Create Nucleus
    // Create Nucleus
    const geometry = new THREE.SphereGeometry(2.1, 256, 256); // Reduced from 2.5
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xd0d0d0, // Slightly brighter for very subtle glow
        emissive: 0x000000, // Removed emission completely
        emissiveIntensity: 0.0,
        roughness: 0.5, // Increased roughness to diffuse light more
        metalness: 0.1,
        transmission: 0.0,
        thickness: 2.0,
        transparent: false,
        opacity: 1.0,
        clearcoat: 0.1, // Further reduced clearcoat to reduce specular highlights
        clearcoatRoughness: 0.2,
        map: noiseTexture,
    });

    nucleus = new THREE.Mesh(geometry, material);
    nucleus.receiveShadow = true; // Enable receiving shadows
    nucleus.position.y = 75.0; // Offset relative to pivot
    dandelionPivot.add(nucleus);

    // Create Stem (Organic)
    const stemHeight = 100; // Increased from 72.5 to ensure it goes off-screen
    const stemRadius = 0.22; // Reduced slightly from 0.3

    // Create curve points for organic stem with more pronounced natural curve
    const stemPoints = [];
    const numPoints = 20;
    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const y = -1.5 - (t * stemHeight); // Start INSIDE nucleus (radius 2.1) to ensure no gap

        // Add more pronounced organic curves (sine waves for natural S-curve feel)
        // Primary gentle S-curve - balanced and centered
        const xOffset = Math.sin(t * Math.PI * 1.5) * 0.6 + Math.sin(t * Math.PI * 3.5) * 0.3;
        const zOffset = Math.cos(t * Math.PI * 1.8 + 0.5) * 0.6 + Math.cos(t * Math.PI * 2.5) * 0.3;

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
    stem.position.y = 75.0; // Offset relative to pivot
    dandelionPivot.add(stem);

    // Create Gradient Texture for Minutes
    // Create Gradient Textures
    minuteGradientTexture = createMinuteGradient();
    const hourGradientTexture = createHourGradient();
    // Store globally or attach to something?
    // Let's store them in global variables for reuse
    window.hourGradientTexture = hourGradientTexture;
    window.minuteGradientTexture = minuteGradientTexture;

    // Post-processing - Re-enabled for subtle glow
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.25, // Strength - Reduced to minimize nucleus glow
        0.4, // Radius (Increased from 0.2)
        0.78 // Threshold - Adjusted for very slight nucleus glow
    );
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // composer = null;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('orientationchange', onWindowResize, false);

    createStarField();
}

// Arrays to store categorized fronds for clock updates
let hourFronds = [];
let minuteFronds = [];


function initFronds() {
    const nucleusRadius = 0.17; // Reduced from 0.2
    const totalFronds = 72;

    // Define layer properties (only length varies now, startDist is uniform)
    // We create a pool of length definitions
    let frondProps = [];

    // Inner (Short) - 12 -> Large circle -> HOURS
    for (let i = 0; i < 12; i++) frondProps.push({ lengthMin: 6.1, lengthMax: 8.7, tipRadius: 0.75, type: 'hour' }); // Scaled down ~0.85
    // Middle (Medium) - 60 -> Medium circle -> MINUTES
    for (let i = 0; i < 60; i++) frondProps.push({ lengthMin: 10.0, lengthMax: 13.8, tipRadius: 0.38, type: 'minute' }); // Scaled down ~0.85

    // Shuffle the properties to distribute lengths randomly across the uniform sphere
    frondProps.sort(() => Math.random() - 0.5);

    // Base material for tips (we will clone this)
    // Base material for tips (we will clone this) - TRANSPARENCY ENABLED
    // Base material for tips (we will clone this)
    // Base material for tips (we will clone this) - BLOWN GLASS
    const baseTipMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xF8F4EC,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        roughness: 0.5, // Increased for fuzzy/frosted look
        metalness: 0.0, // Glass is dielectric
        transmission: 0.6, // Glass transparency
        thickness: 1.5, // Volume simulation
        clearcoat: 1.0, // High gloss
        clearcoatRoughness: 0.4, // Rough clearcoat for fuzziness
        transparent: false, // Physical material handles transmission without transparent:true usually
        opacity: 1.0,
        map: noiseTexture, // Apply noise texture
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
        const material = new THREE.MeshStandardMaterial({
            color: 0xF6F2E9,
            roughness: 0.5,
            metalness: 0.1,
            transparent: false,
            opacity: 1.0
        });

        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 12, 0.035, 3, false); // Thicker radius 0.035

        const line = new THREE.Mesh(tubeGeometry, material);

        // Create tip sphere with CLONED material for individual control
        // Create tip sphere with CLONED material for individual control
        const tipGeometry = new THREE.SphereGeometry(props.tipRadius, 128, 128); // Increased from 64,64
        const tipMaterial = baseTipMaterial.clone();
        const tipSphere = new THREE.Mesh(tipGeometry, tipMaterial);
        tipSphere.castShadow = true; // Enable casting shadows
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
            orbitAxis: new THREE.Vector3(Math.random() * 0.2 - 0.1, 1.0, Math.random() * 0.2 - 0.1).normalize(), // Vertical axis for orbit
            tipSphere: tipSphere
        };

        line.position.y = 75.0; // Offset relative to pivot
        dandelionPivot.add(line);
        fronds.push(line);

        // Categorize for clock
        if (props.type === 'hour') {
            hourFronds.push(line);
        } else if (props.type === 'minute') {
            minuteFronds.push(line);
        }
    }

    // Sort Fronds Spatially (Clockwise starting from 12 o'clock)
    // 12 o'clock is usually -Z or +Z. Let's assume -Z is up/start.
    // Angle: atan2(x, z).
    // We want to sort by angle.
    const sortFronds = (frondsArray) => {
        frondsArray.sort((a, b) => {
            // Get position of the tip (or base direction)
            // We stored dispersionDir which is random, but we need the original direction.
            // We can get it from the first point of the line.
            const pA = a.userData.originalPoints[0];
            const pB = b.userData.originalPoints[0];

            // Calculate angle in XZ plane
            // Math.atan2(x, z) returns -PI to PI.
            // We want to start at -Z (angle PI or -PI) and go clockwise?
            // Standard atan2(x, z):
            // z=-1, x=0 -> atan2(0, -1) = PI
            // z=0, x=1 -> atan2(1, 0) = PI/2
            // z=1, x=0 -> atan2(0, 1) = 0
            // z=0, x=-1 -> atan2(-1, 0) = -PI/2

            // We want order: -Z -> +X -> +Z -> -X -> -Z
            // PI -> PI/2 -> 0 -> -PI/2 -> -PI
            // So we just sort descending by atan2(x, z)?
            // Let's try that.

            const angleA = Math.atan2(pA.x, pA.z);
            const angleB = Math.atan2(pB.x, pB.z);

            return angleB - angleA; // Descending
        });
    };

    sortFronds(hourFronds);
    sortFronds(minuteFronds);
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
            // Active: Use the calculated gradient color
            // sphere.material.map = null; // Don't remove map
            sphere.material.color.setHex(0xFFE84F); // Yellow Refined
            sphere.material.emissive.setHex(0xCCCC00); // Darker Yellow Emissive base
            sphere.material.emissiveIntensity = 0.08; // Reduced for more subtle glow
            sphere.material.roughness = 0.5; // Fuzzy/Frosted
            sphere.material.metalness = 0.1;
            sphere.material.opacity = 1.0;
        } else {
            // Inactive: Slight Pink - fully opaque
            // sphere.material.map = null; // Don't remove map
            sphere.material.color.setHex(0xFFEBEF); // Slight Pink
            sphere.material.emissive.setHex(0xFFE4E8); // Matching Emissive
            sphere.material.emissiveIntensity = 0.2;
            sphere.material.roughness = 0.2; // Soft Gloss
            sphere.material.metalness = 0.2;
            sphere.material.opacity = 1.0; // Fully opaque
        }
    });

    // Update Hour Light Position
    if (hourFronds.length > 0) {
        let activeIndex = hours - 1;
        if (activeIndex < 0) activeIndex = 11;

        const activeFrond = hourFronds[activeIndex];
        if (activeFrond) {
            const sphere = activeFrond.userData.tipSphere;
            const posInPivot = sphere.position.clone().add(activeFrond.position);

            hourLight.position.copy(posInPivot);
            hourLight.target.position.set(0, 75, 0);
            hourLight.color.setHex(0xFFE84F);
        }
    }

    // Update Minutes - with Gradient
    minuteFronds.forEach((frond, index) => {
        const sphere = frond.userData.tipSphere;

        // Calculate gradient color for this specific minute index (0 to 59)
        // UNIFORM PURPLE (#c242e2) as requested
        // "Make sure the colours of all the minute circles are uniform and one."
        const targetColor = new THREE.Color(0xC242E2);

        if (index < minutes) {
            // Active: Use the uniform color
            // Match color
            // Uniform Purple
            minuteLight.color.setHex(0xC242E2);
            sphere.material.color.copy(targetColor); // Ensure base color is also purple
            sphere.material.emissive.copy(targetColor);
            // Scale emissive intensity based on color/time
            // Increased for more subtle glow around all minute circles
            const t = index / 59; // Assuming index goes from 0 to 59 for minutes
            sphere.material.emissiveIntensity = 0.15 + t * 0.3; // Increased from 0.1 base
            sphere.material.roughness = 0.5; // Fuzzy/Frosted
            sphere.material.metalness = 0.1;
            sphere.material.opacity = 1.0;
        } else {
            // Inactive: Slight Pink with subtle glow
            sphere.material.emissiveMap = null;
            sphere.material.color.setHex(0xFFEBEF); // Slight Pink
            sphere.material.emissive.setHex(0xFFE4E8);
            sphere.material.emissiveIntensity = 0.3; // Increased from 0.2 for subtle glow
            sphere.material.roughness = 0.2; // Soft Gloss
            sphere.material.metalness = 0.2;
            sphere.material.opacity = 1.0; // Fully opaque
        }
    });

    // Update Minute Light Position
    if (minuteFronds.length > 0) {
        let activeIndex = minutes - 1;
        if (activeIndex < 0) activeIndex = 59;

        if (minutes > 0) {
            const activeFrond = minuteFronds[activeIndex];
            if (activeFrond) {
                const sphere = activeFrond.userData.tipSphere;
                const posInPivot = sphere.position.clone().add(activeFrond.position);

                minuteLight.position.copy(posInPivot);
                minuteLight.target.position.set(0, 75, 0);
                minuteLight.intensity = 2.0;

                // Color is set in the loop above (Uniform Purple)
            }
        } else {
            minuteLight.intensity = 0;
        }
    }

    // --- SUNDIAL EFFECT ---
    // Calculate sun angle based on time (0 to 2PI)
    // 12 hours = 360 degrees (2PI radians)
    // Noon (12:00) should be overhead or specific angle?
    // Let's say 12:00 is -Z (front) or +Y (top)?
    // Standard clock: 12 is top.
    // Let's map 12:00 to Top-Down or Front-Lit.
    // Actually, for a sundial shadow, the light moves.
    // Let's map time to an orbital angle around the Y axis (or X/Z depending on view).
    // Camera is at Z=30, Y=25.
    // Let's orbit around the Y axis.

    // Total seconds in 12 hours = 12 * 3600 = 43200
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const cycle = 12 * 3600;
    const ratio = totalSeconds / cycle; // 0 to 1
    const angle = ratio * Math.PI * 2; // 0 to 2PI

    // Orbit radius
    const orbitRadius = 20;
    // Offset angle so 12:00 is "noon" (high up or specific direction)
    // Let's make the light rotate around the nucleus in the XZ plane, but also vary Y?
    // Simple orbit: Circle around Y axis.
    // x = sin(angle) * r
    // z = cos(angle) * r
    // y = constant (height)

    // To cast interesting shadows, the light should be somewhat side-on.
    // Let's put it at a fixed height but rotate around.
    const lightX = Math.sin(angle) * orbitRadius;
    const lightZ = Math.cos(angle) * orbitRadius;
    const lightY = 10; // Height above nucleus

    // We need to access the light. It's a local variable in initThree.
    // We need to make it global or accessible.
    // Let's find the light in the scene.
    const sunLight = scene.children.find(child => child.isDirectionalLight && child.castShadow && child.position.y > 0);

    if (sunLight) {
        // Relative to nucleus position (which is at 0, 72.5, 0 relative to pivot, but pivot is at -72.5)
        // Nucleus world position is roughly 0,0,0.
        // So we can just set the light position directly.
        sunLight.position.set(lightX, lightY, lightZ);
        // Ensure it points at nucleus (0,0,0)
        sunLight.target.position.set(0, 0, 0);
        sunLight.target.updateMatrixWorld();
    }
}

function createNoiseTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Add noise
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const noiseIntensity = 40; // Adjust for visibility

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * noiseIntensity;
        // Subtract noise to make it darker/grainy
        const val = 255 - Math.abs(noise);
        data[i] = val;     // R
        data[i + 1] = val; // G
        data[i + 2] = val; // B
        data[i + 3] = 255; // Alpha
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
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

    animateStars();
    animateFronds();
    updateClock();

    // Keep camera straight facing the cubes
    camera.lookAt(0, 0, 0);

    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    // Update FPS - REMOVED
    /*
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        if (fpsElement) {
            fpsElement.innerText = `FPS: ${frameCount}`;
        }
        frameCount = 0;
        lastTime = currentTime;
    }
    */
}


// Debug info function removed

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
    // drawDebugInfo(vol); // Removed debug call

    // Dynamic Dispersion Logic
    // Use very high threshold when already dispersed to ignore ambient noise
    const activeThreshold = isDispersed ? 0.40 : MIC_THRESHOLD;

    if (vol > activeThreshold) {
        // Sustain: Keep resetting the start time as long as there is sound
        if (!isDispersed) {
            // New dispersion event: Generate unique paths
            fronds.forEach(frond => {
                frond.userData.dispersionDir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
                frond.userData.orbitAxis = new THREE.Vector3(Math.random() * 0.2 - 0.1, 1.0, Math.random() * 0.2 - 0.1).normalize();
            });
        }
        isDispersed = true;
        dispersionStartTime = Date.now();
        console.log("Dispersion sustained! Volume:", vol, "Threshold:", activeThreshold);

        // Map Volume to Target Distance (Dynamic)
        // Map vol (0.05 to 0.5) -> Distance (20 to 80)
        // Clamp volume input to useful range
        const clampedVol = Math.min(Math.max(vol, MIC_THRESHOLD), 0.5);
        const ratio = (clampedVol - MIC_THRESHOLD) / (0.5 - MIC_THRESHOLD); // 0 to 1

        const targetDist = MIN_DISPERSION_DISTANCE + ratio * (MAX_DISPERSION_DISTANCE - MIN_DISPERSION_DISTANCE);

        // Map Volume to Rotation Speed
        // Map ratio (0 to 1) -> Speed (0.01 to 0.18 radians/frame) - Reduced for slower movement
        const targetSpeed = 0.01 + ratio * 0.18;
        currentRotationSpeed += (targetSpeed - currentRotationSpeed) * 0.05; // Smoother transition

        // Smoothly interpolate current distance to target
        currentDispersionDistance += (targetDist - currentDispersionDistance) * 0.02; // Smoother transition

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

            // ORBITAL DISPERSION LOGIC
            // 1. Calculate the "Straight Out" Target Position (Max Distance)
            // We use the last point of the tube (lastPoint) as the base.
            // Since we are inside the loop, we need to reconstruct the last point or wait?
            // We are iterating points. The last point is when i == originalPoints.length - 1.
            // But we need to set userData.currentDispersion for the TIP, which is at the end.
            // So we should do this calculation ONLY for the last point, or outside the loop?
            // The loop calculates `newPoints`.
            // Let's do it AFTER the loop for the tip.

            // For the tube (newPoints), we DO NOT add dispersion. They stay swaying.
            newPoints.push(original.clone().add(combinedSway));
        }
        allNewPoints.push(newPoints);

        // --- Calculate Tip Dispersion (Orbital) ---
        const lastPoint = newPoints[newPoints.length - 1];

        // 1. Target (Max) Position straight out
        const straightTarget = lastPoint.clone().add(mesh.userData.dispersionDir.clone().multiplyScalar(currentDispersionDistance));

        // 2. Rotate Target around Nucleus (0,0,0)
        // Scale angle by dispersion factor to ensure smooth start/end (unwinding effect)
        const effectiveAngle = dispersionRotationAngle * currentDispersionFactor;
        if (effectiveAngle !== 0) {
            straightTarget.applyAxisAngle(mesh.userData.orbitAxis, effectiveAngle);
        }

        // 3. Lerp to Target
        const finalPos = lastPoint.clone().lerp(straightTarget, currentDispersionFactor);

        // 4. Store offset for tip sphere
        mesh.userData.currentDispersion = finalPos.sub(lastPoint);
    });

    // Pass 3: Update Geometry
    fronds.forEach((mesh, index) => {
        const newPoints = allNewPoints[index];
        const tipSphere = mesh.userData.tipSphere;

        // Update Tube Geometry
        mesh.geometry.dispose();
        const curve = new THREE.CatmullRomCurve3(newPoints);
        mesh.geometry = new THREE.TubeGeometry(curve, 12, 0.035, 3, false); // Reduced segments (32->12) and radial segments (5->3) for performance, Radius 0.035

        // Update tip sphere position
        // Use the resolved position from collision pass, or calculate if not resolved (e.g. no collision)
        let finalTipPos = mesh.userData.resolvedTipPos;
        if (!finalTipPos) {
            const lastPoint = newPoints[newPoints.length - 1];
            const dispersion = mesh.userData.currentDispersion || new THREE.Vector3();
            finalTipPos = lastPoint.clone().add(dispersion);
        }

        tipSphere.position.copy(finalTipPos);

        // --- Motion Blur / Stretch Effect ---
        // Calculate velocity based on rotation speed and distance
        // Tangential velocity = angularVelocity * radius
        // radius is roughly currentDispersionDistance (when dispersed)
        // We can also just use the change in position if we tracked it, but analytical is cleaner here.

        // Only apply if dispersed and moving fast enough
        if (isDispersed && currentRotationSpeed > 0.02) {
            // Tangential direction: Cross product of orbit axis and radius vector (tipPos - nucleusPos)
            // Nucleus is at (0, 75, 0) relative to pivot.
            // But here we are in local space of pivot? Yes.
            // tipSphere.position is local to dandelionPivot.
            // Nucleus is at (0, 75, 0).
            const radiusVec = finalTipPos.clone().sub(new THREE.Vector3(0, 75, 0));
            const tangentDir = new THREE.Vector3().crossVectors(mesh.userData.orbitAxis, radiusVec).normalize();

            // Stretch factor based on speed
            // Speed ~ 0.01 to 0.3
            // Stretch 1.0 to 4.0?
            const stretchFactor = 1.0 + (currentRotationSpeed * 15.0); // Tweak multiplier

            // Align sphere to tangent
            // We need to rotate the sphere so its local X (or Y/Z) aligns with tangentDir
            // Default sphere is symmetric, so any axis works. Let's stretch along Y.

            // Reset rotation first
            tipSphere.rotation.set(0, 0, 0);

            // Create a quaternion to rotate Y axis to tangentDir
            const axis = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, tangentDir);
            tipSphere.setRotationFromQuaternion(quaternion);

            // Apply scale
            tipSphere.scale.set(1 / Math.sqrt(stretchFactor), stretchFactor, 1 / Math.sqrt(stretchFactor)); // Preserve volume roughly
        } else {
            // Reset scale and rotation
            tipSphere.scale.set(1, 1, 1);
            tipSphere.rotation.set(0, 0, 0);
        }

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

function createHourGradient() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Sunset Gradient (Deep Purple -> Pink -> Orange)
    // Diagonal gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0.0, '#5D3A5D'); // Deep Purple
    gradient.addColorStop(0.5, '#D65D7A'); // Vibrant Pink
    gradient.addColorStop(1.0, '#F59F5B'); // Orange

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createMinuteGradient() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Golden Hour Gradient (Orange -> Golden Yellow -> Pale Yellow)
    // Diagonal gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0.0, '#F59F5B'); // Orange
    gradient.addColorStop(0.5, '#FFD460'); // Golden Yellow
    gradient.addColorStop(1.0, '#FFF5C0'); // Pale Yellow

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createCircleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const center = size / 2;
    const radius = size / 2;

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function createStarField() {
    const starCount = 500; // Set to 500 as requested
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const phases = [];
    const speeds = [];

    for (let i = 0; i < starCount; i++) {
        // Random position in a large sphere
        const r = 200 + Math.random() * 300; // Distance 200-500
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions.push(x, y, z);

        // Initial color (white-ish)
        colors.push(1, 1, 1);

        // Twinkle properties
        phases.push(Math.random() * Math.PI * 2);
        speeds.push(0.002 + Math.random() * 0.005);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // Store custom data for animation
    geometry.userData = { phases, speeds };

    const circleTexture = createCircleTexture();

    const material = new THREE.PointsMaterial({
        size: 2.5, // Slightly increased size for visibility
        map: circleTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        alphaTest: 0.5 // Ensure transparency works correctly
    });

    stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

function animateStars() {
    if (!stars) return;

    const time = Date.now();
    const colors = stars.geometry.attributes.color.array;
    const phases = stars.geometry.userData.phases;
    const speeds = stars.geometry.userData.speeds;

    for (let i = 0; i < phases.length; i++) {
        // Twinkle sine wave
        // Brightness oscillates between 0.3 and 1.0
        const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * speeds[i] + phases[i]));

        // Update color (grey level for twinkling)
        colors[i * 3] = brightness;     // R
        colors[i * 3 + 1] = brightness; // G
        colors[i * 3 + 2] = brightness; // B
    }

    stars.geometry.attributes.color.needsUpdate = true;
}
