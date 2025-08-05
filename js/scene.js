import { MountainGreen, makePalette } from './palette.js';
import { start, togglePlayState, createSynthesizers, mouseToPad, subscribeToSynthesizer, handleKey, resume, toggleActiveGenerator, getTransportTime, createArpEvents } from './synthesizers.js';
import { skyVertexShader, skyFragmentShader } from './shaders.js';
import { animateBirds, spawnBirdsAtPosition } from './birds.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const cameraDistance = 25;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Mouse tracking
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

// Create a ground plane
const groundGeometry = new THREE.PlaneGeometry(1000, 150);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xa68346, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2; // Rotate to horizontal
ground.position.z = -cameraDistance; // Position it behind the camera
scene.add(ground);

// Create sky with custom shader material
const skyGeometry = new THREE.PlaneGeometry(1000, 1000);
const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: {
        u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    side: THREE.DoubleSide
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.position.z = -300; // Position it way in the background
scene.add(sky);

// Add a cloud by aggregating a few overlapping spheres
const cloudGeometry = new THREE.SphereGeometry(1, 32, 32);
const cloudMaterials = [
    new THREE.MeshBasicMaterial({ color: 0xffeeff, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0xf0e0f0, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0xeeeeff, transparent: true, opacity: 0.8 })
];
const cloudDistance = [-200, -50];
let clouds = [];

// Create materials for the mountains
const mountainPalette = makePalette(...MountainGreen);
const mountainStops = 8;
const mountainColors = [];
const mountainSaturation = [];
for (let i = 0; i < mountainStops; i++) {
    const t = i / (mountainStops - 1);
    mountainColors.push(new THREE.Color(mountainPalette(t)));
    mountainSaturation.push(0.0);
}
const mountainMaterials = [];
for (let i = 0; i < mountainStops; i++) {
    const color = {};
    mountainColors[i].getHSL(color);
    const materialColor = new THREE.Color();
    materialColor.setHSL(color.h, mountainSaturation[i], color.l);
    mountainMaterials.push(new THREE.MeshBasicMaterial({ color: materialColor }));
}
let mountains = [];
let hoveredMountain = null;

// Birds
let birdFlocks = [];

// Position camera
camera.position.y = 20;
camera.position.z = cameraDistance;

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Calculate delta time for smooth animation
    const currentTime = performance.now() * 0.001;
    const deltaTime = currentTime - (animate.lastTime || currentTime);
    animate.lastTime = currentTime;

    const newClouds = [];

    clouds.forEach((cloudGroup) => {
        // slowly drift the clouds off to the left
        cloudGroup.position.x -= 0.02;
        const xrange = Math.abs(camera.position.z - cloudGroup.position.z) * Math.tan(75 * Math.PI / 180) - 150;
        let offscreenX = -xrange; // Offscreen position to the left

        // if the cloud is too far left, remove it from the scene and spawn a new cloud group
        if (cloudGroup.position.x < offscreenX) {
            const newCloudGroup = createCloudGroup();
            newCloudGroup.position.x = (xrange) * (Math.random() - 0.5) + xrange; // Random X position, but offscreen
            newCloudGroup.position.y = Math.random() * 80 + 15; // Random Y position
            newCloudGroup.position.z = Math.random() * (cloudDistance[1] - cloudDistance[0]) + cloudDistance[0];
            scene.add(newCloudGroup);
            scene.remove(cloudGroup);
            newClouds.push(newCloudGroup);
        }
    });

    clouds.push(...newClouds);
    clouds = clouds.filter((cloudGroup) => {
        const xrange = Math.abs(camera.position.z - cloudGroup.position.z) * Math.tan(75 * Math.PI / 180) - 150;
        let offscreenX = -xrange; // Offscreen position to the left
        return cloudGroup.position.x > offscreenX; // Keep only clouds that are still visible
    });

    // Update time uniform for animation
    skyMaterial.uniforms.u_time.value = performance.now() * 0.001;

    mountainSaturation.forEach((saturation, index) => {
        const color = mountainColors[index];
        const currentColor = {};
        color.getHSL(currentColor);
        if (hoveredMountain && hoveredMountain.object.userData.row === index) {
            saturation += 0.05; // Increase saturation on hover
        } else if (saturation > 0) {
            saturation -= 0.05;
        }
        saturation = Math.max(0, Math.min(1, saturation)); // Clamp saturation between 0 and 1
        const materialColor = mountainMaterials[index].color;
        materialColor.setHSL(currentColor.h, saturation, currentColor.l);
        mountainMaterials[index].color.set(materialColor);
        mountainSaturation[index] = saturation; // Update saturation
    });

    animateBirds(scene, birdFlocks, deltaTime);

    renderer.render(scene, camera);
}

function createMountainMesh(material, userData = {}) {
    const x = 0, y = 0;

    const mountain = new THREE.Shape();

    mountain.moveTo( x - 5, y );
    mountain.lineTo( x , y + 5 );
    mountain.lineTo( x + 5, y );
    mountain.closePath();

    const geometry = new THREE.ShapeGeometry( mountain );
    const mesh = new THREE.Mesh( geometry, material ) ;
    mesh.name = `mountain-${userData.row || 0}`;

    mesh.userData = userData;

    scene.add( mesh );

    return mesh;
}

