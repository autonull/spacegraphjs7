import type { Node } from '../../nodes/Node';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class WidgetFingering extends BaseFingering {
    private widgetNode: Node | null = null;
    private isButtonDown = false;

    start(_finger: Finger): boolean {
        if (_finger.buttons !== 1) return false;

        const result = this.raycaster.raycastNode();
        if (!result?.node) return false;

        const node = result.node as any;
        if (typeof node.onPointerDown === 'function') {
            node.onPointerDown();
            this.widgetNode = node;
            this.isButtonDown = true;
            return true;
        }

        return false;
    }

    update(_finger: Finger): boolean {
        if (!this.isButtonDown || !this.widgetNode) return true;

        const result = this.raycaster.raycastNode();
        if (
            result?.node === this.widgetNode &&
            typeof (this.widgetNode as any).onPointerMove === 'function'
        ) {
            const localPoint = this.widgetNode.object.worldToLocal(result.point.clone());
            (this.widgetNode as any).onPointerMove(localPoint.x);
        }

        return true;
    }

    stop(_finger: Finger): void {
        if (this.isButtonDown && this.widgetNode) {
            const result = this.raycaster.raycastNode();
            if (
                result?.node === this.widgetNode &&
                typeof (this.widgetNode as any).onPointerUp === 'function'
            ) {
                (this.widgetNode as any).onPointerUp();
            }
        }
        this.isButtonDown = false;
        this.widgetNode = null;
    }
}