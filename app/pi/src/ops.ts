import { Kernel, type KernelOp } from '@spacegraphjs/kernel';

export const foldKernelOps = (ops: Iterable<KernelOp>, into = new Kernel()): Kernel => {
    let kernel = into;
    for (const op of ops) {
        kernel = kernel.modify((builder) => {
            switch (op.op) {
                case 'add-node':
                    builder.nodes.set(op.node.id, op.node);
                    break;
                case 'remove-node':
                    builder.nodes.delete(op.id);
                    break;
                case 'add-edge':
                    builder.edges.set(op.edge.id, op.edge);
                    break;
                case 'remove-edge':
                    builder.edges.delete(op.id);
                    break;
                case 'add-hyperedge':
                    builder.hyperedges.set(op.hyperedge.id, op.hyperedge);
                    break;
                case 'remove-hyperedge':
                    builder.hyperedges.delete(op.id);
                    break;
            }
        });
    }
    return kernel;
};

export const encodeOp = (op: KernelOp): string => `data: ${JSON.stringify(op)}\n\n`;

export const decodeOp = (data: string): KernelOp => JSON.parse(data) as KernelOp;
