import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { NodeSpec, EdgeSpec } from '../types';
import type { EventSystem } from './events/EventSystem';
import type { Graph } from './Graph';
import { createLogger } from '../utils/logger.js';

export interface Plugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void | Promise<void>;
    onPreRender?(delta: number): void;
    onPostRender?(delta: number): void;
    onNodeAdded?(node: Node): void;
    onNodeRemoved?(node: Node): void;
    onEdgeAdded?(edge: Edge): void;
    onEdgeRemoved?(edge: Edge): void;
    dispose?(): void;
    export?(): unknown;
    import?(data: unknown): void;
}

type NodeConstructor = new (sg: SpaceGraph, spec: NodeSpec) => Node;
type EdgeConstructor = new (sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) => Edge;

const logger = createLogger('PluginManager');

export class PluginManager {
    private readonly sg: SpaceGraph;
    public readonly plugins = new Map<string, Plugin>();
    private readonly nodeTypes = new Map<string, NodeConstructor>();
    private readonly edgeTypes = new Map<string, EdgeConstructor>();

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    register(name: string, plugin: Plugin): void {
        if (!name || typeof name !== 'string') {
            throw new Error(
                `[SpaceGraph] Plugin Registration Error: Invalid plugin name "${name}". Name must be a non-empty string.`,
            );
        }
        if (!plugin) {
            throw new Error(
                `[SpaceGraph] Plugin Registration Error: Plugin "${name}" is undefined or null.`,
            );
        }
        this.plugins.set(name, plugin);
    }

    registerNodeType(type: string, cls: NodeConstructor): void {
        this.nodeTypes.set(type, cls);
    }

    getNodeType(type: string): NodeConstructor | undefined {
        return this.nodeTypes.get(type);
    }

    registerEdgeType(type: string, cls: EdgeConstructor): void {
        this.edgeTypes.set(type, cls);
    }

    getEdgeType(type: string): EdgeConstructor | undefined {
        return this.edgeTypes.get(type);
    }

    getPlugin(name: string): Plugin | undefined {
        return this.plugins.get(name);
    }

    hasPlugin(name: string): boolean {
        return this.plugins.has(name);
    }

    getPluginNames(): string[] {
        return [...this.plugins.keys()];
    }

    async initAll(): Promise<void> {
        const errors: Error[] = [];
        for (const [name, plugin] of this.plugins.entries()) {
            try {
                await plugin.init(this.sg, this.sg.graph, this.sg.events);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const wrappedError = new Error(
                    `[SpaceGraph] Plugin Initialization Error: Failed to initialize plugin "${name}". Reason: ${message}`,
                );
                logger.error(wrappedError.message);
                errors.push(wrappedError);
            }
        }
        if (errors.length > 0) {
            const err = new Error(
                `[SpaceGraph] PluginManager initAll fails with ${errors.length} error(s).`,
            );
            (err as Error & { errors: Error[] }).errors = errors;
            throw err;
        }
    }

    updateAll(delta: number): void {
        for (const plugin of this.plugins.values()) {
            try {
                plugin.onPreRender?.(delta);
            } catch (err) {
                logger.error('Plugin onPreRender error:', err);
            }
        }
        for (const plugin of this.plugins.values()) {
            try {
                plugin.onPostRender?.(delta);
            } catch (err) {
                logger.error('Plugin onPostRender error:', err);
            }
        }
    }

    unregister(name: string): boolean {
        const plugin = this.plugins.get(name);
        if (!plugin) return false;
        plugin.dispose?.();
        this.plugins.delete(name);
        return true;
    }

    disposePlugins(): void {
        for (const plugin of this.plugins.values()) {
            plugin.dispose?.();
        }
        this.plugins.clear();
    }

    export(): Record<string, unknown> {
        const state: Record<string, unknown> = {};
        for (const [name, plugin] of this.plugins.entries()) {
            if (plugin.export) {
                try {
                    state[name] = plugin.export();
                } catch (err) {
                    logger.error('Failed to export plugin "%s".', name, err);
                }
            }
        }
        return state;
    }

    import(data: Record<string, unknown>): void {
        if (!data) return;
        for (const [name, pluginState] of Object.entries(data)) {
            const plugin = this.plugins.get(name);
            if (plugin?.import) {
                try {
                    plugin.import(pluginState);
                } catch (err) {
                    logger.error('Failed to import state for plugin "%s".', name, err);
                }
            }
        }
    }
}
