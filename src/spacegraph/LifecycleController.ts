import { applyDefaultInputConfig } from '../input/DefaultInputConfig';
import { forwardGraphEvents } from '../core/forwardEvents';
import { Graph } from '../core/Graph';
import { WebGLRenderer } from '../core/WebGLRenderer';
import { Selection } from '../core/Selection';
import { CameraControls } from '../core/CameraControls';
import { ObjectPoolManager } from '../core/ObjectPoolManager';
import { PluginManager } from '../core/PluginManager';
import { VisionManager } from '../core/VisionManager';
import { ErgonomicsAPI } from '../core/Ergonomics';
import { EventEmitter } from '../core/EventEmitter';
import {
    DEFAULT_CHROME_PLUGINS,
    DEFAULT_EDGE_TYPES,
    DEFAULT_LAYOUT_PLUGINS,
    DEFAULT_NODE_TYPES,
    DEFAULT_SYSTEM_PLUGINS,
    nodeTypeName,
    type PluginCtor,
} from '../core/defaults';
import { SpaceGraph } from '../SpaceGraph';
import type { SpaceGraphEvents, SpaceGraphOptions } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('LifecycleController');

export class LifecycleController {
    #initialized = false;
    #disposed = false;

    constructor(readonly sg: SpaceGraph) {}

    get initialized(): boolean {
        return this.#initialized;
    }

    get disposed(): boolean {
        return this.#disposed;
    }

    #setupKeyboard(): void {
        const keyboard = this.sg.options.keyboard ?? 'container';
        if (keyboard === 'container' && !this.sg.container.hasAttribute('tabindex')) {
            this.sg.container.tabIndex = 0;
        }
    }

    #subscribeToGraphEvents(): void {
        const schedule = () => this.sg.requestFrame();
        for (const event of [
            'node:added',
            'node:removed',
            'node:updated',
            'edge:added',
            'edge:removed',
            'edge:updated',
            'graph:cleared',
            'selection:changed',
        ] as const) {
            this.sg.events.on(event, schedule);
        }
    }

    #registerDefaults(): void {
        const registerPlugins = (plugins: [PluginCtor, string][]) => {
            for (const [cls, name] of plugins) this.sg.pluginManager.register(name, new cls());
        };

        for (const cls of DEFAULT_NODE_TYPES)
            this.sg.pluginManager.registerNodeType(nodeTypeName(cls), cls as any);
        for (const cls of DEFAULT_EDGE_TYPES)
            this.sg.pluginManager.registerEdgeType((cls as any).typeName || cls.name, cls as any);
        registerPlugins(DEFAULT_LAYOUT_PLUGINS);
        registerPlugins(DEFAULT_SYSTEM_PLUGINS);
        if (this.sg.options.chrome) registerPlugins(DEFAULT_CHROME_PLUGINS);
        for (const plugin of this.sg.options.plugins ?? [])
            this.sg.pluginManager.register(plugin.id, plugin as any);
        this.sg.registerFingerings();
    }

    async init(): Promise<void> {
        if (this.#initialized || this.#disposed) return;
        this.#initialized = true;
        this.sg.renderer.init();
        this.sg.renderer.syncSize();
        this.#registerDefaults();
        await this.sg.pluginManager.initAll();
        this.sg.events.emit('ready', { timestamp: Date.now() });
    }

    dispose(): void {
        if (this.#disposed) return;
        this.#disposed = true;
        this.sg.animationController.dispose();
        this.sg.pluginManager?.disposePlugins();
        this.sg.input?.dispose();
        this.sg.cameraControls?.dispose();
        this.sg.vision?.dispose();
        this.sg.graph?.clear();
        this.sg.renderer?.dispose();
        this.sg.events?.clear();
        SpaceGraph.instances.delete(this.sg);
    }

    destroy(): void {
        this.dispose();
    }

    createCoreObjects(): void {
        this.sg.poolManager = new ObjectPoolManager();
        this.sg.events = new EventEmitter<SpaceGraphEvents>();
        this.sg.vision = new VisionManager(this.sg);
        this.sg.pluginManager = new PluginManager(this.sg);
        this.sg.renderer = new WebGLRenderer(this.sg, this.sg.container, {
            ...this.sg.options.render,
            backgroundColor:
                this.sg.options.theme?.background ?? this.sg.options.render?.backgroundColor,
        });
        this.sg.graph = new Graph(this.sg);
        this.sg.selection = new Selection(this.sg);
        this.sg.ergo = new ErgonomicsAPI(this.sg);
        this.sg.cameraControls = new CameraControls(this.sg.renderer.camera, this.sg.container, {
            keyboard: this.sg.options.keyboard ?? 'container',
            ...this.sg.options.cameraControls,
        } as any);
        this.sg.cameraControls.sg = this.sg;
        this.sg.input = this.sg.inputManagerFactory({ sg: this.sg, events: this.sg.events });
        applyDefaultInputConfig(this.sg.input, this.sg);
        forwardGraphEvents(this.sg.graph, this.sg.events);
        this.#subscribeToGraphEvents();
        this.#registerDefaults();
    }
}
