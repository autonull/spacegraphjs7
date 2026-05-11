import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class ResizeFingering extends BaseFingering {
    private resizedNode: Node | null = null;
    private startPos = { x: 0, y: 0 };
    private startSize = { width: 0, height: 0 };
    private screenScaleX = 1;
    private screenScaleY = 1;

    private static MIN_SIZE = 40;
    private static MAX_SIZE = 2000;

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;

        const result = this.raycaster.raycastNode();
        if (!result?.node || !result.node.data?.width || !result.node.data?.height) return false;

        const resizeHandle = this.checkResizeHandle(
            result.node,
            finger.position.x,
            finger.position.y,
        );
        if (!resizeHandle) return false;

        this.active = true;
        this.resizedNode = result.node;
        this.startPos = { x: finger.position.x, y: finger.position.y };
        this.startSize = {
            width: result.node.data.width as number,
            height: result.node.data.height as number,
        };

        const canvas = this.sg.renderer.renderer.domElement;
        const nodeScreenSize = this.getNodeScreenSize(result.node);
        this.screenScaleX = nodeScreenSize.width / canvas.clientWidth;
        this.screenScaleY = nodeScreenSize.height / canvas.clientHeight;

        this.resizedNode.pulse(1.0);
        this.emit('resize:start', { node: this.resizedNode });
        return true;
    }

    update(finger: Finger): boolean {
        if (!this.active || !this.resizedNode) return false;

        const deltaX = finger.position.x - this.startPos.x;
        const deltaY = finger.position.y - this.startPos.y;

        const deltaWidth = (deltaX / this.screenScaleX) * 2;
        const deltaHeight = (deltaY / this.screenScaleY) * 2;

        const newWidth = Math.max(
            ResizeFingering.MIN_SIZE,
            Math.min(ResizeFingering.MAX_SIZE, this.startSize.width + deltaWidth),
        );
        const newHeight = Math.max(
            ResizeFingering.MIN_SIZE,
            Math.min(ResizeFingering.MAX_SIZE, this.startSize.height + deltaHeight),
        );

        this.resizedNode.updateSpec({
            data: {
                ...this.resizedNode.data,
                width: newWidth,
                height: newHeight,
            },
        });

        this.emit('resize:update', { node: this.resizedNode, width: newWidth, height: newHeight });

        return true;
    }

    stop(_finger: Finger): void {
        if (this.resizedNode) {
            this.emit('resize:end', { node: this.resizedNode });
        }
        this.active = false;
        this.resizedNode = null;
    }

    defer(_finger: Finger): boolean {
        return false;
    }

    private checkResizeHandle(node: Node, x: number, y: number): boolean {
        const data = node.data as Record<string, unknown>;
        const width = (data.width as number) ?? 200;
        const height = (data.height as number) ?? 100;
        const handleSize = 20;

        const pos = this.getScreenPosition(node);
        const right = pos.x + width / 2;
        const bottom = pos.y + height / 2;

        return x >= right - handleSize && x <= right && y >= bottom - handleSize && y <= bottom;
    }

    private getScreenPosition(node: Node): { x: number; y: number } {
        const vector = node.position.clone();
        vector.project(this.sg.renderer.camera);
        const canvas = this.sg.renderer.renderer.domElement;
        return {
            x: (vector.x * 0.5 + 0.5) * canvas.clientWidth,
            y: (-vector.y * 0.5 + 0.5) * canvas.clientHeight,
        };
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
}