import { Plane, Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import { parentIdOf } from '../../utils/nodeParent';
import type { SpaceGraph } from '../../SpaceGraph';
import { nodeDragPayload } from './nodeDragPayload';
import type { InteractionRaycaster } from './RaycasterHelper';

/**
 * Drag handler for InteractionPlugin
 * Handles node dragging with multi-select and Z-axis support
 */
export class DragHandler {
  private isDragging = false;
  private dragNode: Node | null = null;
  private draggingNodes: Set<Node> = new Set();
  readonly dragPlane = new Plane();
  readonly dragOffset = new Vector3();
  readonly nodeDragOffsets = new Map<Node, Vector3>();
  readonly intersection = new Vector3();
  private dragStartZ = 0;
  private previousDragPosition = { x: 0, y: 0 };
  private dragStiffness = 1.0;
  private preserveDistance = false;
  private initialPickDistance = 0;
  readonly rayFrom = new Vector3();

  readonly sg: SpaceGraph;
  readonly raycaster: InteractionRaycaster;

  constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
    this.sg = sg;
    this.raycaster = raycaster;
  }

  startDrag(
    node: Node,
    options?: { stiffness?: number; preserveDistance?: boolean; hitPoint?: Vector3 }
  ): boolean {
    if (!node.object) return false;

    // The drag starts where the pointer is, so a node that refuses to be dragged there (a card
    // with a control under the cursor) is left alone.
    const localPos = options?.hitPoint
      ? node.object.worldToLocal(options.hitPoint.clone())
      : new Vector3();
    if (!node.isDraggable(localPos)) return false;

    this.dragStiffness = options?.stiffness ?? 1.0;
    this.preserveDistance = options?.preserveDistance ?? false;
    this.rayFrom.copy(this.sg.renderer.camera.position);
    this.initialPickDistance = this.rayFrom.distanceTo(node.position);
    this.isDragging = true;
    this.dragNode = node;
    this.draggingNodes.clear();
    this.draggingNodes.add(node);

    const selectedNodes = new Set(this.sg.selectedNodes);
    if (selectedNodes.size > 1 && selectedNodes.has(node)) {
      for (const selectedNode of selectedNodes) {
        if (selectedNode !== node && selectedNode.object) {
          this.draggingNodes.add(selectedNode);
          const offset = selectedNode.position.clone().sub(node.position);
          this.nodeDragOffsets.set(selectedNode, offset);
        }
      }
    }

    // A group carries its contents: dragging the backdrop moves the members with it, including
    // nested groups and their members.
    const groups = [...this.draggingNodes];
    while (groups.length > 0) {
      const group = groups.pop()!;
      for (const descendant of this.groupDescendants(group)) {
        if (this.draggingNodes.has(descendant)) continue;
        this.draggingNodes.add(descendant);
        this.nodeDragOffsets.set(descendant, descendant.position.clone().sub(node.position));
        groups.push(descendant);
      }
    }

    this.dragPlane.setFromNormalAndCoplanarPoint(
      this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
      node.position
    );

    const intersectPoint = this.raycaster.raycastPlane(this.dragPlane);
    if (intersectPoint) {
      this.dragOffset.copy(intersectPoint).sub(node.position);
    }

    this.dragStartZ = node.position.z;
    const ndc = this.raycaster.getMouseNDC();
    this.previousDragPosition = { x: ndc.x, y: ndc.y };

    this.sg.events.emit('interaction:dragstart', nodeDragPayload(node, this.draggingNodes));
    return true;
  }

  updateDrag(enableZAxis = false): void {
    if (!this.isDragging || !this.dragNode || !this.dragNode.object) return;

    const targetPosition = this.calculateTargetPosition(enableZAxis);
    if (!targetPosition) return;

    this.applyZAxisAdjustment(targetPosition, enableZAxis);
    this.updateNodePosition(targetPosition);
    this.updateDraggingNodes(targetPosition);
    this.emitDragEvent();
  }

  endDrag(): void {
    if (!this.isDragging) return;

    if (this.dragNode) {
      this.sg.events.emit('interaction:dragend', nodeDragPayload(this.dragNode, this.draggingNodes));
    }

    this.isDragging = false;
    this.dragNode = null;
    this.draggingNodes.clear();
    this.nodeDragOffsets.clear();
  }

  private groupDescendants(group: Node): Node[] {
    if (!(group as Node & { isGroupNode?: boolean }).isGroupNode && group.data?.group !== true) {
      return [];
    }

    const nodes = this.sg.graph.nodes;
    const descendants: Node[] = [];

    for (const candidate of nodes.values()) {
      if (candidate === group) continue;

      const visited = new Set<string>();
      let parent = parentIdOf(candidate);

      while (parent) {
        if (visited.has(parent)) break;
        visited.add(parent);
        if (parent === group.id) {
          descendants.push(candidate);
          break;
        }

        const ancestor = nodes.get(parent);
        parent = ancestor ? parentIdOf(ancestor) : undefined;
      }
    }

    return descendants;
  }

  isDraggingNode(): boolean {
    return this.isDragging;
  }

  getDraggingNodes(): Set<Node> {
    return this.draggingNodes;
  }

  private calculateTargetPosition(enableZAxis: boolean): Vector3 | null {
    if (!this.dragNode) return null;
    let targetPosition: Vector3;

    if (this.preserveDistance) {
      const ndc = this.raycaster.getMouseNDC();
      const camera = this.sg.renderer.camera;
      const direction = new Vector3(ndc.x, ndc.y, 0.5)
        .unproject(camera)
        .sub(camera.position)
        .normalize();
      targetPosition = this.rayFrom
        .clone()
        .add(direction.clone().multiplyScalar(this.initialPickDistance))
        .sub(this.dragOffset);
    } else {
      const intersectPoint = this.raycaster.raycastPlane(this.dragPlane);
      if (!intersectPoint) return null;
      targetPosition = intersectPoint.sub(this.dragOffset);
      this.dragPlane.setFromNormalAndCoplanarPoint(
        this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
        this.dragNode.position
      );
    }

    if (!enableZAxis) {
      targetPosition.z = this.dragNode.position.z;
    }

    return targetPosition;
  }

  private applyZAxisAdjustment(targetPosition: Vector3, enableZAxis: boolean): void {
    if (enableZAxis) {
      const ndc = this.raycaster.getMouseNDC();
      const deltaX = ndc.x - this.previousDragPosition.x;
      const deltaY = ndc.y - this.previousDragPosition.y;
      const deltaZ = (deltaX + deltaY) * 0.5;
      targetPosition.z = this.dragStartZ + deltaZ;
      this.previousDragPosition = { x: ndc.x, y: ndc.y };
    }
  }

  private updateNodePosition(targetPosition: Vector3): void {
    if (!this.dragNode) return;
    if (this.dragStiffness < 1.0) {
      this.dragNode.position.lerp(targetPosition, this.dragStiffness);
      this.dragNode.updatePosition(
        this.dragNode.position.x,
        this.dragNode.position.y,
        this.dragNode.position.z
      );
    } else {
      this.dragNode.updatePosition(targetPosition.x, targetPosition.y, targetPosition.z);
    }
  }

  private updateDraggingNodes(targetPosition: Vector3): void {
    if (!this.dragNode) return;
    for (const otherNode of this.draggingNodes) {
      if (otherNode !== this.dragNode && otherNode.object) {
        const offset = this.nodeDragOffsets.get(otherNode);
        if (offset) {
          otherNode.updatePosition(
            targetPosition.x + offset.x,
            targetPosition.y + offset.y,
            targetPosition.z + offset.z
          );
        }
      }
    }
  }

  private emitDragEvent(): void {
    if (!this.dragNode) return;
    this.sg.events.emit('interaction:drag', nodeDragPayload(this.dragNode));
  }
}
