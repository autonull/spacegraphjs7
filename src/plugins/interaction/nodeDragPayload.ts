import type { Node } from '../../nodes/Node';

export type NodeDragPosition = { id: string; position: [number, number, number] };

/** The payload of a drag event: the node being dragged and where it is. */
export function nodeDragPayload(
  node: Node,
  nodes?: Iterable<Node>
): {
  node: Node;
  position: [number, number, number];
  nodes: NodeDragPosition[];
} {
  const moved = nodes ? [...nodes] : [node];

  return {
    node,
    position: [node.position.x, node.position.y, node.position.z],
    nodes: moved.map((item) => ({
      id: item.id,
      position: [item.position.x, item.position.y, item.position.z],
    })),
  };
}
