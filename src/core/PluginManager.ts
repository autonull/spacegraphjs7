import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';
import type { EventSystem } from './events/EventSystem';
import type { Graph } from './Graph';
import { createLogger } from '../utils/logger';
import { wrapError } from '../utils/error';
import { TypeRegistry } from './TypeRegistry';

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

export interface PluginMetadata {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    dependencies?: string[];
}

const logger = createLogger('PluginManager');

export class PluginManager {
    private readonly plugins: Map<string, Plugin> = new Map();

    constructor(private readonly sg: SpaceGraph) {}

    register(name: string, plugin: Plugin): this {
        if (!name || typeof name !== 'string') {
            throw new Error(
                `[SpaceGraph] Plugin Registration Error: Invalid plugin name "${name}".`,
            );
        }
        if (!plugin) {
            throw new Error(
                `[SpaceGraph] Plugin Registration Error: Plugin "${name}" is undefined or null.`,
            );
        }
        this.plugins.set(name, plugin);
        return this;
    }

    unregister(name: string): boolean {
        const plugin = this.plugins.get(name);
        if (!plugin) return false;
        plugin.dispose?.();
        this.plugins.delete(name);
        return true;
    }

    get<T extends Plugin = Plugin>(name: string): T | undefined {
        return this.plugins.get(name) as T | undefined;
    }

    has(name: string): boolean {
        return this.plugins.has(name);
    }

    get pluginNames(): string[] {
        return Array.from(this.plugins.keys());
    }

    get pluginCount(): number {
        return this.plugins.size;
    }

    *[Symbol.iterator](): Generator<[string, Plugin]> {
        yield* this.plugins.entries();
    }

    async initAll(): Promise<void> {
        const errors: Error[] = [];
        for (const [name, plugin] of this.plugins) {
            try {
                await plugin.init(this.sg, this.sg.graph, this.sg.events);
            } catch (err) {
                const wrapped = wrapError(err, {
                    namespace: 'SpaceGraph',
                    operation: 'Plugin Initialization',
                    reason: `Failed to initialize plugin "${name}"`,
                });
                logger.error(wrapped.message);
                errors.push(wrapped);
            }
        }
        if (errors.length > 0) {
            const err = new Error(
                `[SpaceGraph] PluginManager initAll fails with ${errors.length} error(s).`,
            ) as Error & { errors: Error[] };
            err.errors = errors;
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

    disposePlugins(): void {
        for (const plugin of this.plugins.values()) {
            plugin.dispose?.();
        }
        this.plugins.clear();
    }

    export(): Record<string, unknown> {
        const state: Record<string, unknown> = {};
        for (const [name, plugin] of this.plugins) {
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
        for (const [name, state] of Object.entries(data)) {
            const plugin = this.plugins.get(name);
            if (plugin?.import) {
                try {
                    plugin.import(state);
                } catch (err) {
                    logger.error('Failed to import state for plugin "%s".', name, err);
                }
            }
        }
    }

    registerNodeType(type: string, cls: import('./TypeRegistry').NodeConstructor): void {
        TypeRegistry.getInstance().registerNode(type, cls);
    }

    getNodeType(type: string): import('./TypeRegistry').NodeConstructor | undefined {
        return TypeRegistry.getInstance().getNodeConstructor(type);
    }

    registerEdgeType(type: string, cls: import('./TypeRegistry').EdgeConstructor): void {
        TypeRegistry.getInstance().registerEdge(type, cls);
    }

    getEdgeType(type: string): import('./TypeRegistry').EdgeConstructor | undefined {
        return TypeRegistry.getInstance().getEdgeConstructor(type);
    }

    getPlugin = this.get;
    hasPlugin = this.has;
    getPluginNames = this.pluginNames;

    find(predicate: (plugin: Plugin) => boolean): Plugin | undefined {
        for (const plugin of this.plugins.values()) {
            if (predicate(plugin)) return plugin;
        }
        return undefined;
    }

    filter(predicate: (plugin: Plugin) => boolean): Plugin[] {
        const result: Plugin[] = [];
        for (const plugin of this.plugins.values()) {
            if (predicate(plugin)) result.push(plugin);
        }
        return result;
    }
}