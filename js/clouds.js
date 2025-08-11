import { Drawable } from "./drawable.js";

const cloudDistance = [-200, -50];
let clouds = [];

export class Clouds extends Drawable {

    cloudGeometry = new THREE.SphereGeometry(1, 32, 32);
    cloudMaterials = [
        new THREE.MeshBasicMaterial({ color: 0xcdcdcd, transparent: true, opacity: 0.8 }),
        new THREE.MeshBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.8 }),
        new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.8 })
    ];
    cloudDistance = [-200, -50];

    constructor(camera, cloudCount = 20) {
        super();
        this.clouds = [];

        for (let i = 0; i < cloudCount; i++) {
            const cloudGroup = this.createCloudGroup();
            const cloudZ = Math.random() * (cloudDistance[1] - cloudDistance[0]) + cloudDistance[0];
            const xrange = Math.abs(camera.position.z - cloudZ) * Math.tan(75 * Math.PI / 180) - 150;
            cloudGroup.position.x = (xrange) * (Math.random() - 0.5); // Random X position
            cloudGroup.position.y = Math.random() * 80 + 15; // Random Y position
            cloudGroup.position.z = cloudZ;
            this.group.add(cloudGroup);
            this.clouds.push(cloudGroup);
        }
    }

    animate(deltaTime, camera, scene) {
        const newClouds = [];

        this.clouds.forEach((cloudGroup) => {
            // slowly drift the clouds off to the left
            cloudGroup.position.x -= 0.02;
            const xrange = Math.abs(camera.position.z - cloudGroup.position.z) * Math.tan(75 * Math.PI / 180) - 150;
            let offscreenX = -xrange; // Offscreen position to the left
    
            // if the cloud is too far left, remove it from the scene and spawn a new cloud group
            if (cloudGroup.position.x < offscreenX) {
                const newCloudGroup = this.createCloudGroup();
                newCloudGroup.position.x = (xrange) * (Math.random() - 0.5) + xrange; // Random X position, but offscreen
                newCloudGroup.position.y = Math.random() * 80 + 15; // Random Y position
                newCloudGroup.position.z = Math.random() * (cloudDistance[1] - cloudDistance[0]) + cloudDistance[0];
                scene.add(newCloudGroup);
                scene.remove(cloudGroup);
                newClouds.push(newCloudGroup);
            }
        });

        this.clouds.push(...newClouds);
        this.clouds = this.clouds.filter((cloudGroup) => {
            const xrange = Math.abs(camera.position.z - cloudGroup.position.z) * Math.tan(75 * Math.PI / 180) - 150;
            let offscreenX = -xrange; // Offscreen position to the left
            return cloudGroup.position.x > offscreenX; // Keep only clouds that are still visible
        });
    }

    createCloudGroup() {
        const group = new THREE.Group();
        const cloudCount = 1; // Number of clouds in the group
        const cloudSpacing = 3; // Spacing between clouds
        const widthRange = 5; // Width range for clouds
        const cloudScale = 10.0;
        const cloudMaterial = this.cloudMaterials[Math.floor(Math.random() * this.cloudMaterials.length)];

        for (let i = 0; i < cloudCount; i++) {
            const cloudlet = new THREE.Mesh(this.cloudGeometry, cloudMaterial);
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
            cloudlet.userData = { type: 'cloud' };
            group.add(cloudlet);
        }

        return group;
    }
}