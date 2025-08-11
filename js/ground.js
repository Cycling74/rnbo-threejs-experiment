import { Drawable } from "./drawable.js";

export class Ground extends Drawable {

    _active = false;
    _hovered = false;
    _saturation = 0.0;
    _saturationTarget = 0.0;
    _baseGroundColor = new THREE.Color(0x228B22); // ForestGreen
    _groundColor = this._baseGroundColor.clone();

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

    constructor(cameraDistance = 300) {
        super();

        this.groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        this.groundMaterial = new THREE.MeshBasicMaterial({ color: this._groundColor, side: THREE.DoubleSide });
        this.ground = new THREE.Mesh(this.groundGeometry, this.groundMaterial);
        this.ground.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
        this.ground.position.z = -cameraDistance; // Position it behind the camera
        this.ground.userData = { type: 'ground' };
        this.group.add(this.ground);
    }

    addToScene(scene) {
        super.addToScene(scene);
    }

    animate(deltaTime, camera, scene) {
        this._saturationTarget = (this._active || this._hovered) ? 1.0 : 0.0;

        this._saturation += (this._saturationTarget - this._saturation) * 0.05;
        const color = {};
        this._baseGroundColor.getHSL(color);
        this._groundColor.setHSL(color.h, this._saturation, color.l);
        this.groundMaterial.color.set(this._groundColor);
    }
}