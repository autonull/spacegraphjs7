import type { Node } from '../nodes/Node';

type NodeParentSource = {
  data?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  parent?: string;
};

/**
 * The id of a node's parent, as the node declares it: in its data, in its parameters, or on the
 * node itself.
 */
export function parentIdOf(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  const source = node as unknown as NodeParentSource;
  return (source.data?.parent ?? source.parameters?.parent ?? source.parent) as
    | string
    | undefined;
}
