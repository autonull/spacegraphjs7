import type { SpaceGraph } from '../../SpaceGraph';
import type { Node } from '../../nodes/Node';
import type { InteractionRaycaster } from './RaycasterHelper';
import * as THREE from 'three';

/**
 * Resize handler for InteractionPlugin
 * Handles interactive node resizing with screen-space calibration
 */
export class ResizeHandler {
    private isResizing = false;
    private resizedNode: Node | null = null;
    private resizeStartPointerPos = { x: 0, y: 0 };
    private resizeStartNodeSize = { width: 0, height: 0 };
    private resizeNodeScreenScaleX = 1;
    private resizeNodeScreenScaleY = 1;

    private readonly sg: SpaceGraph;
    private readonly raycaster: InteractionRaycaster;

    private static MIN_NODE_SIZE = 40;
    private static MAX_NODE_SIZE = 2000;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    startResize(node: Node, pointerX: number, pointerY: number): boolean {
        if (!node.object || !node.data?.width || !node.data?.height) return false;

        this.isResizing = true;
        this.resizedNode = node;
        this.resizeStartPointerPos = { x: pointerX, y: pointerY };
        this.resizeStartNodeSize = {
            width: (node.data as any).width,
            height: (node.data as any).height,
        };

        const canvas = this.sg.renderer.renderer.domElement;
        const nodeScreenSize = this.getNodeScreenSize(node);

        this.resizeNodeScreenScaleX = nodeScreenSize.width / canvas.clientWidth;
        this.resizeNodeScreenScaleY = nodeScreenSize.height / canvas.clientHeight;

        this.sg.events.emit('resize:start', { node });
        return true;
    }

    updateResize(pointerX: number, pointerY: number): void {
        if (!this.isResizing || !this.resizedNode) return;

        const deltaX = pointerX - this.resizeStartPointerPos.x;
        const deltaY = pointerY - this.resizeStartPointerPos.y;

        const deltaWidth = (deltaX / this.resizeNodeScreenScaleX) * 2;
        const deltaHeight = (deltaY / this.resizeNodeScreenScaleY) * 2;

        const newWidth = Math.max(
            ResizeHandler.MIN_NODE_SIZE,
            Math.min(ResizeHandler.MAX_NODE_SIZE, this.resizeStartNodeSize.width + deltaWidth),
        );
        const newHeight = Math.max(
            ResizeHandler.MIN_NODE_SIZE,
            Math.min(ResizeHandler.MAX_NODE_SIZE, this.resizeStartNodeSize.height + deltaHeight),
        );

        if (this.resizedNode.updateSpec) {
            this.resizedNode.updateSpec({
                data: {
                    ...this.resizedNode.data,
                    width: newWidth,
                    height: newHeight,
                },
            });
        }

        this.sg.events.emit('resize:update', {
            node: this.resizedNode,
            width: newWidth,
            height: newHeight,
        });
    }

    endResize(): void {
        if (!this.isResizing) return;

        if (this.resizedNode) {
            this.sg.events.emit('resize:end', { node: this.resizedNode });
        }

        this.isResizing = false;
        this.resizedNode = null;
    }

    private getNodeScreenSize(node: Node): { width: number; height: number } {
        const box = new THREE.Box3().setFromObject(node.object!);
        const size = box.getSize(new THREE.Vector3());

        const canvas = this.sg.renderer.renderer.domElement;
        const fov = this.sg.renderer.camera.fov * (Math.PI / 180);
        const distance = this.sg.renderer.camera.position.distanceTo(node.position);

        const visibleHeight = 2 * Math.tan(fov / 2) * distance;
        const visibleWidth = (visibleHeight * canvas.clientWidth) / canvas.clientHeight;

        return {
            width: (size.x / visibleWidth) * canvas.clientWidth,
            height: (size.y / visibleHeight) * canvas.clientHeight,
        };
    }

    isResizingNode(): boolean {
        return this.isResizing;
    }

    getResizedNode(): Node | null {
        return this.resizedNode;
    }
}
