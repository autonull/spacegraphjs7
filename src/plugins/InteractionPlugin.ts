import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class InteractionPlugin implements ISpaceGraphPlugin {
    readonly id = 'interaction';
    readonly name = 'Interaction Controls';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private pointerDownPosition = new THREE.Vector2();

    // Dragging State Tracking
    private isDragging = false;
    private dragNode: any = null;
    private dragPlane = new THREE.Plane();
    private dragOffset = new THREE.Vector3();
    private intersection = new THREE.Vector3();

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this.initDrag();
        this.initClick();
    }

    private initClick(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => {
            this.pointerDownPosition.set(e.clientX, e.clientY);
        });

        canvas.addEventListener('pointerup', (e) => {
            // Only trigger click if the pointer hasn't moved much (not a drag)
            const distance = this.pointerDownPosition.distanceTo(
                new THREE.Vector2(e.clientX, e.clientY),
            );
            if (distance > 5 || this.isDragging) return;

            const rect = canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);

            const meshes = Array.from(this.sg.graph.nodes.values()).flatMap((node) => {
                // Support nested meshes within the node object
                const children: THREE.Object3D[] = [];
                node.object.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) children.push(child);
                });
                return children;
            });

            const intersects = this.raycaster.intersectObjects(meshes, false);

            if (intersects.length > 0) {
                const node = this.getNodeFromMesh(intersects[0].object);
                if (node) {
                    this.sg.events.emit('node:click', { node, event: e });
                }
            } else {
                // Emitted when clicking on empty space
                this.sg.events.emit('graph:click', { event: e });
            }
        });
    }

    private updateMousePosition(e: PointerEvent) {
        const canvas = this.sg.renderer.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    private getIntersectedNode() {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        const meshes = Array.from(this.sg.graph.nodes.values()).flatMap((node) => {
            const children: THREE.Object3D[] = [];
            node.object.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) children.push(child);
            });
            return children;
        });

        const intersects = this.raycaster.intersectObjects(meshes, false);
        if (intersects.length > 0) {
            return { node: this.getNodeFromMesh(intersects[0].object), point: intersects[0].point };
        }
        return null;
    }

    private initDrag(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => {
            this.updateMousePosition(e);
            const hit = this.getIntersectedNode();

            if (hit && hit.node) {
                this.isDragging = true;
                this.dragNode = hit.node;

                // Disable physical constraints temporarily
                this.dragNode.data.pinned = true;

                // Create a mathematical plane facing the camera rooted at the node's current position
                this.dragPlane.setFromNormalAndCoplanarPoint(
                    this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
                    this.dragNode.position,
                );

                // Find intersection offset so the node doesn't snap to the center of the mouse immediately
                if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                    this.dragOffset.copy(this.intersection).sub(this.dragNode.position);
                }

                this.sg.renderer.renderer.domElement.style.cursor = 'grabbing';
                this.sg.events.emit('interaction:dragstart', { node: this.dragNode });
            }
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!this.isDragging || !this.dragNode) return;

            this.updateMousePosition(e);
            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);

            if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
                // Move node to intersection point minus initial grab offset
                const targetPos = this.intersection.clone().sub(this.dragOffset);
                this.dragNode.position.copy(targetPos);
                this.dragNode.object.position.copy(targetPos);

                this.sg.events.emitBatched('interaction:drag', { node: this.dragNode });
            }
        });

        canvas.addEventListener('pointerup', (_e) => {
            if (this.isDragging && this.dragNode) {
                this.dragNode.data.pinned = false; // Allow physics to resume
                this.sg.events.emit('interaction:dragend', { node: this.dragNode });
                this.isDragging = false;
                this.dragNode = null;
                this.sg.renderer.renderer.domElement.style.cursor = 'auto';
            }
        });

        canvas.addEventListener('pointercancel', (_e) => {
            if (this.isDragging && this.dragNode) {
                this.dragNode.data.pinned = false;
                this.sg.events.emit('interaction:dragend', { node: this.dragNode });
                this.isDragging = false;
                this.dragNode = null;
                this.sg.renderer.renderer.domElement.style.cursor = 'auto';
            }
        });
    }

    private getNodeFromMesh(mesh: THREE.Object3D): any {
        // Walk up the hierarchy to find the root node object
        let current = mesh;
        while (current.parent && current.parent !== this.sg.renderer.scene) {
            current = current.parent;
        }

        const nodes = Array.from(this.sg.graph.nodes.values());
        return nodes.find((n) => n.object === current);
    }

    dispose(): void {
        // Event listeners are garbage collected if the DOM element unmounts usually,
        // but explicit removal is best-practice if SpaceGraph instance drops.
        this.isDragging = false;
        this.dragNode = null;
    }
}
