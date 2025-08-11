import { Drawable } from "./drawable.js";
import { skyVertexShader, skyFragmentShader } from './shaders.js';

export class Sky extends Drawable {

    _saturation = 0.0;
    _saturationTarget = 0.0;
    _active = false;
    _hovered = false;
    _season = 0.0;
    _targetSeason = 0.0;
    _sunPosition = new THREE.Vector2(0.0, 0.0);

    _summerColors = [
        {
            uniform: 'u_center_color',
            base: new THREE.Color(0.6, 0.8, 1.0)
        },
        {
            uniform: 'u_middle_color',
            base: new THREE.Color(0.5, 0.7, 1.0)
        },
        {
            uniform: 'u_edge_color',
            base: new THREE.Color(0.2, 0.3, 0.6)
        }
    ];

    _fallColors = [
        {
            uniform: 'u_center_color',
            base: new THREE.Color(1.0, 0.6, 0.4)
        },
        {
            uniform: 'u_middle_color',
            base: new THREE.Color(1.0, 0.5, 0.3)
        },
        {
            uniform: 'u_edge_color',
            base: new THREE.Color(0.6, 0.2, 0.1)
        }
    ];

    get active() {
        return this._active;
    }

    set active(value) {
        this._active = value;
    }

    get hovered() {
        return this._hovered;
    }

    set hovered(value) {
        this._hovered = value;
    }

    get sunPosition() {
        return this._sunPosition;
    }

    set sunPosition(value) {
        if (value instanceof THREE.Vector2) {
            this._sunPosition.copy(value);
        } else if (value instanceof THREE.Vector3) {
            this._sunPosition.set(value.x, value.y);
        } else {
            console.warn('Invalid sun position type. Expected THREE.Vector2 or THREE.Vector3.');
        }
    }

    set season(value) {
        this._targetSeason = THREE.MathUtils.clamp(value, 0.0, 1.0);
    }

    constructor() {
        super();

        this.skyGeometry = new THREE.PlaneGeometry(1000, 1000);
        this.skyMaterial = new THREE.ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            uniforms: {
                u_mouse: { value: new THREE.Vector2(0.0, 0.0) },
                u_time: { value: 0.0 },
                u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                u_center_color: { value: new THREE.Color(0.6, 0.8, 1.0) },
                u_middle_color: { value: new THREE.Color(0.5, 0.7, 1.0) },
                u_edge_color: { value: new THREE.Color(0.2, 0.3, 0.6) }
            },
            side: THREE.DoubleSide
        });
        this.sky = new THREE.Mesh(this.skyGeometry, this.skyMaterial);
        this.sky.userData = { type: 'sky' };
        this.sky.position.z = -300; // Position it way in the background
        this.group.add(this.sky);
    }

    animate(deltaTime, camera, scene) {

        this._saturationTarget = (this._active || this._hovered) ? 1.0 : 0.0;

        // Update shader uniforms
        this.sky.material.uniforms.u_mouse.value.set(this._sunPosition.x, this._sunPosition.y);
        this.sky.material.uniforms.u_time.value += deltaTime;
        this.sky.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);

        this._summerColors.forEach((colorInfo, index) => {
            const { uniform, base } = colorInfo;
            const interpColor = base.clone().lerp(this._fallColors[index].base, this._season);
            const hsl = {};
            interpColor.getHSL(hsl);
            const sat = THREE.MathUtils.lerp(0, hsl.s, this._saturation);
            interpColor.setHSL(hsl.h, sat, hsl.l);
            this.sky.material.uniforms[uniform].value = interpColor;
        });

        this._saturation += (this._saturationTarget - this._saturation) * 0.05;
        this._season += (this._targetSeason - this._season) * 0.03;
    }
}
