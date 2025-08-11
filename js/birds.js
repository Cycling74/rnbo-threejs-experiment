import { Drawable } from './drawable.js';

export class Birds extends Drawable {
    constructor() {
        super();

        this.birdFlocks = [];
    }

    // Bird geometry - simple V shape
    createBirdGeometry() {
        const geometry = new THREE.BufferGeometry();
        
        // Create a simple V shape for the bird
        const vertices = new Float32Array([
            -2, 0, 0,  // left wing tip
            0, 0, 0,  // body center
            2, 0, 0,  // right wing tip
            0, 0, 0,  // body center (duplicate for second line)
            0, 1, 0   // head
        ]);
        
        const indices = [
            0, 1,  // left wing
            1, 2,  // right wing
            3, 4   // neck/head
        ];
        
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        
        return geometry;
    }

    // Create a single bird
    createBird() {
        const birdGeometry = this.createBirdGeometry();
        const birdMaterial = new THREE.LineBasicMaterial({ 
            color: 0x333333,
            linewidth: 2
        });
        
        const bird = new THREE.LineSegments(birdGeometry, birdMaterial);
        
        // Add some flight data
        bird.userData = {
            wingPhase: Math.random() * Math.PI * 2, // Random wing animation offset
            speed: 0.1 + Math.random() * 0.3, // Random speed
            yOffset: Math.random() * 2 - 1, // Random vertical bobbing offset
            originalY: 0, // Will be set when added to flock,
            scale: 5
        };
        
        return bird;
    }

    // Create a flock of birds
    createBirdFlock(position, userData, flockSize = 3) {
        const flock = new THREE.Group();
        
        // Flock movement data
        flock.userData = Object.assign({
            direction: new THREE.Vector3(-1, 0, 0), // Mostly leftward
            speed: 0.1 + Math.random() * 0.1,
            age: 0,
            maxAge: 15 + Math.random() * 10, // Seconds before despawning
            birds: [],
            noteIndex: Math.floor(Math.random() * 8),
            highlight: 1
        }, userData);
        
        // Create birds in a loose formation
        for (let i = 0; i < flockSize; i++) {
            const bird = this.createBird();
            
            // Position birds in a rough V or line formation
            const formationX = (i - flockSize / 2) * (3 + Math.random() * 2) * bird.userData.scale;
            const formationY = Math.abs(i - flockSize / 2) * 0.5 + (Math.random() - 0.5) * 2 * bird.userData.scale;
            const formationZ = 0;
            
            bird.position.set(formationX, formationY, formationZ);
            bird.userData.originalY = bird.position.y;
            
            flock.add(bird);
            flock.userData.birds.push(bird);
        }
        
        // Position the flock
        flock.position.copy(position);

        return flock;
    }

    animate(deltaTime, camera, scene) {
        this.birdFlocks.forEach((flock, flockIndex) => {
            // Age the flock
            flock.userData.age += deltaTime;
            
            // Remove old flocks
            if (flock.userData.age > flock.userData.maxAge) {
                this.group.remove(flock);
                this.birdFlocks.splice(flockIndex, 1);
                return;
            }
            
            // Move the flock
            const movement = flock.userData.direction.clone().multiplyScalar(flock.userData.speed);
            flock.position.add(movement);

            flock.userData.highlight -= 0.05;
            flock.userData.highlight = Math.max(0, flock.userData.highlight);
            
            // Animate individual birds
            flock.userData.birds.forEach(bird => {
                // Wing flapping animation (subtle scale change)
                bird.userData.wingPhase += deltaTime * 8; // Wing flap speed
                const wingScale = 1 + Math.sin(bird.userData.wingPhase) * 0.2;
                const scale = bird.userData.scale + flock.userData.highlight * 10;
                bird.scale.set(wingScale + scale, -scale, scale);
                
                // Vertical bobbing
                const bobbing = Math.sin(bird.userData.wingPhase * 0.7) * 0.5;
                bird.position.y = bird.userData.originalY + bobbing + bird.userData.yOffset;
                
                // Slight rotation for banking
                bird.rotation.z = Math.sin(bird.userData.wingPhase * 0.3) * 0.1;
            });
            
            // Optional: Add some flock cohesion behavior
            const centeringForce = 0.001;
            flock.userData.birds.forEach(bird => {
                const centerOffset = bird.position.clone().multiplyScalar(-centeringForce);
                bird.position.add(centerOffset);
            });
        });
    }

    // Spawn birds at a world position
    spawnBirdsAtPosition(scene, worldPosition, userData) {
        console.log(`Spawning birds at:`, worldPosition);
        
        // Create the flock slightly in front of the click position
        const spawnPosition = worldPosition.clone();
        spawnPosition.z += 10; // Start further away
        
        const flock = this.createBirdFlock(spawnPosition, userData);
        this.group.add(flock);
        this.birdFlocks.push(flock);
        
        console.log(`Created flock with ${flock.userData.birds.length} birds`);

        return flock;
    }
}
