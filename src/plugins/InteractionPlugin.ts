import * as THREE from 'three';
import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import type { Node } from '../nodes/Node';
import { InteractionRaycaster } from './interaction/RaycasterHelper';
import { CursorManager, type CursorMode } from './interaction/CursorManager';
import { HoverManager } from './interaction/HoverManager';
import { SelectionManager } from './interaction/SelectionManager';
import { DragHandler } from './interaction/DragHandler';
import { ConnectionHandler } from './interaction/ConnectionHandler';
import { ResizeHandler } from './interaction/ResizeHandler';
import { KeyboardShortcuts } from './interaction/KeyboardShortcuts';
import { type Pressable, type Zoomable, type PickResult } from '../input/interfaces/Tangible';
import {
    NodeDraggingFingering,
    HoverFingering,
    BoxSelectingFingering,
    ResizeFingering,
    WiringFingering,
    PinchZoomFingering,
    WidgetFingering,
} from '../input/fingerings';

export class InteractionPlugin implements Plugin {
    readonly id = 'interaction';
    readonly name = 'Interaction Controls';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private raycaster!: InteractionRaycaster;
    private cursorManager!: CursorManager;
    private hoverManager!: HoverManager;
    private selectionManager!: SelectionManager;
    private dragHandler!: DragHandler;
    private connectionHandler!: ConnectionHandler;
    private resizeHandler!: ResizeHandler;
    private keyboardShortcuts!: KeyboardShortcuts;

    private _mode: 'default' | 'select' | 'connect' = 'default';
    private pointerDownPosition = new THREE.Vector2();
    private lastZoomedId: string | null = null;
    private lastPressedNode: Node | null = null;

    get mode(): 'default' | 'select' | 'connect' {
        return this._mode;
    }

    set mode(newMode: 'default' | 'select' | 'connect') {
        this._mode = newMode;
        if (newMode !== 'connect' && this.connectionHandler.isConnectingMode()) {
            this.connectionHandler.cancelConnection();
        }
    }

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
        this.raycaster = new InteractionRaycaster(sg);
        this.cursorManager = new CursorManager();
        this.hoverManager = new HoverManager(sg);
        this.selectionManager = new SelectionManager(sg);
        this.dragHandler = new DragHandler(sg, this.raycaster);
        this.connectionHandler = new ConnectionHandler(sg, this.raycaster);
        this.resizeHandler = new ResizeHandler(sg, this.raycaster);
        this.keyboardShortcuts = new KeyboardShortcuts(sg);

        this.cursorManager.setContainer(this.sg.renderer.renderer.domElement);
        this.keyboardShortcuts.setSelectionChangeHandler((_selection) => {
            this.selectionManager.clear();
        });

        this.registerFingerings();
        this.initInputHandlers();
    }

    private registerFingerings(): void {
        const inputManager = this.sg.input;

        const widgetFingering = new WidgetFingering(this.sg, this.raycaster);
        inputManager.registerFingering(widgetFingering, 110);

        const resizeFingering = new ResizeFingering(this.sg, this.raycaster);
        inputManager.registerFingering(resizeFingering, 200);

        const wiringFingering = new WiringFingering(this.sg, this.raycaster);
        inputManager.registerFingering(wiringFingering, 150);

        const nodeDragFingering = new NodeDraggingFingering(this.sg, this.raycaster);
        inputManager.registerFingering(nodeDragFingering, 100);

        const boxSelectFingering = new BoxSelectingFingering(
            this.sg,
            this.raycaster,
            this.selectionManager,
        );
        inputManager.registerFingering(boxSelectFingering, 80);

        const hoverFingering = new HoverFingering(this.sg, this.raycaster);
        inputManager.registerFingering(hoverFingering, 60);

        const pinchZoomFingering = new PinchZoomFingering(this.sg);
        inputManager.registerFingering(pinchZoomFingering, 50);
    }

    private initInputHandlers(): void {
        this.sg.events.on('input:interaction:pointerdown', (e: any) => this.handlePointerDown(e));
        this.sg.events.on('input:interaction:pointermove', (e: any) => this.handlePointerMove(e));
        this.sg.events.on('input:interaction:pointerup', (e: any) => this.handlePointerUp(e));
        this.sg.events.on('input:interaction:keydown', (e: any) => this.handleKeyDown(e));
        this.sg.events.on('input:interaction:keyup', (e: any) => this.handleKeyUp(e));
        this.sg.events.on('input:interaction:dblclick', (e: any) => this.handleDblClick(e));
        this.sg.events.on('input:interaction:contextmenu', (e: any) => this.handleContextMenu(e));
    }

