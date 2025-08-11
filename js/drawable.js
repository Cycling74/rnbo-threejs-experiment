export class Drawable {
    constructor() {
        this.group = new THREE.Group();
        this.eventHandlers = {};
    }

    addToScene(scene) {
        scene.add(this.group);
    }

    addEventListener(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    bubbleEvent(event, data) {

        const { mouse, raycaster } = event;
        const intersects = raycaster.intersectObjects(this.group.children, true);
    
        if (intersects.length > 0) {
            const sceneEvent = {
                type: event.type,
                mouse: mouse,
                intersects: intersects,
                position: intersects[0].point
            }

            this.eventHandlers[event.type]?.forEach(handler => handler(sceneEvent));

            return sceneEvent;
        }

        return null;
    }

    animate(deltaTime, camera, scene) {
        // Default implementation does nothing
        // Subclasses can override this method to implement their own animations
    }
}
