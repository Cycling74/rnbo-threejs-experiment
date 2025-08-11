import { Drawable } from "./drawable.js";

export class Sun extends Drawable {
    _angle = -90 * Math.PI / 180; // Convert degrees to radians
    _angleTarget = -90 * Math.PI / 180; // Target angle in radians
    _active = false;
    _hovered = false;
    _saturation = 0.0;
    _saturationTarget = 0.0;

    _baseGlowColors = [
        new THREE.Color(0xffeb3b), // Bright yellow
        new THREE.Color(0xffc107), // Light orange
        new THREE.Color(0xff9800), // Orange
        new THREE.Color(0xff6f00)  // Dark orange
    ];

    get active() {
        return this._active;
    }

    get hovered() {
        return this._hovered;
    }

    set active(value) {
        this._active = value;
    }

    set hovered(value) {
        this._hovered = value;
    }

    get position() {
        return this.sunGroup.position;  
    }

    constructor() {
        super();

        this.sunGroup = new THREE.Group();
    
        // Main sun sphere
        const sunGeometry = new THREE.SphereGeometry(15, 16, 16);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        
        // Glow effect using multiple transparent spheres
        const glowLayers = [
            { radius: 18, color: 0xffeb3b, opacity: 0.5 },
            { radius: 22, color: 0xffc107, opacity: 0.4 },
            { radius: 28, color: 0xff9800, opacity: 0.3 },
            { radius: 35, color: 0xff6f00, opacity: 0.2 }
        ];
        
        glowLayers.forEach(layer => {
            const glowGeometry = new THREE.SphereGeometry(layer.radius, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: layer.color,
                transparent: true,
                opacity: layer.opacity,
                side: THREE.BackSide // Render from inside for better glow effect
            });
            const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
            this.sunGroup.add(glowSphere);
        });
        
        // Add the main sun last so it renders on top
        this.sunGroup.add(sun);
        
        // Position the sun in the sky (upper right area)
        this.sunGroup.position.set(
            Math.cos(this._angle) * 350, // X position
            Math.sin(this._angle) * 150, // Y position
            -250 // Z position (negative to place it in front of the camera)
        );
        
        // Store references for animation
        this.sunGroup.userData = {
            type: 'sun',
            mainSun: sun,
            glowLayers: this.sunGroup.children.slice(0, -1), // All but the main sun
            baseIntensity: 1.0,
            time: 0
        };
        
        this.group.add(this.sunGroup);
    }

    animate(deltaTime, camera, scene) {
        this._saturationTarget = (this._active || this._hovered) ? 1.0 : 0.0;
        this._angleTarget = (this._active || this._hovered) ? 70 * Math.PI / 180 : -90 * Math.PI / 180; // Adjust angle based on activity/hover state

        if (!this.sunGroup.userData) return;
    
        this.sunGroup.userData.time += deltaTime;
        
        // Gentle pulsing effect
        const pulseIntensity = 1 + Math.sin(this.sunGroup.userData.time * 0.5) * 0.1;
        
        // Animate the main sun
        this.sunGroup.userData.mainSun.material.opacity = 0.9 + Math.sin(this.sunGroup.userData.time * 0.7) * 0.1;
        
        // Animate glow layers with slight phase differences
        this.sunGroup.userData.glowLayers.forEach((glowLayer, index) => {
            const baseOpacity = [0.3, 0.2, 0.15, 0.1][index];
            const phase = index * 0.3; // Phase offset for each layer
            glowLayer.material.opacity = baseOpacity + Math.sin(this.sunGroup.userData.time * 0.5 + phase) * baseOpacity * 0.3;

            const color = {};
            this._baseGlowColors[index].getHSL(color);
            const sat = THREE.MathUtils.lerp(0, color.s, this._saturation);
            const materialColor = glowLayer.material.color;
            materialColor.setHSL(color.h, sat, color.l);

            // Subtle scale animation
            const scaleVariation = 1 + Math.sin(this.sunGroup.userData.time * 0.3 + phase) * 0.02;
            glowLayer.scale.setScalar(scaleVariation);
        });

        this._saturation += (this._saturationTarget - this._saturation) * 0.05;
        let angleDelta = this._angleTarget - this._angle;
        if (angleDelta < -0.001) {
            angleDelta += 2 * Math.PI; // Wrap around if the angle is negative
        }
        this._angle += (angleDelta) * 0.05;
        if (this._angle > Math.PI) {
            this._angle -= 2 * Math.PI; // Wrap around if the angle exceeds PI
        }
        this.sunGroup.position.set(
            Math.cos(this._angle) * 350, // X position
            Math.sin(this._angle) * 150, // Y position
            -250 // Z position (negative to place it in front of the camera)
        );
    }
}
