import { BoxGeometry, DoubleSide, EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial } from 'three';

import type { SpaceGraph } from '../SpaceGraph';
import type { GroupNodeData, NodeSpec } from '../types';
import { parentIdOf } from '../utils/nodeParent';
import { Object3DNode } from './Object3DNode';

export class GroupNode extends Object3DNode {
  static typeName: string = 'GroupNode';
  public readonly isGroupNode = true;
  private meshGeometry: BoxGeometry;
  readonly meshMaterial: MeshBasicMaterial;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    super(sg, spec);

    const data = spec.data as GroupNodeData;
    const { width = 300, height = 200, depth = 100, color = 0x4488ff } = data;

    this.meshGeometry = new BoxGeometry(width, height, depth);
    this.meshMaterial = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      side: DoubleSide,
    });

    const mesh = new Mesh(this.meshGeometry, this.meshMaterial);

    const edgesGeometry = new EdgesGeometry(this.meshGeometry);
    const edgesMaterial = new LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const edges = new LineSegments(edgesGeometry, edgesMaterial);
    mesh.add(edges);

    this._object.add(mesh);
    this.updatePosition(this.position.x, this.position.y, this.position.z);
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);

    if (updates.data?.color) {
      this.meshMaterial.color.setHex(updates.data.color as number);
    }

    if (updates.data && (updates.data.width || updates.data.height || updates.data.depth)) {
      const { width, height, depth } = this.meshGeometry.parameters;
      const newGeometry = new BoxGeometry(
        (updates.data.width as number) ?? width,
        (updates.data.height as number) ?? height,
        (updates.data.depth as number) ?? depth
      );

      const mesh = this._object.children[0] as Mesh;
      if (mesh) {
        mesh.geometry.dispose();
        mesh.geometry = newGeometry;

        const oldEdges = mesh.children[0] as LineSegments;
        if (oldEdges) {
          oldEdges.geometry.dispose();
          oldEdges.geometry = new EdgesGeometry(newGeometry);
        }
      }

      this.meshGeometry = newGeometry;
    }
    return this;
  }

  updateLod(distance: number): void {
    const threshold = (this.data?.lodThreshold as number) ?? 1200;

    this.meshMaterial.opacity = distance < threshold ? 0.05 : 0.2;

    const isHiddenByParent = this._isAncestorHidden();
    const shouldShowChildren = !isHiddenByParent && distance < threshold;

    this.data._lastLodVisible = shouldShowChildren;
  }

  private _isAncestorHidden(): boolean {
    let currentParent = parentIdOf(this);
    const visited = new Set<string>();

    while (currentParent && this.sg?.graph?.nodes) {
      if (visited.has(currentParent)) break;
      visited.add(currentParent);

      const parentNode = this.sg.graph.nodes.get(currentParent);
      if (
        parentNode &&
        (parentNode as any).isGroupNode &&
        parentNode.data._lastLodVisible === false
      ) {
        return true;
      }
      currentParent = parentIdOf(parentNode);
    }

    return false;
  }
}
