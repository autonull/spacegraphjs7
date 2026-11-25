import type { GraphSpec, GraphImportData, SpaceGraphOptions, ZuiManifest } from '../types';
import { createQuickGraphSpec, type QuickGraphEdge, type QuickGraphNode } from '../core/defaults';
import { wrapError, createLogger, DOMUtils } from '../utils';
import { SpaceGraph } from '../SpaceGraph';

const logger = createLogger('SpaceGraph');

export class StaticMethods {
    static getContainerElement(container: string | HTMLElement): HTMLElement | null {
        return typeof container === 'string' ? document.querySelector(container) : container;
    }

    static checkWebGL(): boolean {
        try {
            const canvas = DOMUtils.createElement('canvas');
            return !!(
                window.WebGLRenderingContext &&
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
            );
        } catch {
            return false;
        }
    }

    static async create(
        container: string | HTMLElement,
        spec: GraphSpec,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const element = StaticMethods.getContainerElement(container);
        if (!element) {
            const error = new Error(
                `[SpaceGraph] Container not found: "${container}". Please ensure the element exists in the DOM before calling SpaceGraph.create().`,
            );
            logger.error(error.message);
            throw error;
        }

        if (!StaticMethods.checkWebGL()) {
            logger.warn(
                'WebGL is not supported by your browser or hardware. Some features may not work as expected.',
            );
        }
        if (!spec || (!spec.nodes && !spec.edges)) {
            logger.warn('[SpaceGraph] Loading an empty graph specification.');
        }

        return StaticMethods.initialize(
            element,
            options,
            'Initialization',
            'Initialization failed during SpaceGraph.create()',
            (sg) => {
                sg.loadSpec(spec).render();
            },
        );
    }

    static async load(
        container: string | HTMLElement,
        data: GraphImportData,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        return StaticMethods.initialize(
            StaticMethods.requireContainer(container),
            options,
            'Import',
            'Failed to import data',
            (sg) => {
                sg.import(data);
                sg.render();
            },
        );
    }

    static async fromURL(
        url: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        if (!url || typeof url !== 'string') throw new Error(`[SpaceGraph] Invalid URL: "${url}"`);
        if (!container) throw new Error('[SpaceGraph] Container is required');

        return StaticMethods.initialize(
            StaticMethods.requireContainer(container),
            options,
            'fromURL',
            `Failed to load from ${url}`,
            async (sg) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
                sg.loadSpec((await response.json()) as GraphSpec).render();
            },
        );
    }

    private static requireContainer(container: string | HTMLElement): HTMLElement {
        const element = StaticMethods.getContainerElement(container);
        if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);
        return element;
    }

    private static async initialize(
        element: HTMLElement,
        options: SpaceGraphOptions,
        operation: string,
        reason: string,
        populate: (sg: SpaceGraph) => void | Promise<void>,
    ): Promise<SpaceGraph> {
        const sg = new SpaceGraph(element, options);
        try {
            await sg.init();
            await populate(sg);
            return sg;
        } catch (err) {
            throw wrapError(err, { namespace: 'SpaceGraph', operation, reason }, logger);
        }
    }

    static async quickGraph(
        container: string | HTMLElement,
        nodes: readonly QuickGraphNode[],
        edges?: readonly QuickGraphEdge[],
        options?: SpaceGraphOptions,
    ): Promise<SpaceGraph> {
        return SpaceGraph.create(container, createQuickGraphSpec(nodes, edges), options);
    }

    static async fromManifest(
        origin: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const manifestUrl = `${origin}/.well-known/zui-manifest.json`;
        const response = await fetch(manifestUrl);
        if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        const manifest = (await response.json()) as ZuiManifest;

        let spec: GraphSpec;
        if (manifest.spec) spec = manifest.spec;
        else if (manifest.spec_url) {
            const specResponse = await fetch(manifest.spec_url);
            if (!specResponse.ok)
                throw new Error(`Failed to fetch spec: ${specResponse.statusText}`);
            spec = await specResponse.json();
        } else throw new Error('Manifest must include spec or spec_url');

        return SpaceGraph.create(container, spec, {
            ...options,
            initialLayout: manifest.initial_layout,
        });
    }
}
