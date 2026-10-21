import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import { visibleWorldExtent } from './CameraUtils';
import { clamp } from './math';

export const MIN_NODE_SIZE = 40;
export const MAX_NODE_SIZE = 2000;

export interface NodeSize {
  width: number;
  height: number;
}

/**
 * The size a node covers on screen, in pixels.
 */
export function nodeScreenSize(sg: SpaceGraph, node: Node): NodeSize {
  const box = new THREE.Box3().setFromObject(node.object);
  const size = box.getSize(new THREE.Vector3());

  const canvas = sg.renderer.renderer.domElement;
  const camera = sg.renderer.camera as THREE.PerspectiveCamera;
  const distance = camera.position.distanceTo(node.position);

  const extent = visibleWorldExtent(camera, distance, canvas.clientWidth / canvas.clientHeight);

  return {
    width: (size.x / extent.width) * canvas.clientWidth,
    height: (size.y / extent.height) * canvas.clientHeight,
  };
}

/**
 * A node resize in progress: the node, where the drag began, and the scale that turns screen
 * pixels into world units.
 */
export class NodeResizer {
  private node: Node | null = null;
  private origin = { x: 0, y: 0 };
  private startSize: NodeSize = { width: 0, height: 0 };
  private startPosition = { x: 0, y: 0 };
  private scale = { x: 1, y: 1 };

  get active(): boolean {
    return this.node !== null;
  }

  get resizedNode(): Node | null {
    return this.node;
  }

  /**
   * Begin resizing a node. Only a node that carries a width and a height can be resized.
   */
  start(sg: SpaceGraph, node: Node, pointerX: number, pointerY: number): boolean {
    const width = (node.data as Record<string, unknown>).width as number | undefined;
    const height = (node.data as Record<string, unknown>).height as number | undefined;
    if (!width || !height) return false;

    const screen = nodeScreenSize(sg, node);
    this.node = node;
    this.origin = { x: pointerX, y: pointerY };
    this.startSize = { width, height };
    this.startPosition = { x: node.position.x, y: node.position.y };
    // How many world units one screen pixel covers on this node: the world size over the size on
    // screen. The pointer's travel is in pixels, the node's size is in world units.
    this.scale = { x: width / (screen.width || 1), y: height / (screen.height || 1) };
    return true;
  }

  /**
   * The size the node takes at the pointer's current position, or null when no resize is running.
   *
   * The handle sits at the bottom right corner, so the corner under the pointer follows it and the
   * opposite corner stays where it was. The node's origin is its centre, so a node that grows by
   * `d` moves by half of `d` to keep the other corner still.
   */
  update(pointerX: number, pointerY: number): NodeSize | null {
    if (!this.node) return null;

    const width = clampSize(this.startSize.width + (pointerX - this.origin.x) * this.scale.x);
    const height = clampSize(this.startSize.height + (pointerY - this.origin.y) * this.scale.y);

    // Only the size travels: the card's own content is the host's, and it must not be rewritten.
    this.node.updateSpec({ data: { width, height } });
    // The origin is the node's centre, so a node that grows by `d` moves by half of `d` to keep the
    // corner opposite the handle still.
    this.node.updatePosition(
      this.startPosition.x + (width - this.startSize.width) / 2,
      this.startPosition.y - (height - this.startSize.height) / 2,
      this.node.position.z
    );

    return { width, height };
  }

  /**
   * Finish the resize and hand back the node that was resized.
   */
  end(): Node | null {
    const node = this.node;
    this.node = null;
    return node;
  }
}

function clampSize(size: number): number {
  return clamp(size, MIN_NODE_SIZE, MAX_NODE_SIZE);
}
