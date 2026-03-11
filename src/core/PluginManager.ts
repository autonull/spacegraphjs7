import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class PluginManager {
    private sg: SpaceGraph;
    public plugins: Map<string, ISpaceGraphPlugin> = new Map();
    private nodeTypes: Map<string, any> = new Map();
    private edgeTypes: Map<string, any> = new Map();

    constructor(sg: SpaceGraph) {
        this.sg = sg;
    }

    register(name: string, plugin: ISpaceGraphPlugin): void {
        this.plugins.set(name, plugin);
    }

    registerNodeType(type: string, cls: any): void {
        this.nodeTypes.set(type, cls);
    }

    getNodeType(type: string): any {
        return this.nodeTypes.get(type);
    }

    registerEdgeType(type: string, cls: any): void {
        this.edgeTypes.set(type, cls);
    }

    getEdgeType(type: string): any {
        return this.edgeTypes.get(type);
    }

    getPlugin(name: string): ISpaceGraphPlugin | undefined {
        return this.plugins.get(name);
    }

    async initAll(): Promise<void> {
        try {
            for (const [name, plugin] of this.plugins.entries()) {
                if (plugin.init) {
                    try {
                        await plugin.init(this.sg);
                    } catch (err) {
                        console.error(`[SpaceGraph] Plugin Initialization Error: Failed to initialize plugin "${name}". Continuing without it.`, err);
                    }
                }
            }
        } catch (err) {
            console.error('[SpaceGraph] Critical Error during PluginManager initialization sequence.', err);
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

    export(): Record<string, any> {
        const state: Record<string, any> = {};
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

    import(data: Record<string, any>): void {
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