private handlePointerDown(e: any): void {
this.pointerDownPosition.set(e.x, e.y);
this.raycaster.updateMousePosition(e.x, e.y);

if (e.button === 2 || e.shiftKey) {
e.originalEvent?.preventDefault();
}

if (this.connectionHandler.isConnectingMode()) {
return;
}

const nodeResult = this.raycaster.raycastNode();
this.raycaster.raycastEdge();

if (e.button === 2 && nodeResult?.node) {
this.startContextMenu(nodeResult.node, e);
return;
}

if (e.shiftKey && e.button === 0) {
this._handleBoxSelectionStart(e);
return;
}

if (nodeResult?.node && e.button === 0) {
this._handleLeftClick(nodeResult, e);
}

if (nodeResult?.node && e.button === 1) {
this._handleMiddleClick(nodeResult.node, e);
}
}

private _handleBoxSelectionStart(e: any): void {
this.selectionManager.startBoxSelection(e.x, e.y);
this.cursorManager.set('crosshair', 'box-select');
}

private _handleLeftClick(nodeResult: any, e: any): void {
const isResizeHandle = this.checkResizeHandle(nodeResult.node, e);
if (isResizeHandle) {
this.resizeHandler.startResize(nodeResult.node, e.x, e.y);
this.cursorManager.set('nwse-resize', 'resize');
return;
}

if (this._mode === 'connect') {
this.connectionHandler.startConnection(nodeResult.node);
this.cursorManager.set('crosshair', 'connection');
return;
}

const node = nodeResult.node;
const pickResult: PickResult = {
node,
point: nodeResult.hit?.point ?? new THREE.Vector3(),
distance: nodeResult.hit?.distance ?? 0,
};

if (node instanceof Pressable) {
node.onPressStart?.(pickResult);
this.lastPressedNode = node;
}

this.dragHandler.startDrag(nodeResult.node);
this.cursorManager.set('grabbing', 'drag');
}

