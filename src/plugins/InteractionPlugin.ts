import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class InteractionPlugin implements ISpaceGraphPlugin {
    readonly id = 'interaction';
    readonly name = 'Interaction Controls';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private pointerDownPosition = new THREE.Vector2();

    private _mode: 'default' | 'select' | 'connect' = 'default';

    get mode() {
        return this._mode;
    }

    set mode(newMode: 'default' | 'select' | 'connect') {
        this._mode = newMode;
        if (newMode !== 'connect' && this.isConnecting) {
            this.cancelConnectMode();
        }
    }

    // Dragging State Tracking
    private isDragging = false;
    private dragNode: any = null;
    private draggingNodes: Set<any> = new Set();
    private dragPlane = new THREE.Plane();
    private dragOffset = new THREE.Vector3();
    private nodeDragOffsets: Map<any, THREE.Vector3> = new Map();
    private intersection = new THREE.Vector3();

    // Connect Mode State Tracking
    private isConnecting = false;
    private connectSourceNode: any = null;
    private connectTempLine: THREE.Line | null = null;
    private connectTempLineGeom: THREE.BufferGeometry | null = null;

    // Box Selection State
    private isBoxSelecting = false;
    private selectionBoxEl: HTMLElement | null = null;
    private selectionStart = new THREE.Vector2();
    private selectedNodes: Set<any> = new Set();
    private selectedEdges: Set<any> = new Set();

    // Hover Tracking
    private hoveredNode: any = null;
    private hoveredEdge: any = null;

    // Zoom stack: track last double-clicked target to enable undo-zoom
    private lastZoomedId: string | null = null;

    init(sg: SpaceGraph): void {
        this.sg = sg;
        this.createSelectionBoxElement();
        this.initDragAndSelect();
        this.initClick();
        this.initDblClick();
        this.initContextMenu();
    }

    private initContextMenu(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            // Only trigger node context menu if right-clicking without significant dragging
            // Handled similarly to left click
            const distance = this.pointerDownPosition.distanceTo(
                new THREE.Vector2(e.clientX, e.clientY)
            );
            if (distance > 5) return;

            const rect = canvas.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
            const meshes = this.getAllNodeMeshes();
            const intersects = this.raycaster.intersectObjects(meshes, false);

            // Check edges
            this.raycaster.params.Line = { threshold: 5 };
            const lineObjects = this.getEdgeObjects();
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find(edge => edge.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:contextmenu', { edge, event: e });
                    return;
                }
            }

            if (intersects.length > 0) {
                const node = this.getNodeFromMesh(intersects[0].object);
                if (node) {
                    this.sg.events.emit('node:contextmenu', { node, event: e });
                }
            } else {
                this.sg.events.emit('graph:contextmenu', { event: e });
            }
        });
    }

    private createSelectionBoxElement() {
        if (typeof document === 'undefined') return;
        this.selectionBoxEl = DOMUtils.createElement('div');
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

    // Helper to get all current edge objects to avoid recreation and map/filter on every event
    private getEdgeObjects(): THREE.Object3D[] {
        const lineObjects: THREE.Object3D[] = [];
        for (const edge of this.sg.graph.edges) {
            if (edge.object) lineObjects.push(edge.object);
        }
        return lineObjects;
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
            const lineObjects = this.getEdgeObjects();
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find(e => e.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:dblclick', { edge, event: e });

                    // Semantic navigation: fly to the target node (or undo if already zoomed there)
                    if (edge.target && this.sg.cameraControls) {
                        const zoomId = `edge:${edge.id}`;
                        if (this.lastZoomedId === zoomId && this.sg.cameraControls.hasZoomHistory) {
                            this.sg.cameraControls.flyBack();
                            this.lastZoomedId = null;
                        } else {
                            const targetPos = edge.target.position.clone();
                            const targetRadius = edge.target.data?.width ? Math.max(edge.target.data.width * 1.5, 150) : 150;
                            this.sg.cameraControls.flyTo(targetPos, targetRadius);
                            this.lastZoomedId = zoomId;
                        }
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

                    // Semantic navigation: fly to node, or undo zoom if already zoomed to this node
                    if (this.sg.cameraControls) {
                        if (this.lastZoomedId === node.id && this.sg.cameraControls.hasZoomHistory) {
                            this.sg.cameraControls.flyBack();
                            this.lastZoomedId = null;
                        } else {
                            const targetPos = node.position.clone();
                            const targetRadius = node.data?.width ? Math.max(node.data.width * 1.5, 150) : 150;
                            this.sg.cameraControls.flyTo(targetPos, targetRadius);
                            this.lastZoomedId = node.id;
                        }
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

            // Check edges first using simple map over current edges
            this.raycaster.params.Line = { threshold: 5 };
            const lineObjects = this.getEdgeObjects();
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find(e => e.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:click', { edge, event: e });
                    return;
                }
            }

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

    private getIntersectedEdge() {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        this.raycaster.params.Line = { threshold: 5 };
        const lineObjects = this.getEdgeObjects();
        const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);
        if (edgeIntersects.length > 0) {
            const edgeObj = edgeIntersects[0].object;
            const edge = this.sg.graph.edges.find(e => e.object === edgeObj);
            return { edge, point: edgeIntersects[0].point };
        }
        return null;
    }

    private initDragAndSelect(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e, canvas));
        canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e, canvas));
        canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isConnecting) this.cancelConnectMode();
            });
        }
    }

    private handlePointerDown(e: PointerEvent, canvas: HTMLCanvasElement): void {
        this.updateMousePosition(e);
        const hit = this.getIntersectedNode();

        if (e.shiftKey || this.mode === 'select') {
            this.startBoxSelection(e);
            return;
        }

        if ((this.mode === 'connect' || e.altKey) && hit?.node) {
            this.startConnectMode(hit.node);
            return;
        }

        if (hit?.node && this.mode === 'default') {
            this.startDrag(hit.node);
        }
    }

    private startBoxSelection(e: PointerEvent): void {
        this.isBoxSelecting = true;
        this.selectionStart.set(e.clientX, e.clientY);
        this.selectedNodes.clear();
        this.selectedEdges.clear();

        if (this.selectionBoxEl) {
            Object.assign(this.selectionBoxEl.style, {
                display: 'block',
                left: `${e.clientX}px`,
                top: `${e.clientY}px`,
                width: '0px',
                height: '0px'
            });
        }
        this.sg.cameraControls.controls.enabled = false;
    }

    private startConnectMode(node: any): void {
        this.isConnecting = true;
        this.connectSourceNode = node;
        this.sg.cameraControls.controls.enabled = false;

        const material = new THREE.LineDashedMaterial({ color: 0x8b5cf6, dashSize: 10, gapSize: 5, linewidth: 2, depthTest: false });
        const points = [node.position.clone(), node.position.clone()];
        this.connectTempLineGeom = new THREE.BufferGeometry().setFromPoints(points);
        this.connectTempLine = new THREE.Line(this.connectTempLineGeom, material);
        this.connectTempLine.computeLineDistances();
        this.connectTempLine.renderOrder = 999;
        this.sg.renderer.scene.add(this.connectTempLine);

        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
            node.position
        );

        this.sg.renderer.renderer.domElement.style.cursor = 'crosshair';
    }

    private startDrag(node: any): void {
        this.isDragging = true;
        this.dragNode = node;
        this.sg.cameraControls.controls.enabled = false;

        this.draggingNodes = this.selectedNodes.has(this.dragNode)
            ? new Set(this.selectedNodes)
            : new Set([this.dragNode]);
        if (!this.selectedNodes.has(this.dragNode)) this.selectedNodes.clear();

        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
            this.dragNode.position
        );

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
            this.dragOffset.copy(this.intersection).sub(this.dragNode.position);
        }

        this.nodeDragOffsets.clear();
        for (const n of this.draggingNodes) {
            n.data.pinned = true;
            this.nodeDragOffsets.set(n, new THREE.Vector3().subVectors(n.position, this.dragNode.position));
            this.sg.events.emit('interaction:dragstart', { node: n });
        }
        this.sg.renderer.renderer.domElement.style.cursor = 'grabbing';
        if (this.dragNode.domElement) this.dragNode.domElement.style.cursor = 'grabbing';
    }

    private handlePointerMove(e: PointerEvent, canvas: HTMLCanvasElement): void {
        this.updateMousePosition(e);

        if (this.isBoxSelecting && this.selectionBoxEl) {
            this.updateBoxSelection(e, canvas);
            return;
        }

        if (this.isConnecting && this.connectSourceNode && this.connectTempLineGeom && this.connectTempLine) {
            this.updateConnectMode(e);
            return;
        }

        if (!this.isDragging || !this.dragNode) {
            this.updateHoverStates(e);
            return;
        }

        this.updateDrag();
    }

    private updateBoxSelection(e: PointerEvent, canvas: HTMLCanvasElement): void {
        const left = Math.min(this.selectionStart.x, e.clientX);
        const top = Math.min(this.selectionStart.y, e.clientY);
        const width = Math.abs(e.clientX - this.selectionStart.x);
        const height = Math.abs(e.clientY - this.selectionStart.y);

        if (this.selectionBoxEl) {
            Object.assign(this.selectionBoxEl.style, {
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`
            });
        }
        this.updateSelectionBox(left, top, width, height, canvas);
    }

    private updateConnectMode(e: PointerEvent): void {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
            const positions = this.connectTempLineGeom!.attributes.position.array as Float32Array;
            positions[3] = this.intersection.x;
            positions[4] = this.intersection.y;
            positions[5] = this.intersection.z;
            this.connectTempLineGeom!.attributes.position.needsUpdate = true;
            this.connectTempLine!.computeLineDistances();

            const hit = this.getIntersectedNode();
            const currentNode = hit?.node || null;
            if (currentNode !== this.hoveredNode) {
                if (this.hoveredNode) {
                    this.sg.events.emit('node:pointerleave', { node: this.hoveredNode, event: e });
                    if (this.hoveredNode.object && this.hoveredNode !== this.connectSourceNode) {
                        this.hoveredNode.object.scale.set(1, 1, 1);
                    }
                }
                this.hoveredNode = currentNode;
                if (this.hoveredNode) {
                    this.sg.events.emit('node:pointerenter', { node: this.hoveredNode, event: e });
                    if (this.hoveredNode.object && this.hoveredNode !== this.connectSourceNode) {
                        this.hoveredNode.object.scale.set(1.1, 1.1, 1.1);
                    }
                }
            }
        }
    }

    private updateHoverStates(e: PointerEvent): void {
        const hit = this.getIntersectedNode();
        const currentNode = hit?.node || null;
        const canvas = this.sg.renderer.renderer.domElement;

        if (currentNode !== this.hoveredNode) {
            // Clear grab cursor on the node we're leaving
            if (this.hoveredNode?.domElement) {
                this.hoveredNode.domElement.style.cursor = '';
            }
            if (this.hoveredNode) this.sg.events.emit('node:pointerleave', { node: this.hoveredNode, event: e });
            this.hoveredNode = currentNode;
            // Set grab cursor on the node we're entering (in default drag mode only)
            if (this.hoveredNode?.domElement && this.mode === 'default') {
                this.hoveredNode.domElement.style.cursor = 'grab';
            }
            if (this.hoveredNode) this.sg.events.emit('node:pointerenter', { node: this.hoveredNode, event: e });
        }

        // Update canvas cursor to reflect hover state
        if (this.mode === 'default') {
            canvas.style.cursor = currentNode ? 'grab' : 'auto';
        }

        if (!currentNode) {
            const edgeHit = this.getIntersectedEdge();
            const currentEdge = edgeHit?.edge || null;

            if (currentEdge !== this.hoveredEdge) {
                if (this.hoveredEdge) this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge, event: e });
                this.hoveredEdge = currentEdge;
                if (this.hoveredEdge) this.sg.events.emit('edge:pointerenter', { edge: this.hoveredEdge, event: e });
            }
        } else if (this.hoveredEdge) {
            this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge, event: e });
            this.hoveredEdge = null;
        }
    }

    private updateDrag(): void {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
            const primaryTargetPos = this.intersection.clone().sub(this.dragOffset);
            for (const node of this.draggingNodes) {
                const relativeOffset = this.nodeDragOffsets.get(node) || new THREE.Vector3();
                const targetPos = primaryTargetPos.clone().add(relativeOffset);
                node.position.copy(targetPos);
                node.object.position.copy(targetPos);
                this.sg.events.emitBatched('interaction:drag', { node });
            }
        }
    }

    private handlePointerUp(e: PointerEvent): void {
        if (this.isConnecting && this.connectSourceNode) {
            if (this.hoveredNode && this.hoveredNode !== this.connectSourceNode) {
                this.sg.events.emit('interaction:edgecreate', {
                    source: this.connectSourceNode,
                    target: this.hoveredNode,
                    event: e
                });
            }
            this.cancelConnectMode();
        }

        if (this.isBoxSelecting) {
            this.isBoxSelecting = false;
            if (this.selectionBoxEl) this.selectionBoxEl.style.display = 'none';
            this.sg.cameraControls.controls.enabled = true;
            this.sg.events.emit('interaction:selection', {
                nodes: Array.from(this.selectedNodes),
                edges: Array.from(this.selectedEdges)
            });
        }

        if (this.isDragging && this.dragNode) {
            const releasedNode = this.dragNode;
            for (const node of this.draggingNodes) {
                node.data.pinned = false;
                this.sg.events.emit('interaction:dragend', { node });
            }
            this.isDragging = false;
            this.dragNode = null;
            this.draggingNodes.clear();
            this.nodeDragOffsets.clear();
            this.sg.renderer.renderer.domElement.style.cursor = this.hoveredNode ? 'grab' : 'auto';
            // Restore grab cursor on domElement if still hovering it, else clear
            if (releasedNode.domElement) {
                releasedNode.domElement.style.cursor = (this.hoveredNode === releasedNode) ? 'grab' : '';
            }
            this.sg.cameraControls.controls.enabled = true;
        }
    }

    private cancelConnectMode() {
        if (this.connectTempLine) {
            this.sg.renderer.scene.remove(this.connectTempLine);
            this.connectTempLine.geometry.dispose();
            (this.connectTempLine.material as THREE.Material).dispose();
            this.connectTempLine = null;
            this.connectTempLineGeom = null;
        }

        if (this.hoveredNode && this.hoveredNode.object && this.hoveredNode !== this.connectSourceNode) {
            this.hoveredNode.object.scale.set(1, 1, 1); // Reset visual pop
        }

        this.isConnecting = false;
        this.connectSourceNode = null;
        this.sg.renderer.renderer.domElement.style.cursor = 'auto';
        this.sg.cameraControls.controls.enabled = true;
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

        // Project edges as well (check midpoint)
        this.selectedEdges.clear();
        const midPoint = new THREE.Vector3();
        for (const edge of this.sg.graph.edges) {
            if (!edge.source || !edge.target) continue;
            midPoint.addVectors(edge.source.position, edge.target.position).multiplyScalar(0.5);
            midPoint.project(this.sg.renderer.camera);

            if (midPoint.x >= minX && midPoint.x <= maxX && midPoint.y >= minY && midPoint.y <= maxY && midPoint.z <= 1) {
                this.selectedEdges.add(edge);
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
        this.draggingNodes.clear();
        this.nodeDragOffsets.clear();
        this.isBoxSelecting = false;
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.isConnecting = false;
        this.connectSourceNode = null;
        if (this.connectTempLine) {
            this.sg.renderer.scene.remove(this.connectTempLine);
        }
        if (this.selectionBoxEl && this.selectionBoxEl.parentElement) {
            this.selectionBoxEl.parentElement.removeChild(this.selectionBoxEl);
        }
    }
}
