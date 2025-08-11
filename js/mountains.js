import { Drawable } from "./drawable.js";
import { MountainGreen, makePalette } from './palette.js';

export class Mountains extends Drawable {
    // Create materials for the mountains
    mountainPalette = makePalette(...MountainGreen);
    mountainStops = 8;
    mountains = [];
    mountainColors = [];
    mountainSaturation = [];
    _hoveredMountain = null;

    get hoveredMountain() {
        return this._hoveredMountain;
    }
    set hoveredMountain(mountain) {
        this._hoveredMountain = mountain;
    }
    
    constructor(camera) {
        super();
        
        for (let i = 0; i < this.mountainStops; i++) {
            const t = i / (this.mountainStops - 1);
            this.mountainColors.push(new THREE.Color(this.mountainPalette(t)));
            this.mountainSaturation.push(0.0);
        }
        
        this.mountainMaterials = [];
        for (let i = 0; i < this.mountainStops; i++) {
            const color = {};
            this.mountainColors[i].getHSL(color);
            const materialColor = new THREE.Color();
            materialColor.setHSL(color.h, this.mountainSaturation[i], color.l);
            this.mountainMaterials.push(new THREE.MeshBasicMaterial({ color: materialColor }));
        }

        this.hoveredMountain = null;

        // Add a bunch of mountains
        for (let i = 0; i < 1000; i++) {
            const t = Math.random(); // Random value for color palette
            const row = Math.floor((1 - t) * this.mountainStops);
            const distance = -180 * Math.pow(t, 1.5) + 0; // Random distance from the origin
            const mountainMaterial = this.mountainMaterials[Math.floor((1 - t) * (this.mountainStops))];
            const mountainMesh = this.createMountainMesh(mountainMaterial, { type: 'mountain', row: row });
            const xrange = Math.abs(camera.position.z - distance) * Math.tan(75 * Math.PI / 180) - 25;
            mountainMesh.position.x = 2 * (xrange) * (Math.random() - 0.5); // Random X position
            mountainMesh.position.y = 0;
            mountainMesh.position.z = distance; // Random Z position
            mountainMesh.scale.set(1.0, (Math.abs(distance) / 100) + 1.0, 1.0); // Scale down the mountains
            this.group.add(mountainMesh);
            this.mountains.push(mountainMesh);
        }
    }

    setSaturation(row, saturation) {
        if (row < 0 || row >= this.mountainStops) {
            console.warn(`Row ${row} is out of bounds for mountain saturation.`);
            return;
        }
        this.mountainSaturation[row] = saturation;
    };

    animate(deltaTime, camera, scene) {
        this.mountainSaturation.forEach((saturation, index) => {
            const color = this.mountainColors[index];
            const currentColor = {};
            color.getHSL(currentColor);
            if (this.hoveredMountain && this.hoveredMountain.userData.row === index) {
                saturation += 0.05; // Increase saturation on hover
            } else if (saturation > 0) {
                saturation -= 0.05;
            }
            saturation = Math.max(0, Math.min(1, saturation)); // Clamp saturation between 0 and 1
            const materialColor = this.mountainMaterials[index].color;
            materialColor.setHSL(currentColor.h, saturation, currentColor.l);
            this.mountainMaterials[index].color.set(materialColor);
            this.mountainSaturation[index] = saturation; // Update saturation
        });
    }

    createMountainMesh(material, userData = {}) {
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

        return mesh;
    }
}