private _handleMiddleClick(node: Node, e: any): void {
e.originalEvent?.preventDefault();
if (node instanceof Zoomable && node.isZoomable?.()) {
node.onZoomStart?.();
}
const radius = Math.max(
(((node.data as Record<string, unknown>)?.width as number) ?? 100) * 1.5,
150,
);
this.sg.cameraControls.flyTo(node.position, radius);
}

    private handlePointerMove(e: any): void {
        this.raycaster.updateMousePosition(e.x, e.y);

        if (this.dragHandler.isDraggingNode()) {
            const state = this.sg.input.getState();
            const enableZAxis = state.keysPressed.has('Alt');
            this.dragHandler.updateDrag(enableZAxis);
            return;
        }

        if (this.selectionManager.isBoxSelectingActive()) {
            this.selectionManager.updateBoxSelection(e.x, e.y);
            return;
        }

        if (this.connectionHandler.isConnectingMode()) {
            this.connectionHandler.updateConnection();
            const hoverResult = this.raycaster.raycastNode();
            this.hoverManager.updateNodeHover(hoverResult?.node ?? null);
            return;
        }

        if (this.resizeHandler.isResizingNode()) {
            this.resizeHandler.updateResize(e.x, e.y);
            return;
        }

        const nodeResult = this.raycaster.raycastNode();
        const edgeResult = this.raycaster.raycastEdge();
        this.hoverManager.updateHover(nodeResult?.node ?? null, edgeResult?.edge ?? null);

        let cursorMode: CursorMode = 'auto';
        if (nodeResult?.node) {
            cursorMode = (nodeResult.node as any).isTouchable ? 'pointer' : 'grab';
        }
        this.cursorManager.set(cursorMode, 'hover');
    }

    private handlePointerUp(_e: any): void {
        if (this.lastPressedNode) {
            const pickResult: PickResult = {
                node: this.lastPressedNode,
                point: new THREE.Vector3(),
                distance: 0,
            };
            if (this.lastPressedNode instanceof Pressable) {
                this.lastPressedNode.onPressStop?.(pickResult);
            }
            this.lastPressedNode = null;
        }

        if (this.dragHandler.isDraggingNode()) {
            this.dragHandler.endDrag();
            this.cursorManager.clear('drag');
        }

        if (this.selectionManager.isBoxSelectingActive()) {
            this.selectionManager.endBoxSelection();
            this.cursorManager.clear('box-select');
        }

        if (this.connectionHandler.isConnectingMode()) {
            const hoverResult = this.raycaster.raycastNode();
            const targetNode = hoverResult?.node ?? null;
            const completed = this.connectionHandler.completeConnection(targetNode);

            if (!completed && targetNode && targetNode !== this.connectionHandler.getSourceNode()) {
                this.connectionHandler.startConnection(targetNode);
            }

            this.cursorManager.clear('connection');
        }

        if (this.resizeHandler.isResizingNode()) {
            this.resizeHandler.endResize();
            this.cursorManager.clear('resize');
        }

        this.cursorManager.clear('hover');
    }

    private handleKeyDown(e: any): void {
        const activeEl = document.activeElement;
        const isEditingText =
            activeEl &&
            (activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable);

        if (isEditingText && e.key !== 'Escape') return;

        const selectedNodes = Array.from(this.selectionManager.getSelectedNodes());
        const selectedEdges = Array.from(this.selectionManager.getSelectedEdges());

        switch (e.key) {
            case 'Escape':
                if (this.connectionHandler.isConnectingMode()) {
                    this.connectionHandler.cancelConnection();
                } else {
                    this.selectionManager.clear();
                }
                break;

            case 'Delete':
            case 'Backspace':
                this.keyboardShortcuts.handleDelete(selectedNodes, selectedEdges);
                break;

            case 'a':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const allNodes = Array.from(this.sg.graph.nodes.values());
                    this.keyboardShortcuts.handleSelectAll(allNodes);
                }
                break;

            case ' ':
                if (!isEditingText) {
                    e.preventDefault();
                    const hoveredNode = this.hoverManager.getHoveredNode();
                    if (hoveredNode) {
                        this.keyboardShortcuts.handleZoomIn(hoveredNode);
                    }
                }
                break;
        }
    }

    private handleKeyUp(_e: any): void {}

    private handleDblClick(e: any): void {
        this.raycaster.updateMousePosition(e.x, e.y);

        const edgeResult = this.raycaster.raycastEdge();
        if (edgeResult?.edge) {
            this.sg.events.emit('edge:dblclick', { edge: edgeResult.edge } as any);
            this.handleZoomNavigation(edgeResult.edge.target, `edge:${edgeResult.edge.id}`);
            return;
        }

        const nodeResult = this.raycaster.raycastNode();
        if (nodeResult?.node) {
            this.sg.events.emit('node:dblclick', { node: nodeResult.node } as any);
            this.handleZoomNavigation(nodeResult.node, nodeResult.node.id);
        }
    }

    private handleContextMenu(e: any): void {
        e.originalEvent?.preventDefault();

        const distance = this.pointerDownPosition.distanceTo(new THREE.Vector2(e.x, e.y));
        if (distance > 5) return;

        this.raycaster.updateMousePosition(e.x, e.y);

        const edgeResult = this.raycaster.raycastEdge();
        if (edgeResult?.edge) {
            this.sg.events.emit('edge:contextmenu', {
                edge: edgeResult.edge,
                event: e.originalEvent,
            });
            return;
        }

        const nodeResult = this.raycaster.raycastNode();
        if (nodeResult?.node) {
            this.sg.events.emit('node:contextmenu', {
                node: nodeResult.node,
                event: e.originalEvent,
            });
        } else {
            this.sg.events.emit('graph:contextmenu', { event: e.originalEvent });
        }
    }

    private handleZoomNavigation(target: Node | Edge, zoomId: string): void {
        if (!target || !this.sg.cameraControls) return;

        const targetPos =
            'position' in target
                ? (target as Node).position.clone()
                : (target as Edge).target.position.clone();
        const targetRadius =
            'data' in target &&
            typeof (target as Node).data === 'object' &&
            (target as Node).data !== null &&
            'width' in (target as Node).data
                ? Math.max(
                      (((target as Node).data as Record<string, unknown>).width as number) * 1.5,
                      150,
                  )
                : 150;

        const controls = this.sg.cameraControls;
        if (this.lastZoomedId === zoomId && controls.hasZoomHistory) {
            controls.flyBack();
            this.lastZoomedId = null;
        } else {
            controls.zoomTo(targetPos, targetRadius);
            this.lastZoomedId = zoomId;
        }
    }

    private checkResizeHandle(_node: Node, _e: any): boolean {
        return false;
    }

    private startContextMenu(_node: Node, _e: any): void {
        // Context menu handling delegated to events
    }

    dispose(): void {
        this.selectionManager.dispose();
        this.connectionHandler.dispose();
    }
}
