import { Kernel } from './kernel';
import type { Edge, Hyperedge, Node } from './kernel';

export type Random = () => number;

export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export type RandomKernelOptions = {
  readonly nodes?: number;
  readonly edges?: number;
  readonly hyperedges?: number;
};

export const randomKernel = (
  seed: number,
  options: RandomKernelOptions = {},
): Kernel => {
  const random = createRandom(seed);
  const nodeCount = options.nodes ?? 10;
  const edgeCount = options.edges ?? 12;
  const hyperedgeCount = options.hyperedges ?? 2;
  const nodes: Node[] = Array.from({ length: nodeCount }, (_, index) => ({
    id: `n${index}`,
    kind: 'node',
    label: `Node ${index}`,
  }));
  const edges: Edge[] =
    nodeCount === 0
      ? []
      : Array.from({ length: edgeCount }, (_, index) => ({
          id: `e${index}`,
          kind: 'edge',
          source: `n${Math.floor(random() * nodeCount)}`,
          target: `n${Math.floor(random() * nodeCount)}`,
        }));
  const hyperedges: Hyperedge[] =
    nodeCount === 0
      ? []
      : Array.from({ length: hyperedgeCount }, (_, index) => {
          const count = 2 + Math.floor(random() * Math.max(1, Math.min(4, nodeCount)));
          return {
            id: `h${index}`,
            kind: 'hyperedge',
            nodes: Array.from(
              { length: count },
              () => `n${Math.floor(random() * nodeCount)}`,
            ),
          };
        });
  return new Kernel({ nodes, edges, hyperedges });
};
