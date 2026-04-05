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
    private dragStiffness = 1.0;
    private preserveDistance = false;
    private initialPickDistance = 0;
    private readonly rayFrom = new THREE.Vector3();

    private readonly sg: SpaceGraph;
    private readonly raycaster: InteractionRaycaster;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    startDrag(node: Node, options?: { stiffness?: number; preserveDistance?: boolean }): boolean {
        if (!node.object) return false;

        const localPos = new THREE.Vector3();
        if (!node.isDraggable(localPos)) return false;

        this.dragStiffness = options?.stiffness ?? 1.0;
        this.preserveDistance = options?.preserveDistance ?? false;
        this.rayFrom.copy(this.sg.renderer.camera.position);
        this.initialPickDistance = this.rayFrom.distanceTo(node.position);
        this.isDragging = true;
        this.dragNode = node;
        this.draggingNodes.clear();
        this.draggingNodes.add(node);

        const selectedNodes = (
            this.sg.events.emit as (
                type: string,
                ...args: unknown[]
            ) => { nodes?: Set<Node> } | undefined
        )('selection:getSelectedNodes')?.nodes;
        if (selectedNodes && selectedNodes.size > 1 && selectedNodes.has(node)) {
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

        this.sg.events.emit('interaction:dragstart', { node } as any);
        return true;
    }

    updateDrag(enableZAxis = false): void {
        if (!this.isDragging || !this.dragNode || !this.dragNode.object) return;

        let targetPosition: THREE.Vector3;

        if (this.preserveDistance) {
            const ndc = this.raycaster.getMouseNDC();
            const camera = this.sg.renderer.camera;
            const ray = new THREE.Ray();
            ray.origin.copy(camera.position);
            const direction = new THREE.Vector3(ndc.x, ndc.y, 0.5)
                .unproject(camera)
                .sub(camera.position)
                .normalize();
            ray.direction.copy(direction);
            targetPosition = this.rayFrom
                .clone()
                .add(direction.clone().multiplyScalar(this.initialPickDistance))
                .sub(this.dragOffset);
        } else {
            const intersectPoint = this.raycaster.raycastPlane(this.dragPlane);
            if (!intersectPoint) return;
            targetPosition = intersectPoint.sub(this.dragOffset);
            this.dragPlane.setFromNormalAndCoplanarPoint(
                this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
                this.dragNode.position,
            );
        }

        if (enableZAxis) {
            const ndc = this.raycaster.getMouseNDC();
            const deltaX = ndc.x - this.previousDragPosition.x;
            const deltaY = ndc.y - this.previousDragPosition.y;
            const deltaZ = (deltaX + deltaY) * 0.5;
            targetPosition.z = this.dragStartZ + deltaZ;
            this.previousDragPosition = { x: ndc.x, y: ndc.y };
        } else {
            targetPosition.z = this.dragNode.position.z;
        }

        if (this.dragStiffness < 1.0) {
            this.dragNode.position.lerp(targetPosition, this.dragStiffness);
        } else {
            this.dragNode.position.copy(targetPosition);
        }
        this.dragNode.object?.updateMatrixWorld(true);

        for (const otherNode of this.draggingNodes) {
            if (otherNode !== this.dragNode && otherNode.object) {
                const offset = this.nodeDragOffsets.get(otherNode);
                if (offset) {
                    otherNode.position.copy(targetPosition).add(offset);
                    otherNode.object.updateMatrixWorld(true);
                }
            }
        }

        this.sg.events.emit('interaction:drag', {
            node: this.dragNode,
            position: [
                this.dragNode.position.x,
                this.dragNode.position.y,
                this.dragNode.position.z,
            ] as [number, number, number],
        });
    }

    endDrag(): void {
        if (!this.isDragging) return;

        if (this.dragNode) {
            this.sg.events.emit('interaction:dragend', { node: this.dragNode } as any);
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
