// SpaceGraphJS - Wire
// Typed data connection between PortNodes with activity tracking

import { Edge } from './Edge';
import type { PortNode } from '../nodes/PortNode';
import type { EdgeSpec } from '../types';

export class Wire<T = unknown> extends Edge {
    readonly sourcePort: PortNode<T>;
    readonly targetPort: PortNode<T>;
    private lastActivity = 0;

    constructor(source: PortNode<T>, target: PortNode<T>) {
        const spec: EdgeSpec = {
            id: `wire:${source.id}->${target.id}`,
            type: 'Edge',
            source: source.id,
            target: target.id,
            data: { color: 0x44aaff, thickness: 2 },
        };
        super(spec, source, target);
        this.sourcePort = source;
        this.targetPort = target;
    }

    send(data: T): boolean {
        const handler = this.targetPort.getReceiveHandler();
        if (handler) {
            handler(this, data);
            this.lastActivity = performance.now();
            this.pulse(1.0);
            return true;
        }
        return false;
    }

    getActivity(now: number, window: number = 2000): number {
        const dt = now - this.lastActivity;
        return 1 / (1 + dt / window);
    }

    dispose(): void {
        this.sourcePort.disconnect(this as unknown as Wire<T>);
        super.dispose();
    }
}
