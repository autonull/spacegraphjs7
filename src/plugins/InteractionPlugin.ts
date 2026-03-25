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

    // Resize State Tracking
    private isResizing = false;
    private resizedNode: any = null;
    private resizeStartPointerPos = { x: 0, y: 0 };
    private resizeStartNodeSize = { width: 0, height: 0 };
    private resizeNodeScreenScaleX = 1;
    private resizeNodeScreenScaleY = 1;

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

            const distance = this.pointerDownPosition.distanceTo(
                new THREE.Vector2(e.clientX, e.clientY),
            );
            if (distance > 5) return;

            const ndc = this.getMouseNDC(e);
            this.mouse.copy(ndc);
            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
            this.raycaster.params.Line = { threshold: 5 };

            const lineObjects = this.getEdgeObjects();
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find((edge) => edge.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:contextmenu', { edge, event: e });
                    return;
                }
            }

            const meshes = this.getAllNodeMeshes();
            const intersects = this.raycaster.intersectObjects(meshes, false);

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
            zIndex: '9999',
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
            const ndc = this.getMouseNDC(e);
            this.mouse.copy(ndc);
            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
            this.raycaster.params.Line = { threshold: 5 };

            const lineObjects = this.getEdgeObjects();
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find((e) => e.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:dblclick', { edge, event: e });
                    this.handleZoomNavigation(edge.target, `edge:${edge.id}`);
                    return;
                }
            }

            const meshes = this.getAllNodeMeshes();
            const nodeIntersects = this.raycaster.intersectObjects(meshes, false);

            if (nodeIntersects.length > 0) {
                const node = this.getNodeFromMesh(nodeIntersects[0].object);
                if (node) {
                    this.sg.events.emit('node:dblclick', { node, event: e });
                    this.handleZoomNavigation(node, node.id);
                }
            }
        });
    }

    private handleZoomNavigation(targetNode: any, zoomId: string): void {
        if (!targetNode || !this.sg.cameraControls) return;

        if (this.lastZoomedId === zoomId && this.sg.cameraControls.hasZoomHistory) {
            this.sg.cameraControls.flyBack();
            this.lastZoomedId = null;
        } else {
            const targetPos = targetNode.position.clone();
            const targetRadius = targetNode.data?.width
                ? Math.max(targetNode.data.width * 1.5, 150)
                : 150;
            this.sg.cameraControls.flyTo(targetPos, targetRadius);
            this.lastZoomedId = zoomId;
        }
    }

    private initClick(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => {
            this.pointerDownPosition.set(e.clientX, e.clientY);
        });

        canvas.addEventListener('pointerup', (e) => {
            const distance = this.pointerDownPosition.distanceTo(
                new THREE.Vector2(e.clientX, e.clientY),
            );
            if (distance > 5 || this.isDragging) return;

            const ndc = this.getMouseNDC(e);
            this.mouse.copy(ndc);
            this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
            this.raycaster.params.Line = { threshold: 5 };

            const lineObjects = this.getEdgeObjects();
            const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);

            if (edgeIntersects.length > 0) {
                const edgeObj = edgeIntersects[0].object;
                const edge = this.sg.graph.edges.find((e) => e.object === edgeObj);
                if (edge) {
                    this.sg.events.emit('edge:click', { edge, event: e });
                    return;
                }
            }

            const meshes = this.getAllNodeMeshes();
            const intersects = this.raycaster.intersectObjects(meshes, false);

            if (intersects.length > 0) {
                const node = this.getNodeFromMesh(intersects[0].object);
                if (node) {
                    this.sg.events.emit('node:click', { node, event: e });
                }
            } else {
                this.sg.events.emit('graph:click', { event: e });
            }
        });
    }

    private getMouseNDC(e: { clientX: number; clientY: number }): THREE.Vector2 {
        const canvas = this.sg.renderer.renderer.domElement;
        const rect = canvas.getBoundingClientRect();
        return new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1,
        );
    }

    private updateMousePosition(e: PointerEvent) {
        const ndc = this.getMouseNDC(e);
        this.mouse.copy(ndc);
    }

    private getIntersectedNode() {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        const meshes = this.getAllNodeMeshes();
        const intersects = this.raycaster.intersectObjects(meshes, false);
        return intersects.length > 0
            ? { node: this.getNodeFromMesh(intersects[0].object), point: intersects[0].point }
            : null;
    }

    private getIntersectedEdge() {
        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);
        this.raycaster.params.Line = { threshold: 5 };
        const lineObjects = this.getEdgeObjects();
        const edgeIntersects = this.raycaster.intersectObjects(lineObjects, false);
        return edgeIntersects.length > 0
            ? {
                  edge: this.sg.graph.edges.find((e) => e.object === edgeIntersects[0].object),
                  point: edgeIntersects[0].point,
              }
            : null;
    }

    private initDragAndSelect(): void {
        const canvas = this.sg.renderer.renderer.domElement;

        canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e, canvas));
        canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e, canvas));
        canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const activeEl = document.activeElement;
        const isEditingText =
            activeEl &&
            (activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable);

        if (isEditingText && e.key !== 'Escape') return;

        const selectedNodesArray = Array.from(this.selectedNodes);
        const selectedEdgesArray = Array.from(this.selectedEdges);
        const primarySelectedNode = selectedNodesArray.length > 0 ? selectedNodesArray[0] : null;

        switch (e.key) {
            case 'Escape':
                if (this.isConnecting) {
                    this.cancelConnectMode();
                } else {
                    this.selectedNodes.clear();
                    this.selectedEdges.clear();
                    this.sg.events.emit('selection:changed', {
                        nodes: this.selectedNodes,
                        edges: this.selectedEdges,
                    });
                }
                break;

            case 'Delete':
            case 'Backspace':
                if (primarySelectedNode) {
                    const message =
                        selectedNodesArray.length > 1
                            ? `Delete ${selectedNodesArray.length} selected nodes?`
                            : `Delete node "${primarySelectedNode.id.substring(0, 10)}..."?`;

                    this.sg.events.emit('ui:request:confirm', {
                        message: message,
                        onConfirm: () => {
                            selectedNodesArray.forEach((node) => {
                                this.sg.events.emit('node:delete', { node });
                            });
                            this.selectedNodes.clear();
                        },
                    });
                } else if (selectedEdgesArray.length > 0) {
                    const message =
                        selectedEdgesArray.length > 1
                            ? `Delete ${selectedEdgesArray.length} selected edges?`
                            : `Delete edge?`;

                    this.sg.events.emit('ui:request:confirm', {
                        message: message,
                        onConfirm: () => {
                            selectedEdgesArray.forEach((edge) => {
                                this.sg.graph.edges = this.sg.graph.edges.filter((e) => e !== edge);
                            });
                            this.selectedEdges.clear();
                        },
                    });
                }
                break;

            case 'Enter':
                if (primarySelectedNode?.domElement?.querySelector) {
                    const editableContent = primarySelectedNode.domElement.querySelector(
                        '[contenteditable="true"]',
                    );
                    if (editableContent) {
                        (editableContent as HTMLElement).focus();
                    }
                }
                break;

            case ' ':
                e.preventDefault();
                if (primarySelectedNode) {
                    const targetPos = primarySelectedNode.position.clone();
                    const targetRadius = primarySelectedNode.data?.width
                        ? Math.max(primarySelectedNode.data.width * 1.5, 150)
                        : 150;
                    this.sg.cameraControls.flyTo(targetPos, targetRadius, 0.5);
                } else {
                    this.sg.fitView();
                }
                break;

            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.sg.graph.nodes.forEach((node) => this.selectedNodes.add(node));
                    this.sg.events.emit('selection:changed', {
                        nodes: this.selectedNodes,
                        edges: this.selectedEdges,
                    });
                }
                break;
        }
    }

    private handlePointerDown(e: PointerEvent, canvas: HTMLCanvasElement): void {
        this.updateMousePosition(e);

        // Check for resize handle on HtmlNode
        const target = e.target as HTMLElement;
        const resizeHandle = target?.closest('.resize-handle');

        if (resizeHandle) {
            const nodeElement = resizeHandle.closest('.node-common') as HTMLElement | null;
            if (nodeElement) {
                const nodeId = nodeElement.dataset.nodeId;
                const node = this.sg.graph.nodes.get(nodeId || '');
                if (node && typeof (node as any).startResize === 'function') {
                    this.startResize(node, e);
                    return;
                }
            }
        }

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
                height: '0px',
            });
        }
        this.sg.cameraControls.controls.enabled = false;
    }

    private startConnectMode(node: any): void {
        this.isConnecting = true;
        this.connectSourceNode = node;
        this.sg.cameraControls.controls.enabled = false;

        const material = new THREE.LineDashedMaterial({
            color: 0x8b5cf6,
            dashSize: 10,
            gapSize: 5,
            linewidth: 2,
            depthTest: false,
        });
        const points = [node.position.clone(), node.position.clone()];
        this.connectTempLineGeom = new THREE.BufferGeometry().setFromPoints(points);
        this.connectTempLine = new THREE.Line(this.connectTempLineGeom, material);
        this.connectTempLine.computeLineDistances();
        this.connectTempLine.renderOrder = 999;
        this.sg.renderer.scene.add(this.connectTempLine);

        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
            node.position,
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
            this.dragNode.position,
        );

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersection)) {
            this.dragOffset.copy(this.intersection).sub(this.dragNode.position);
        }

        this.nodeDragOffsets.clear();
        for (const n of this.draggingNodes) {
            n.data.pinned = true;
            this.nodeDragOffsets.set(
                n,
                new THREE.Vector3().subVectors(n.position, this.dragNode.position),
            );
            this.sg.events.emit('interaction:dragstart', { node: n });
        }
        this.sg.renderer.renderer.domElement.style.cursor = 'grabbing';
        if (this.dragNode.domElement) this.dragNode.domElement.style.cursor = 'grabbing';
    }

    private startResize(node: any, e: PointerEvent): void {
        this.isResizing = true;
        this.resizedNode = node;
        this.sg.cameraControls.controls.enabled = false;

        this.resizeStartPointerPos = { x: e.clientX, y: e.clientY };
        this.resizeStartNodeSize = { ...(node.size || { width: 200, height: 100 }) };

        const cam = this.sg.renderer?.camera;

        if (node && cam && node.cssObject) {
            const localOrigin = new THREE.Vector3(0, 0, 0);
            const localOffsetX = new THREE.Vector3(1, 0, 0);
            const localOffsetY = new THREE.Vector3(0, 1, 0);

            const worldOrigin = localOrigin.clone().applyMatrix4(node.cssObject.matrixWorld);
            const worldOffsetX = localOffsetX.clone().applyMatrix4(node.cssObject.matrixWorld);
            const worldOffsetY = localOffsetY.clone().applyMatrix4(node.cssObject.matrixWorld);

            const screenOriginNDC = worldOrigin.clone().project(cam);
            const screenOffsetXNDC = worldOffsetX.clone().project(cam);
            const screenOffsetYNDC = worldOffsetY.clone().project(cam);

            const halfW = window.innerWidth / 2;
            const halfH = window.innerHeight / 2;

            const screenOriginPx = {
                x: screenOriginNDC.x * halfW + halfW,
                y: -screenOriginNDC.y * halfH + halfH,
            };
            const screenOffsetXPx = {
                x: screenOffsetXNDC.x * halfW + halfW,
                y: -screenOffsetXNDC.y * halfH + halfH,
            };
            const screenOffsetYPx = {
                x: screenOffsetYNDC.x * halfW + halfH,
                y: -screenOffsetYNDC.y * halfH + halfH,
            };

            this.resizeNodeScreenScaleX = Math.abs(screenOffsetXPx.x - screenOriginPx.x);
            this.resizeNodeScreenScaleY = Math.abs(screenOffsetYPx.y - screenOriginPx.y);

            if (this.resizeNodeScreenScaleX < 0.001) this.resizeNodeScreenScaleX = 0.001;
            if (this.resizeNodeScreenScaleY < 0.001) this.resizeNodeScreenScaleY = 0.001;
        } else {
            this.resizeNodeScreenScaleX = 1;
            this.resizeNodeScreenScaleY = 1;
        }

        if (typeof node.startResize === 'function') {
            node.startResize();
        }

        this.sg.renderer.renderer.domElement.style.cursor = 'nwse-resize';
    }

    private handlePointerMove(e: PointerEvent, canvas: HTMLCanvasElement): void {
        this.updateMousePosition(e);

        if (this.isBoxSelecting && this.selectionBoxEl) {
            this.updateBoxSelection(e, canvas);
            return;
        }

        if (
            this.isConnecting &&
            this.connectSourceNode &&
            this.connectTempLineGeom &&
            this.connectTempLine
        ) {
            this.updateConnectMode(e);
            return;
        }

        if (this.isResizing && this.resizedNode) {
            this.updateResize(e);
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
                height: `${height}px`,
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
            if (this.hoveredNode)
                this.sg.events.emit('node:pointerleave', { node: this.hoveredNode, event: e });
            this.hoveredNode = currentNode;
            // Set grab cursor on the node we're entering (in default drag mode only)
            if (this.hoveredNode?.domElement && this.mode === 'default') {
                this.hoveredNode.domElement.style.cursor = 'grab';
            }
            if (this.hoveredNode)
                this.sg.events.emit('node:pointerenter', { node: this.hoveredNode, event: e });
        }

        // Update canvas cursor to reflect hover state
        if (this.mode === 'default') {
            canvas.style.cursor = currentNode ? 'grab' : 'auto';
        }

        if (!currentNode) {
            const edgeHit = this.getIntersectedEdge();
            const currentEdge = edgeHit?.edge || null;

            if (currentEdge !== this.hoveredEdge) {
                if (this.hoveredEdge) {
                    if (typeof this.hoveredEdge.setHoverStyle === 'function') {
                        this.hoveredEdge.setHoverStyle(false);
                    }
                    this.sg.events.emit('edge:pointerleave', { edge: this.hoveredEdge, event: e });
                }
                this.hoveredEdge = currentEdge;
                if (this.hoveredEdge) {
                    if (typeof this.hoveredEdge.setHoverStyle === 'function') {
                        this.hoveredEdge.setHoverStyle(true);
                    }
                    this.sg.events.emit('edge:pointerenter', { edge: this.hoveredEdge, event: e });
                }
            }
        } else if (this.hoveredEdge) {
            if (typeof this.hoveredEdge.setHoverStyle === 'function') {
                this.hoveredEdge.setHoverStyle(false);
            }
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

    private updateResize(e: PointerEvent): void {
        if (!this.resizedNode) return;

        const totalDx_screen = e.clientX - this.resizeStartPointerPos.x;
        const totalDy_screen = e.clientY - this.resizeStartPointerPos.y;

        const deltaWidth_local = totalDx_screen / (this.resizeNodeScreenScaleX || 1);
        const deltaHeight_local = totalDy_screen / (this.resizeNodeScreenScaleY || 1);

        const newWidth = this.resizeStartNodeSize.width + deltaWidth_local;
        const newHeight = this.resizeStartNodeSize.height + deltaHeight_local;

        const MIN_WIDTH = 80;
        const MIN_HEIGHT = 40;

        if (typeof this.resizedNode.resize === 'function') {
            this.resizedNode.resize(Math.max(MIN_WIDTH, newWidth), Math.max(MIN_HEIGHT, newHeight));
        }
    }

    private handlePointerUp(e: PointerEvent): void {
        if (this.isConnecting && this.connectSourceNode) {
            if (this.hoveredNode && this.hoveredNode !== this.connectSourceNode) {
                this.sg.events.emit('interaction:edgecreate', {
                    source: this.connectSourceNode,
                    target: this.hoveredNode,
                    event: e,
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
                edges: Array.from(this.selectedEdges),
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
                releasedNode.domElement.style.cursor =
                    this.hoveredNode === releasedNode ? 'grab' : '';
            }
            this.sg.cameraControls.controls.enabled = true;
        }

        if (this.isResizing && this.resizedNode) {
            if (typeof this.resizedNode.endResize === 'function') {
                this.resizedNode.endResize();
            }
            this.isResizing = false;
            this.resizedNode = null;
            this.sg.renderer.renderer.domElement.style.cursor = 'auto';
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

        if (
            this.hoveredNode &&
            this.hoveredNode.object &&
            this.hoveredNode !== this.connectSourceNode
        ) {
            this.hoveredNode.object.scale.set(1, 1, 1); // Reset visual pop
        }

        this.isConnecting = false;
        this.connectSourceNode = null;
        this.sg.renderer.renderer.domElement.style.cursor = 'auto';
        this.sg.cameraControls.controls.enabled = true;
    }

    private updateSelectionBox(
        left: number,
        top: number,
        width: number,
        height: number,
        canvas: HTMLCanvasElement,
    ) {
        const rect = canvas.getBoundingClientRect();

        // Convert screen coordinates to NDC space for frustum testing
        const minX = ((left - rect.left) / rect.width) * 2 - 1;
        const maxX = ((left + width - rect.left) / rect.width) * 2 - 1;
        // Invert Y for NDC
        const minY = -((top + height - rect.top) / rect.height) * 2 + 1;
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

            if (
                midPoint.x >= minX &&
                midPoint.x <= maxX &&
                midPoint.y >= minY &&
                midPoint.y <= maxY &&
                midPoint.z <= 1
            ) {
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
