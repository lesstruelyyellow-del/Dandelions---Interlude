/*
 * 👋 Hello! This is an ml5.js example made and shared with ❤️.
 * Learn more about the ml5.js project: https://ml5js.org/
 * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
 *
 * This example demonstrates segmenting a person by body parts with ml5.bodySegmentation
 * and visualizing it with Three.js cubes.
 */



// Three.js variables
let scene, camera, renderer;
let nucleus;
let fronds = [];

function setup() {
    noCanvas();
    // Initialize Three.js
    initThree();
    initFronds();
}

function initThree() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 30;
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

    const pointLight = new THREE.PointLight(0xff00ff, 1, 100);
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
    const geometry = new THREE.SphereGeometry(2.0, 256, 256);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0xF8F4EC,
        emissive: 0xEFEDE6,
        emissiveIntensity: 0.2,
        roughness: 0.7,
        metalness: 0.1,
        transmission: 0.0,
        thickness: 2.0,
        transparent: false,
        opacity: 1.0,
        clearcoat: 0.1,
        clearcoatRoughness: 0.5,
    });

    nucleus = new THREE.Mesh(geometry, material);
    scene.add(nucleus);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

// Arrays to store categorized fronds for clock updates
let hourFronds = [];
let minuteFronds = [];
let secondFronds = [];

