import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../types/plugin';
import { ConfigurationError, wrapError } from '../utils/error';
import { createLogger } from '../utils/logger';
import { TypeRegistry } from './TypeRegistry';

export type { Plugin } from '../types/plugin';

const logger = createLogger('PluginManager');

/** A plugin id, plugin instance, or plugin class. Classes resolve to their registered instance. */
export type PluginKey = string | Plugin | (abstract new (...args: never[]) => Plugin);

export class PluginManager {
    readonly plugins: Map<string, Plugin> = new Map();
    readonly #initialized = new Set<string>();

    constructor(readonly sg: SpaceGraph) {}

    #idOf(key: PluginKey): string | undefined {
        if (typeof key === 'string') return key;
        for (const [name, plugin] of this.plugins) {
            if (typeof key === 'function' ? plugin.constructor === key : plugin === key) return name;
        }
        return typeof key === 'function' ? undefined : key.id;
    }

    get<T extends Plugin = Plugin>(key: PluginKey): T | undefined {
        const id = this.#idOf(key);
        return id ? (this.plugins.get(id) as T | undefined) : undefined;
    }

    has(key: PluginKey): boolean {
        const id = this.#idOf(key);
        return id !== undefined && this.plugins.has(id);
    }

    require<T extends Plugin = Plugin>(key: PluginKey): T {
        const plugin = this.get<T>(key);
        if (!plugin) {
            const label =
                typeof key === 'function' ? key.name : typeof key === 'string' ? key : key.id;
            const available = Array.from(this.plugins.keys()).join(', ') || 'none';
            throw new ConfigurationError(
                `[PluginManager] Plugin "${label}" is not registered. Available: ${available}`,
            );
        }
        return plugin;
    }

    async use(plugin: Plugin): Promise<void> {
        this.register(plugin.id, plugin);
        if (this.#initialized.has(plugin.id)) return;
        await this.#initOne(plugin.id, plugin);
    }

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
        this.#initialized.delete(name);
        return true;
    }

    *[Symbol.iterator](): Generator<[string, Plugin]> {
        yield* this.plugins.entries();
    }

    async #initOne(name: string, plugin: Plugin): Promise<void> {
        const initResult = plugin.init?.(this.sg, this.sg.graph, this.sg.events);
        const promise = initResult instanceof Promise ? initResult : Promise.resolve();
        await promise.then(
            () => undefined,
            (err) => {
                const wrapped = wrapError(err, {
                    namespace: 'SpaceGraph',
                    operation: 'Plugin Initialization',
                    reason: `Failed to initialize plugin "${name}" (v${plugin.version}). Check if dependencies are met or configuration is valid.`,
                });
                logger.error(
                    `${wrapped.message}: ${err instanceof Error ? err.stack : String(err)}`,
                );
                throw wrapped;
            },
        );
        this.#initialized.add(name);
    }

    async initAll(): Promise<void> {
        const results = await Promise.allSettled(
            [...this.plugins.entries()]
                .filter(([name]) => !this.#initialized.has(name))
                .map(([name, plugin]) => this.#initOne(name, plugin)),
        );

        const errors = results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map((r) => r.reason);

        if (errors.length > 0) {
            const errorMessage = `[SpaceGraph] PluginManager failed to initialize ${errors.length} plugin(s): ${errors.map((e) => e.message).join('; ')}`;
            const err = new Error(errorMessage) as Error & { errors: Error[] };
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

    find(predicate: (plugin: Plugin) => boolean): Plugin | undefined {
        return this.filter(predicate)[0];
    }

    filter(predicate: (plugin: Plugin) => boolean): Plugin[] {
        const result: Plugin[] = [];
        for (const plugin of this.plugins.values()) {
            if (predicate(plugin)) result.push(plugin);
        }
        return result;
    }
}
