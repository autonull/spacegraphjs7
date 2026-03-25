import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PluginManager');

export class PluginManager {
    private readonly sg: SpaceGraph;
    public readonly plugins = new Map<string, ISpaceGraphPlugin>();
    private readonly nodeTypes = new Map<string, new (...args: unknown[]) => unknown>();
    private readonly edgeTypes = new Map<string, new (...args: unknown[]) => unknown>();

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    register(name: string, plugin: ISpaceGraphPlugin): void {
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

    registerNodeType(type: string, cls: new (...args: unknown[]) => unknown): void {
        this.nodeTypes.set(type, cls);
    }

    getNodeType(type: string): new (...args: unknown[]) => unknown {
        return this.nodeTypes.get(type)!;
    }

    registerEdgeType(type: string, cls: new (...args: unknown[]) => unknown): void {
        this.edgeTypes.set(type, cls);
    }

    getEdgeType(type: string): new (...args: unknown[]) => unknown {
        return this.edgeTypes.get(type)!;
    }

    getPlugin(name: string): ISpaceGraphPlugin | undefined {
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
            if (plugin.init) {
                try {
                    await plugin.init(this.sg);
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    const wrappedError = new Error(
                        `[SpaceGraph] Plugin Initialization Error: Failed to initialize plugin "${name}". Reason: ${message}`,
                    );
                    logger.error(wrappedError);
                    errors.push(wrappedError);
                }
            }
        }
        if (errors.length > 0) {
            const message = `[SpaceGraph] PluginManager initAll failed with ${errors.length} error(s).`;
            const err = new Error(message);
            (err as Error & { errors: Error[] }).errors = errors;
            throw err;
        }
    }

    updateAll(delta: number): void {
        for (const plugin of this.plugins.values()) {
            plugin.onPreRender?.(delta);
            plugin.onPostRender?.(delta);
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
