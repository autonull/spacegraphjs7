import * as THREE from 'three';
import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { EdgeSpec } from '../../types';
import type { InteractionRaycaster } from './RaycasterHelper';

/**
 * Connection handler for InteractionPlugin
 * Handles edge creation through node-to-node dragging
 */
export class ConnectionHandler {
    private isConnecting = false;
    private connectSourceNode: Node | null = null;
    private connectTempLine: THREE.Line | null = null;
    private connectTempLineGeom: THREE.BufferGeometry | null = null;
    private readonly tempMaterial = new THREE.LineBasicMaterial({ color: 0x8b5cf6, linewidth: 2 });

    private readonly sg: SpaceGraph;
    private readonly raycaster: InteractionRaycaster;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    startConnection(node: Node): void {
        if (!node.object) return;

        this.isConnecting = true;
        this.connectSourceNode = node;

        const positions = new Float32Array([
            node.position.x,
            node.position.y,
            node.position.z,
            node.position.x,
            node.position.y,
            node.position.z,
        ]);

        this.connectTempLineGeom = new THREE.BufferGeometry();
        this.connectTempLineGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        this.connectTempLine = new THREE.Line(this.connectTempLineGeom, this.tempMaterial);
        this.sg.renderer.scene.add(this.connectTempLine);

        this.sg.events.emit('connection:start', { node });
    }

    updateConnection(): void {
        if (!this.isConnecting || !this.connectSourceNode || !this.connectTempLineGeom) return;

        const normal = this.sg.renderer.camera.getWorldDirection(new THREE.Vector3(0, 0, 1));
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            normal,
            this.connectSourceNode.position,
        );
        const intersectPoint = this.raycaster.raycastPlane(plane);

        if (!intersectPoint) return;

        const positions = this.connectTempLineGeom.getAttribute(
            'position',
        ) as THREE.BufferAttribute;
        positions.setXYZ(1, intersectPoint.x, intersectPoint.y, intersectPoint.z);
        positions.needsUpdate = true;

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

    private cleanupConnection(): void {
        if (this.connectTempLine) {
            this.sg.renderer.scene.remove(this.connectTempLine);
            this.connectTempLineGeom?.dispose();
            this.tempMaterial.dispose();
            this.connectTempLine = null;
            this.connectTempLineGeom = null;
        }

        this.isConnecting = false;
        this.connectSourceNode = null;
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
}
