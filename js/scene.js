import { start, stop, getActive, createSynthesizers, mouseToPad, subscribeToSynthesizer, handleKey, toggleActiveGenerator, getTransportTime, createArpEvents } from './synthesizers.js';
import { Birds } from './birds.js';
import { Clouds } from './clouds.js';
import { Ground } from './ground.js';
import { Mountains } from './mountains.js';
import { Sky } from './sky.js';
import { Sun } from './sun.js';

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

// Position camera
camera.position.y = 20;
camera.position.z = cameraDistance;

const drawables = [];

const sky = new Sky();
sky.addToScene(scene);
drawables.push(sky);

const ground = new Ground(cameraDistance);
ground.addToScene(scene);
drawables.push(ground);

const clouds = new Clouds(camera);
clouds.addToScene(scene);
drawables.push(clouds);

const sun = new Sun();
sun.addToScene(scene);
drawables.push(sun);

const mountains = new Mountains(camera);
mountains.addToScene(scene);
drawables.push(mountains);

const birds = new Birds();
birds.addToScene(scene);
drawables.push(birds);

ground.addEventListener('pointermove', (event) => {
    ground.hovered = true;
});

mountains.addEventListener('pointermove', (event) => {
    const { mouse, intersects } = event;
    if (intersects.length > 0) {
        const mountain = intersects[0].object;
        mountains.hoveredMountain = mountain;
    }
});

mountains.addEventListener('pointerdown', (event) => {
    const { mouse, intersects } = event;
    if (intersects.length > 0) {
        const mountain = intersects[0].object;
        const row = mountain.userData.row;
        toggleActiveGenerator(row);
    }
});

sky.addEventListener('pointermove', (event) => {
    sky.hovered = true;
});

sky.addEventListener('pointerdown', (event) => {
    const { position } = event;
    const userData = {
        transportIndex: getTransportTime() % 16,
    }

    if (getActive()) {
        const flock = birds.spawnBirdsAtPosition(scene, position, userData);
    }
});

sun.addEventListener('pointerdown', (event) => {
    stop();
});
    

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Calculate delta time for smooth animation
    const currentTime = performance.now() * 0.001;
    const deltaTime = currentTime - (animate.lastTime || currentTime);
    animate.lastTime = currentTime;

    drawables.forEach((drawable) => {
        drawable.animate(deltaTime, camera, scene);
    });

    const scale = sun.position.y > 0 ? 0.001 : (Math.pow(Math.abs(sun.position.y / 50), 2) + 1) * 0.001;

    sky.sunPosition = sun.position.clone().multiplyScalar(scale); // Update sky sun position

    renderer.render(scene, camera);
}

// Mouse move handler
window.addEventListener('pointermove', (event) => {
    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    mouseToPad(mouse.x, mouse.y);
    
    // Update shader uniform
    // skyMaterial.uniforms.u_mouse.value.set(mouse.x, mouse.y);

    // Mouse intersections
    raycaster.setFromCamera(mouse, camera);

    let handlingEvent = null;

    drawables.slice().reverse().forEach((drawable) => {
        if (handlingEvent) return; // Stop if an event has already been handled
        const event = drawable.bubbleEvent({
            type: 'pointermove',
            mouse,
            raycaster
        });
        if (event) {
            handlingEvent = event;
        }
    });

    if (!handlingEvent || handlingEvent?.intersects[0]?.object?.userData?.type !== 'mountain') {
        mountains.hoveredMountain = null; // Reset hovered mountain if not hovering
    }

    if (!handlingEvent || handlingEvent?.intersects[0]?.object?.userData?.type !== 'sky') {
        sky.hovered = false; // Reset sky hover state if not hovering
    }

    if (!handlingEvent || handlingEvent?.intersects[0]?.object?.userData?.type !== 'ground') {
        ground.hovered = false; // Reset ground hover state if not hovering
    }

        if (!handlingEvent || handlingEvent?.intersects[0]?.object?.userData?.type !== 'sun') {
        sun.hovered = false; // Reset sun hover state if not hovering
    }
});

// Click handler
window.addEventListener('pointerdown', async (event) => {
    // Convert mouse coordinates to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    let handlingEvent = null;

    if (getActive()) {
        drawables.slice().reverse().forEach((drawable) => {
            if (handlingEvent) return; // Stop if an event has already been handled
            const event = drawable.bubbleEvent({
                type: 'pointerdown',
                mouse,
                raycaster
            });
            if (event) {
                handlingEvent = event;
            }
        });
    }

    if (!handlingEvent) {
        await start();  
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

// window.addEventListener('keydown', (event) => {
//     handleKeyEvent(event, 1);
// });

// window.addEventListener('keyup', (event) => {
//     handleKeyEvent(event, 0);
// });

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
            mountains.setSaturation(row, 1.0); // Set saturation for the corresponding mountain
        }
    });
});

subscribeToSynthesizer('transport', (time, nextQuantizedTime) => {
    let events = [];
    // birdFlocks.forEach((flock) => {
    //     if (flock.userData.transportIndex === time % 16) {
    //         flock.userData.highlight = 1.0; // Highlight the flock
    //         events.push(...createArpEvents(flock.userData.noteIndex, 65, nextQuantizedTime));
    //     }
    // });
    return events;
}); 

subscribeToSynthesizer('state', (state) => {
    if (state) {
        sun.active = true;
        ground.active = true;
        sky.active = true;
    } else {
        sun.active = false;
        ground.active = false;
        sky.active = false;
    }
});
