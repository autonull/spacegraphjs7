import { Plane, Vector3 } from 'three';
import type { Node } from '../../nodes/Node';
import type { SpaceGraph } from '../../SpaceGraph';
import type { EdgeSpec } from '../../types';
import type { InteractionRaycaster } from './RaycasterHelper';
import { TempConnectionLine } from './TempConnectionLine';

/**
 * Connection handler for InteractionPlugin
 * Handles edge creation through node-to-node dragging
 */
export class ConnectionHandler {
  private isConnecting = false;
  private connectSourceNode: Node | null = null;
  private connectTempLine: TempConnectionLine | null = null;

  readonly sg: SpaceGraph;
  readonly raycaster: InteractionRaycaster;

  constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
    this.sg = sg;
    this.raycaster = raycaster;
  }

  startConnection(node: Node): void {
    if (!node.object) return;

    this.isConnecting = true;
    this.connectSourceNode = node;
    this.connectTempLine = new TempConnectionLine(this.sg.renderer.scene, node.position);

    this.sg.events.emit('connection:start', { node });
  }

  updateConnection(): void {
    if (!this.isConnecting || !this.connectSourceNode || !this.connectTempLine) return;

    const normal = this.sg.renderer.camera.getWorldDirection(new Vector3(0, 0, 1));
    const plane = new Plane().setFromNormalAndCoplanarPoint(
      normal,
      this.connectSourceNode.position
    );
    const intersectPoint = this.raycaster.raycastPlane(plane);

    if (!intersectPoint) return;

    this.connectTempLine.moveTo(intersectPoint);

    const hoverResult = this.raycaster.raycastNode();
    const targetNode = hoverResult?.node ?? null;

    this.sg.events.emit('connection:drag', {
      source: this.connectSourceNode,
      target: targetNode,
      position: intersectPoint,
    });
  }

  completeConnection(targetNode: Node | null): boolean {
    if (!this.isConnecting || !this.connectSourceNode || !targetNode) {
      this.cancelConnection();
      return false;
    }

    if (this.connectSourceNode === targetNode) {
      this.cancelConnection();
      return false;
    }

    const edgeSpec: EdgeSpec = {
      id: `edge_${this.connectSourceNode.id}_${targetNode.id}_${Date.now()}`,
      source: this.connectSourceNode.id,
      target: targetNode.id,
      type: 'CurvedEdge',
      data: {},
    };

    this.sg.graph.addEdge(edgeSpec);
    this.sg.events.emit('connection:complete', {
      source: this.connectSourceNode,
      target: targetNode,
    });

    this.cleanupConnection();
    return true;
  }

  cancelConnection(): void {
    this.cleanupConnection();
    this.sg.events.emit('connection:cancelled', {});
  }

  isConnectingMode(): boolean {
    return this.isConnecting;
  }

  getSourceNode(): Node | null {
    return this.connectSourceNode;
  }

  dispose(): void {
    this.cleanupConnection();
  }

  private cleanupConnection(): void {
    this.connectTempLine?.dispose();
    this.connectTempLine = null;

    this.isConnecting = false;
    this.connectSourceNode = null;
  }
}
