import { foldKernelOps, type KernelOp } from '@spacegraphjs/kernel';

export { foldKernelOps };
export type { KernelOp };

export const encodeOp = (op: KernelOp): string => `data: ${JSON.stringify(op)}\n\n`;

export const decodeOp = (data: string): KernelOp => JSON.parse(data) as KernelOp;

/** Stable identity for one op, independent of its position in a stream. */
export const opID = (op: KernelOp): string => {
    switch (op.op) {
        case 'add-node':
            return `node:${op.node.id}`;
        case 'remove-node':
            return `remove-node:${op.id}`;
        case 'add-edge':
            return `edge:${op.edge.id}`;
        case 'remove-edge':
            return `remove-edge:${op.id}`;
        case 'add-hyperedge':
            return `hyper:${op.hyperedge.id}`;
        case 'remove-hyperedge':
            return `remove-hyper:${op.id}`;
    }
};

export type OpFrame = {
    readonly data: string;
    readonly lastEventId: string;
};

/** One SSE handler for every conversation: `lastEventId` selects the tab. */
export const demuxOp = (
    frame: OpFrame,
    deliver: (conversationID: string, op: KernelOp) => void,
): void => {
    if (frame.lastEventId) deliver(frame.lastEventId, decodeOp(frame.data));
};
