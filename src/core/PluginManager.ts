import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class PluginManager {
    private sg: SpaceGraph;
    public plugins: Map<string, ISpaceGraphPlugin> = new Map();
    private nodeTypes: Map<string, new (...args: unknown[]) => unknown> = new Map();
    private edgeTypes: Map<string, new (...args: unknown[]) => unknown> = new Map();

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
                    console.error(wrappedError);
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
            if (plugin.onPreRender) {
                plugin.onPreRender(delta);
            }
            if (plugin.onPostRender) {
                plugin.onPostRender(delta);
            }
        }
    }

    disposePlugins(): void {
        for (const plugin of this.plugins.values()) {
            if (plugin.dispose) {
                plugin.dispose();
            }
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
                    console.error(`[SpaceGraph] Failed to export plugin "${name}".`, err);
                }
            }
        }
        return state;
    }

    import(data: Record<string, unknown>): void {
        if (!data) return;
        for (const [name, pluginState] of Object.entries(data)) {
            const plugin = this.plugins.get(name);
            if (plugin && plugin.import) {
                try {
                    plugin.import(pluginState);
                } catch (err) {
                    console.error(`[SpaceGraph] Failed to import state for plugin "${name}".`, err);
                }
            }
        }
    }
}
