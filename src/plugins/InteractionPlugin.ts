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

    // Box Selection State
    private isBoxSelecting = false;
    private selectionBoxEl: HTMLElement | null = null;
    private selectionStart = new THREE.Vector2();
    private selectedNodes: Set<any> = new Set();

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this.createSelectionBoxElement();
        this.initDragAndSelect();
        this.initClick();
        this.initDblClick();
    }

    private createSelectionBoxElement() {
        if (typeof document === 'undefined') return;
        this.selectionBoxEl = document.createElement('div');
        Object.assign(this.selectionBoxEl.style, {
            position: 'absolute',
            border: '1px solid rgba(139, 92, 246, 0.8)',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '9999'
        });

        // Ensure it's attached to the container
        const domElement = this.sg.renderer.renderer.domElement;
        if (domElement.parentElement) {
            domElement.parentElement.style.position = 'relative';
            domElement.parentElement.appendChild(this.selectionBoxEl);
        }
    }

    // Helper to get all current node meshes to avoid recreation on every event
    private getAllNodeMeshes(): THREE.Object3D[] {
        const meshes: THREE.Object3D[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if (node.object) {
                node.object.traverse((child: THREE.Object3D) => {
                    if (child instanceof THREE.Mesh) meshes.push(child);
                });
            }
        }
        return meshes;
    }

    private initDblClick(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('dblclick', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);

            // Allow raycaster to hit lines (edges) with a small threshold
            this.raycaster.params.Line = { threshold: 5 };

            // Check edges first using simple map over current edges
            const lineObjects = this.sg.graph.edges.map(edge => edge.object).filter(Boolean);
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find(e => e.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:dblclick', { edge, event: e });

                    // Semantic navigation: fly to the target node
                    if (edge.target && this.sg.cameraControls) {
                        const targetPos = edge.target.position.clone();
                        // Adjust radius based on node size or a reasonable default
                        const targetRadius = edge.target.data?.width ? Math.max(edge.target.data.width * 1.5, 150) : 150;
                        this.sg.cameraControls.flyTo(targetPos, targetRadius);
                    }
                    return;
                }
            }

            // Check nodes if no edge was double-clicked
            const meshes = this.getAllNodeMeshes();
            const nodeIntersects = this.raycaster.intersectObjects(meshes, false);

            if (nodeIntersects.length > 0) {
                const node = this.getNodeFromMesh(nodeIntersects[0].object);
                if (node) {
                    this.sg.events.emit('node:dblclick', { node, event: e });

                    // Semantic navigation: fly to the node
                    if (this.sg.cameraControls) {
                        const targetPos = node.position.clone();
                        // Adjust radius based on node size or a reasonable default
                        const targetRadius = node.data?.width ? Math.max(node.data.width * 1.5, 150) : 150;
                        this.sg.cameraControls.flyTo(targetPos, targetRadius);
                    }
                }
            }
        });
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

            const meshes = this.getAllNodeMeshes();

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
        const meshes = this.getAllNodeMeshes();

        const intersects = this.raycaster.intersectObjects(meshes, false);
        if (intersects.length > 0) {
            return { node: this.getNodeFromMesh(intersects[0].object), point: intersects[0].point };
        }
        return null;
    }

    private initDragAndSelect(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => {
            this.updateMousePosition(e);
            const hit = this.getIntersectedNode();

            // Shift key pressed => Box selection
            if (e.shiftKey) {
                this.isBoxSelecting = true;
                this.selectionStart.set(e.clientX, e.clientY);
                this.selectedNodes.clear();

                if (this.selectionBoxEl) {
                    this.selectionBoxEl.style.display = 'block';
                    this.selectionBoxEl.style.left = `${e.clientX}px`;
                    this.selectionBoxEl.style.top = `${e.clientY}px`;
                    this.selectionBoxEl.style.width = '0px';
                    this.selectionBoxEl.style.height = '0px';
                }

                this.sg.cameraControls.controls.enabled = false; // Disable orbit while selecting
                return;
            }

            // Normal Drag
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
            if (this.isBoxSelecting && this.selectionBoxEl) {
                const currentX = e.clientX;
                const currentY = e.clientY;

                const left = Math.min(this.selectionStart.x, currentX);
                const top = Math.min(this.selectionStart.y, currentY);
                const width = Math.abs(currentX - this.selectionStart.x);
                const height = Math.abs(currentY - this.selectionStart.y);

                this.selectionBoxEl.style.left = `${left}px`;
                this.selectionBoxEl.style.top = `${top}px`;
                this.selectionBoxEl.style.width = `${width}px`;
                this.selectionBoxEl.style.height = `${height}px`;

                this.updateSelectionBox(left, top, width, height, canvas);
                return;
            }

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

        const endInteraction = () => {
            if (this.isBoxSelecting) {
                this.isBoxSelecting = false;
                if (this.selectionBoxEl) this.selectionBoxEl.style.display = 'none';
                this.sg.cameraControls.controls.enabled = true;

                // Emit selection event
                this.sg.events.emit('interaction:selection', { nodes: Array.from(this.selectedNodes) });
            }

            if (this.isDragging && this.dragNode) {
                this.dragNode.data.pinned = false; // Allow physics to resume
                this.sg.events.emit('interaction:dragend', { node: this.dragNode });
                this.isDragging = false;
                this.dragNode = null;
                this.sg.renderer.renderer.domElement.style.cursor = 'auto';
            }
        };

        canvas.addEventListener('pointerup', endInteraction);
        canvas.addEventListener('pointercancel', endInteraction);
    }

    private updateSelectionBox(left: number, top: number, width: number, height: number, canvas: HTMLCanvasElement) {
        const rect = canvas.getBoundingClientRect();

        // Convert screen coordinates to NDC space for frustum testing
        const minX = ((left - rect.left) / rect.width) * 2 - 1;
        const maxX = (((left + width) - rect.left) / rect.width) * 2 - 1;
        // Invert Y for NDC
        const minY = -(((top + height) - rect.top) / rect.height) * 2 + 1;
        const maxY = -((top - rect.top) / rect.height) * 2 + 1;

        // Build frustum from the current camera to test against nodes
        this.sg.renderer.camera.updateMatrixWorld();

        // Use a simpler approach: project node positions to screen space and check if they fall in the box
        this.selectedNodes.clear();
        const vec = new THREE.Vector3();

        for (const node of this.sg.graph.nodes.values()) {
            vec.copy(node.position);
            vec.project(this.sg.renderer.camera);

            // vec.x and vec.y are now in NDC space [-1, 1]
            if (vec.x >= minX && vec.x <= maxX && vec.y >= minY && vec.y <= maxY && vec.z <= 1) {
                this.selectedNodes.add(node);
            }
        }
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
        this.isBoxSelecting = false;
        this.selectedNodes.clear();
        if (this.selectionBoxEl && this.selectionBoxEl.parentElement) {
            this.selectionBoxEl.parentElement.removeChild(this.selectionBoxEl);
        }
    }
}
