import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { InteractionRaycaster } from './RaycasterHelper';

/**
 * Drag handler for InteractionPlugin
 * Handles node dragging with multi-select and Z-axis support
 */
export class DragHandler {
    private isDragging = false;
    private dragNode: Node | null = null;
    private draggingNodes: Set<Node> = new Set();
    private readonly dragPlane = new THREE.Plane();
    private readonly dragOffset = new THREE.Vector3();
    private readonly nodeDragOffsets = new Map<Node, THREE.Vector3>();
    private readonly intersection = new THREE.Vector3();
    private dragStartZ = 0;
    private previousDragPosition = { x: 0, y: 0 };

    private readonly sg: SpaceGraph;
    private readonly raycaster: InteractionRaycaster;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    startDrag(node: Node): boolean {
        if (!node.object) return false;

        this.isDragging = true;
        this.dragNode = node;
        this.draggingNodes.clear();
        this.draggingNodes.add(node);

        const selectedNodes = (this.sg.events as any).emit('selection:getSelectedNodes')?.nodes;
        if (selectedNodes?.size > 1 && selectedNodes.has(node)) {
            for (const selectedNode of selectedNodes) {
                if (selectedNode !== node && selectedNode.object) {
                    this.draggingNodes.add(selectedNode);
                    const offset = selectedNode.position.clone().sub(node.position);
                    this.nodeDragOffsets.set(selectedNode, offset);
                }
            }
        }

        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
            node.position,
        );

        const intersectPoint = this.raycaster.raycastPlane(this.dragPlane);
        if (intersectPoint) {
            this.dragOffset.copy(intersectPoint).sub(node.position);
        }

        this.dragStartZ = node.position.z;
        const ndc = this.raycaster.getMouseNDC();
        this.previousDragPosition = { x: ndc.x, y: ndc.y };

        this.sg.events.emit('interaction:dragstart', { node });
        return true;
    }

    updateDrag(enableZAxis = false): void {
        if (!this.isDragging || !this.dragNode || !this.dragNode.object) return;

        const intersectPoint = this.raycaster.raycastPlane(this.dragPlane);
        if (!intersectPoint) return;

        const newPosition = intersectPoint.sub(this.dragOffset);

        if (enableZAxis) {
            const ndc = this.raycaster.getMouseNDC();
            const deltaX = ndc.x - this.previousDragPosition.x;
            const deltaY = ndc.y - this.previousDragPosition.y;
            const deltaZ = (deltaX + deltaY) * 0.5;
            newPosition.z = this.dragStartZ + deltaZ;
            this.previousDragPosition = { x: ndc.x, y: ndc.y };
        } else {
            newPosition.z = this.dragNode.position.z;
        }

        this.dragNode.position.copy(newPosition);
        this.dragNode.object?.updateMatrixWorld(true);

        for (const otherNode of this.draggingNodes) {
            if (otherNode !== this.dragNode && otherNode.object) {
                const offset = this.nodeDragOffsets.get(otherNode);
                if (offset) {
                    otherNode.position.copy(newPosition).add(offset);
                    otherNode.object.updateMatrixWorld(true);
                }
            }
        }

        this.sg.events.emit('interaction:drag', { node: this.dragNode });
    }

    endDrag(): void {
        if (!this.isDragging) return;

        if (this.dragNode) {
            this.sg.events.emit('interaction:dragend', { node: this.dragNode });
        }

        this.isDragging = false;
        this.dragNode = null;
        this.draggingNodes.clear();
        this.nodeDragOffsets.clear();
    }

    isDraggingNode(): boolean {
        return this.isDragging;
    }

    getDraggingNodes(): Set<Node> {
        return this.draggingNodes;
    }
}
