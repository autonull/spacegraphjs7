import { Kernel, type KernelOp } from '@spacegraphjs/kernel';

export const foldKernelOps = (ops: Iterable<KernelOp>, into = new Kernel()): Kernel => {
    const nodes = new Map(into.nodes.map((node) => [node.id, node]));
    const edges = new Map(into.edges.map((edge) => [edge.id, edge]));
    const hyperedges = new Map(into.hyperedges.map((hyperedge) => [hyperedge.id, hyperedge]));
    let version = into.version;

    for (const op of ops) {
        version++;
        switch (op.op) {
            case 'add-node':
                nodes.set(op.node.id, op.node);
                break;
            case 'remove-node':
                nodes.delete(op.id);
                break;
            case 'add-edge':
                edges.set(op.edge.id, op.edge);
                break;
            case 'remove-edge':
                edges.delete(op.id);
                break;
            case 'add-hyperedge':
                hyperedges.set(op.hyperedge.id, op.hyperedge);
                break;
            case 'remove-hyperedge':
                hyperedges.delete(op.id);
                break;
        }
    }

    return new Kernel({
        nodes: [...nodes.values()],
        edges: [...edges.values()],
        hyperedges: [...hyperedges.values()],
        version,
    });
};

export const encodeOp = (op: KernelOp): string => `data: ${JSON.stringify(op)}\n\n`;

export const decodeOp = (data: string): KernelOp => JSON.parse(data) as KernelOp;
