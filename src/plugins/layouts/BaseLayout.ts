// SpaceGraphJS - Base Layout Plugin
// Abstract base class for layout plugins with common helpers

import { Vector3 } from 'three';
import { BaseSystemPlugin } from '../BaseSystemPlugin';
import type { Node } from '../../nodes/Node';

/**
 * Layout options for apply()
 */
export interface LayoutOptions {
  animate?: boolean;
  duration?: number;
  skipPinned?: boolean;

  [key: string]: unknown;
}

/**
 * Layout configuration; the options a layout was built with.
 */
export type LayoutConfig = LayoutOptions;

/**
 * Abstract base class for layout plugins
 * Provides common helpers for option merging, node selection, and position application
 */
export abstract class BaseLayout<
  Options extends LayoutOptions = LayoutOptions,
> extends BaseSystemPlugin {
  protected config: Options;

  /**
   * A layout that owns the whole graph takes every node, pinned ones included. A tree, a
   * simulation, a radial tree: they place the pinned nodes too.
   */
  protected readonly ownsEveryNode: boolean = false;

  constructor(config: Partial<Options> = {}) {
    super();
    this.config = { ...this.defaultConfig(), ...config } as Options;
  }

  get settings(): Options {
    return this.config;
  }

  /**
   * Applies the layout: the caller's options over the stored config, the nodes the layout owns,
   * then the layout itself.
   */
  async applyLayout(options?: Partial<Options>): Promise<void> {
    const config = this.mergeOptions(options);
    const nodes = this.ownedNodes(config);
    if (!nodes.length) return;
    this.place(nodes, config);
    this.commit(config.duration ?? 1.0);
  }

  /** The plugin-facing name for the same thing. */
  apply = this.applyLayout;

  /**
   * The nodes the layout places. A layout that owns the whole graph — a tree, a simulation —
   * overrides this and takes every node.
   */
  protected ownedNodes(config: Options): Node[] {
    return this.selectNodes(this.ownsEveryNode ? false : (config.skipPinned ?? true));
  }

  /** Where the layout puts its nodes. */
  protected abstract place(nodes: Node[], config: Options): void;

  protected abstract defaultConfig(): Options;

  /**
   * The stored config with the caller's overrides applied. An explicit `undefined` keeps the
   * default, so `{ radiusX: undefined }` never erases a configured value.
   */
  protected mergeOptions(options?: Partial<Options>): Options {
    const merged: Record<string, unknown> = { ...this.config };
    for (const [key, value] of Object.entries(options ?? {})) {
      if (value !== undefined) merged[key] = value;
    }
    return merged as Options;
  }

  /**
   * The nodes a layout may move, with the pinned ones left out unless asked for.
   */
  protected selectNodes(skipPinned = true): Node[] {
    const nodes = Array.from(this.graph.getNodes());
    return skipPinned ? nodes.filter((node) => !this.isPinned(node)) : nodes;
  }

  /**
   * The parent to child map of the graph, plus the id of the node that roots the tree.
   */
  protected buildTree(rootId?: string): { children: Map<string, string[]>; rootId: string } {
    const children = new Map<string, string[]>();
    const parents = new Set<string>();
    for (const id of this.graph.nodes.keys()) children.set(id, []);
    for (const edge of this.graph.getEdges()) {
      children.get(edge.source.id)?.push(edge.target.id);
      parents.add(edge.target.id);
    }

    const ids = [...this.graph.nodes.keys()];
    const resolved =
      rootId && this.graph.nodes.has(rootId)
        ? rootId
        : (ids.find((id) => !parents.has(id)) ?? ids[0] ?? '');
    return { children, rootId: resolved };
  }

  /**
   * Move every node to the position the calculator returns.
   */
  protected positionAll(
    nodes: Node[],
    calculate: (node: Node, index: number, total: number) => Vector3
  ): void {
    nodes.forEach((node, index) => {
      this.applyPosition(node, calculate(node, index, nodes.length));
    });
  }

  /**
   * Move every node to the position the calculator returns.
   * Deterministic and synchronous: hosts that want animation drive it from their own frame loop.
   */
  protected applyPosition(node: Node, target: Vector3): void {
    node.position.copy(target);
    node.object.position.copy(target);
    this.sg?.requestFrame?.();
  }

  /**
   * Copy a node's position onto its world transform, after a simulation moved the position.
   */
  protected syncPosition(node: Node): void {
    node.object.position.copy(node.position);
    this.sg?.requestFrame?.();
  }

  /**
   * Shift a set of nodes so their shared centre sits at the origin.
   */
  protected centerNodes(nodes: Node[]): void {
    if (!nodes.length) return;
    const centre = new Vector3();
    for (const node of nodes) centre.add(node.position);
    centre.divideScalar(nodes.length);
    for (const node of nodes) this.applyPosition(node, node.position.clone().sub(centre));
  }

  /**
   * Settle the edges after a layout and announce it.
   */
  protected commit(duration = this.config.duration ?? 1.0): void {
    for (const edge of this.graph.getEdges()) edge.update?.();
    this.sg?.requestFrame?.();
    this.events.emit('layout:applied', {
      layout: this.id,
      duration,
      timestamp: Date.now(),
    });
  }
}