function initFronds() {
    const nucleusRadius = 2.0;
    const totalFronds = 132;

    // Define layer properties (only length varies now, startDist is uniform)
    // We create a pool of length definitions
    let frondProps = [];

    // Inner (Short) - 12 -> Large circle -> HOURS
    for (let i = 0; i < 12; i++) frondProps.push({ lengthMin: 3, lengthMax: 5, tipRadius: 0.6, type: 'hour' });
    // Middle (Medium) - 60 -> Medium circle -> MINUTES
    for (let i = 0; i < 60; i++) frondProps.push({ lengthMin: 6, lengthMax: 9, tipRadius: 0.3, type: 'minute' });
    // Outer (Long) - 60 -> Small circle -> SECONDS
    for (let i = 0; i < 60; i++) frondProps.push({ lengthMin: 10, lengthMax: 14, tipRadius: 0.15, type: 'second' });

    // Shuffle the properties to distribute lengths randomly across the uniform sphere
    frondProps.sort(() => Math.random() - 0.5);

    // Base material for tips (we will clone this)
    // Base material for tips (we will clone this)
    const baseTipMaterial = new THREE.MeshStandardMaterial({ // Changed to Standard for better shading
        color: 0xF8F4EC,
        emissive: 0xEFEDE6,
        emissiveIntensity: 0.1, // Lower default emissive to show shading
        roughness: 0.4, // Lower roughness for some specular highlight
        metalness: 0.1,
        transparent: false,
        opacity: 1.0,
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
        const segments = 100; // Increased from 50 for ultra smooth curves
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
        scene.add(tipSphere);

        // Store animation data
        line.userData = {
            originalPoints: points.map(p => p.clone()),
            phase: Math.random() * Math.PI * 2,
            speed: 0.0005 + Math.random() * 0.001,
            swayAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize().cross(dir).normalize(), // Random sway axis
            tipSphere: tipSphere
        };

        scene.add(line);
        fronds.push(line);

        // Categorize for clock
        if (props.type === 'hour') {
            hourFronds.push(line);
        } else if (props.type === 'minute') {
            minuteFronds.push(line);
        } else if (props.type === 'second') {
            secondFronds.push(line);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    // Update Hours - GREEN
    hourFronds.forEach((frond, index) => {
        const sphere = frond.userData.tipSphere;
        if (index < hours) {
            sphere.material.emissiveIntensity = 2.0; // Glow
            sphere.material.color.setHex(0x32CD32); // Lime Green
            sphere.material.emissive.setHex(0x32CD32);
        } else {
            sphere.material.emissiveIntensity = 0.1; // Dim
            sphere.material.color.setHex(0xF8F4EC); // Original color
            sphere.material.emissive.setHex(0xEFEDE6);
        }
    });

    // Update Minutes - PURPLE
    minuteFronds.forEach((frond, index) => {
        const sphere = frond.userData.tipSphere;
        if (index < minutes) {
            sphere.material.emissiveIntensity = 1.5; // Glow
            sphere.material.color.setHex(0x800080); // Purple
            sphere.material.emissive.setHex(0x800080);
        } else {
            sphere.material.emissiveIntensity = 0.1; // Dim
            sphere.material.color.setHex(0xF8F4EC);
            sphere.material.emissive.setHex(0xEFEDE6);
        }
    });

    // Update Seconds - RED
    secondFronds.forEach((frond, index) => {
        const sphere = frond.userData.tipSphere;
        if (index < seconds) {
            sphere.material.emissiveIntensity = 1.5; // Glow
            sphere.material.color.setHex(0xFF0000); // Red
            sphere.material.emissive.setHex(0xFF0000);
        } else {
            sphere.material.emissiveIntensity = 0.1; // Dim
            sphere.material.color.setHex(0xF8F4EC);
            sphere.material.emissive.setHex(0xEFEDE6);
        }
    });
}

function draw() {


    // Update Three.js scene
    // Animate nucleus
    if (nucleus) {
        nucleus.rotation.y += 0.002;
        nucleus.rotation.z += 0.001;
    }

    animateFronds();
    updateClock();

    // Keep camera straight facing the cubes
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

function animateFronds() {
    const time = Date.now();
    const allNewPoints = []; // Store calculated points for all fronds

    // Pass 1: Calculate proposed positions
    fronds.forEach((mesh, index) => {
        const originalPoints = mesh.userData.originalPoints;
        const phase = mesh.userData.phase;
        const speed = mesh.userData.speed;
        const swayAxis = mesh.userData.swayAxis;

        const newPoints = [];
        for (let i = 0; i < originalPoints.length; i++) {
            // Sway increases with distance from start (index i)
            // t goes from 0 to 1 along the frond
            const t = i / (originalPoints.length - 1);

            // Simple sine wave sway (Macro)
            const swayAmount = Math.sin(time * speed + phase + t * 2) * t * 0.5;

            // Micro-motion (Air currents) - Faster, smaller, more chaotic
            const microSway = Math.sin(time * speed * 5 + phase * 3) * t * 0.05 +
                Math.cos(time * speed * 8 + phase) * t * 0.02;

            const original = originalPoints[i];
            const swayVector = swayAxis.clone().multiplyScalar(swayAmount + microSway);

            newPoints.push(original.clone().add(swayVector));
        }
        allNewPoints.push(newPoints);
    });

    // Pass 2: Collision Resolution on Tips
    const iterations = 3; // Run a few times for stability
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < fronds.length; i++) {
            for (let j = i + 1; j < fronds.length; j++) {
                const tipA = allNewPoints[i][allNewPoints[i].length - 1];
                const tipB = allNewPoints[j][allNewPoints[j].length - 1];

                // Get radii from the actual sphere geometry attached to userData
                // We stored tipSphere in userData. The geometry.parameters.radius holds the radius.
                const radiusA = fronds[i].userData.tipSphere.geometry.parameters.radius;
                const radiusB = fronds[j].userData.tipSphere.geometry.parameters.radius;

                const minDist = radiusA + radiusB + 0.05; // Add a small buffer
                const distSq = tipA.distanceToSquared(tipB);

                if (distSq < minDist * minDist && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;

                    // Direction from B to A
                    const dir = tipA.clone().sub(tipB).normalize();

                    // Move A and B apart (half overlap each)
                    const move = dir.multiplyScalar(overlap * 0.5);

                    tipA.add(move);
                    tipB.sub(move);
                }
            }
        }
    }

    // Pass 3: Update Geometry
    fronds.forEach((mesh, index) => {
        const newPoints = allNewPoints[index];
        const tipSphere = mesh.userData.tipSphere;

        // Update Tube Geometry
        mesh.geometry.dispose();
        const curve = new THREE.CatmullRomCurve3(newPoints);
        mesh.geometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);

        // Update tip sphere position
        const lastPoint = newPoints[newPoints.length - 1];
        tipSphere.position.copy(lastPoint);
    });
}
