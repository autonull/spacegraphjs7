import type { Node } from '../../nodes/Node';

/** The payload of a drag event: the node being dragged and where it is. */
export function nodeDragPayload(node: Node): {
  node: Node;
  position: [number, number, number];
} {
  return { node, position: [node.position.x, node.position.y, node.position.z] };
}
