import type { Kernel, Node } from './kernel';

export const deriveScope = (
  kernel: Kernel,
  keep: (node: Node) => boolean,
  pinned: Iterable<string> = [],
): Kernel => {
  const keepIDs = new Set(pinned);
  for (const node of kernel.nodes) {
    if (keep(node)) keepIDs.add(node.id);
  }
  return kernel.subgraph(keepIDs);
};