function createCloudGroup() {
    const group = new THREE.Group();
    const cloudCount = 1; // Number of clouds in the group
    const cloudSpacing = 3; // Spacing between clouds
    const widthRange = 5; // Width range for clouds
    const cloudScale = 10.0;
    const cloudMaterial = cloudMaterials[Math.floor(Math.random() * cloudMaterials.length)];

    for (let i = 0; i < cloudCount; i++) {
        const cloudlet = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudlet.scale.set(
            (1 + Math.random() * widthRange * ((i + 1) / cloudCount)) * cloudScale,
            (1 + Math.random()) * cloudScale * 0.5,
            (1 + Math.random()) * cloudScale * 0.5
        ); // Random scale
        cloudlet.position.set(
            (Math.random() * cloudSpacing * 2) * cloudScale,
            (Math.random() * cloudSpacing) * cloudScale,
            0
        );
        group.add(cloudlet);
    }

    return group;
}

// Debug function to visualize the raycaster
function addRayVisualization() {
    // Create a line to show the ray direction
    const rayGeometry = new THREE.BufferGeometry();
    const rayMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const rayLine = new THREE.Line(rayGeometry, rayMaterial);
    scene.add(rayLine);
    
    // Update ray visualization in your mouse move handler
    function updateRayVisualization() {
        const rayDirection = raycaster.ray.direction.clone();
        const rayOrigin = raycaster.ray.origin.clone();
        
        // Create points for the ray line
        const points = [
            rayOrigin,
            rayOrigin.clone().add(rayDirection.multiplyScalar(500))
        ];
        
        rayGeometry.setFromPoints(points);
    }
    
    return updateRayVisualization;
}

const updateRayVisualization = addRayVisualization();

// Add a bunch of mountains
for (let i = 0; i < 1000; i++) {
    const t = Math.random(); // Random value for color palette
    const row = Math.floor((1 - t) * mountainStops);
    const distance = -100 * t + 11; // Random distance from the origin
    const mountainMaterial = mountainMaterials[Math.floor((1 - t) * (mountainStops))];
    const mountainMesh = createMountainMesh(mountainMaterial, { type: 'mountain', row: row });
    const xrange = Math.abs(camera.position.z - distance) * Math.tan(75 * Math.PI / 180) - 25;
    mountainMesh.position.x = 2 * (xrange) * (Math.random() - 0.5); // Random X position
    mountainMesh.position.y = 0;
    mountainMesh.position.z = distance; // Random Z position
    mountainMesh.scale.set(1.0, (Math.abs(distance) / 100) + 1.0, 1.0); // Scale down the mountains
    scene.add(mountainMesh);
    mountains.push(mountainMesh);
}

// Add a bunch of clouds
for (let i = 0; i < 15; i++) {
    const cloudGroup = createCloudGroup();
    const cloudZ = Math.random() * (cloudDistance[1] - cloudDistance[0]) + cloudDistance[0];
    const xrange = Math.abs(camera.position.z - cloudZ) * Math.tan(75 * Math.PI / 180) - 150;
    cloudGroup.position.x = (xrange) * (Math.random() - 0.5); // Random X position
    cloudGroup.position.y = Math.random() * 80 + 15; // Random Y position
    cloudGroup.position.z = cloudZ;
    scene.add(cloudGroup);
    clouds.push(cloudGroup);
}

// Mouse move handler
function onMouseMove(event) {
    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    mouseToPad(mouse.x, mouse.y);
    
    // Update shader uniform
    skyMaterial.uniforms.u_mouse.value.set(mouse.x, mouse.y);

    // Mouse intersections
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(mountains);
    if (intersects.length > 0) {
        hoveredMountain = intersects[0];
        console.log(`Hovered mountain: ${hoveredMountain.object.name}, Row: ${hoveredMountain.object.userData.row}`);
    } else {
        hoveredMountain = null;
    }
}

window.addEventListener('mousemove', onMouseMove);

// Click handler
window.addEventListener('pointerdown', (event) => {
    resume();
    if (hoveredMountain) {
        const row = hoveredMountain.object.userData.row;
        console.log(`Clicked on mountain at row: ${row}`);
        toggleActiveGenerator(row);
    } else {
           // Convert mouse coordinates to normalized device coordinates (-1 to +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);

        const skyIntersects = raycaster.intersectObject(sky);

        if (skyIntersects.length > 0) {
            const clickPosition = skyIntersects[0].point;
            const flock = spawnBirdsAtPosition(scene, birdFlocks, clickPosition);
            flock.userData.transportIndex = getTransportTime() % 16;
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function handleKeyEvent(event, direction) {
    const homeRow = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'];
    const index = homeRow.indexOf(event.code);
    if (index !== -1) {
        handleKey(0, index, direction);
    }
}

window.addEventListener('keydown', (event) => {
    handleKeyEvent(event, 1);
});

window.addEventListener('keyup', (event) => {
    handleKeyEvent(event, 0);
});

// Start animation
animate();

// Create the synthesizers
createSynthesizers().then(() => {
    subscribeToSynthesizer('drums', (event) => {
        const pitch = event.data[1];
        const velocity = event.data[2];
        const mountainPitches = [38, 36, 40, 41, 43, 45, 47, 48]; // Kick and click pitches
        if (velocity === 0) 
            return; // Ignore note-off events`

        if (mountainPitches.includes(pitch)) {
            const row = mountainPitches.indexOf(pitch);
            mountainSaturation[row] = 1.0; // Set saturation for the corresponding mountain
        }
    });

    subscribeToSynthesizer('transport', (time, nextQuantizedTime) => {
        let events = [];
        birdFlocks.forEach((flock) => {
            if (flock.userData.transportIndex === time % 16) {
                flock.userData.highlight = 1.0; // Highlight the flock
                events.push(...createArpEvents(flock.userData.noteIndex, 65, nextQuantizedTime));
            }
        });
        return events;
    }); 
});
