import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
export declare class PluginManager {
    private sg;
    plugins: Map<string, ISpaceGraphPlugin>;
    private nodeTypes;
    private edgeTypes;
    constructor(sg: SpaceGraph);
    register(name: string, plugin: ISpaceGraphPlugin): void;
    registerNodeType(type: string, cls: any): void;
    getNodeType(type: string): any;
    registerEdgeType(type: string, cls: any): void;
    getEdgeType(type: string): any;
    getPlugin(name: string): ISpaceGraphPlugin | undefined;
    initAll(): Promise<void>;
    updateAll(delta: number): void;
    disposePlugins(): void;
}
