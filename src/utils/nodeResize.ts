import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import { visibleHeightAtDistance } from './CameraUtils';
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
  const fov = (sg.renderer.camera as THREE.PerspectiveCamera).fov;
  const distance = sg.renderer.camera.position.distanceTo(node.position);

  const visibleHeight = visibleHeightAtDistance(fov, distance);
  const visibleWidth = (visibleHeight * canvas.clientWidth) / canvas.clientHeight;

  return {
    width: (size.x / visibleWidth) * canvas.clientWidth,
    height: (size.y / visibleHeight) * canvas.clientHeight,
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

    const canvas = sg.renderer.renderer.domElement;
    const screen = nodeScreenSize(sg, node);
    this.node = node;
    this.origin = { x: pointerX, y: pointerY };
    this.startSize = { width, height };
    this.scale = { x: screen.width / canvas.clientWidth, y: screen.height / canvas.clientHeight };
    return true;
  }

  /**
   * The size the node takes at the pointer's current position, or null when no resize is running.
   */
  update(pointerX: number, pointerY: number): NodeSize | null {
    if (!this.node) return null;

    const width = clampSize(this.startSize.width + ((pointerX - this.origin.x) / this.scale.x) * 2);
    const height = clampSize(this.startSize.height + ((pointerY - this.origin.y) / this.scale.y) * 2);
    this.node.updateSpec({ data: { ...this.node.data, width, height } });
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
