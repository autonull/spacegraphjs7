import type { GraphSpec, GraphImportData, SpaceGraphOptions, ZuiManifest } from '../types';
import { createQuickGraphSpec } from '../core/defaults';
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

        try {
            const sg = new SpaceGraph(element, options);
            await sg.init();

            if (!spec || (!spec.nodes && !spec.edges)) {
                logger.warn('[SpaceGraph] Loading an empty graph specification.');
            }

            sg.loadSpec(spec).render();
            return sg;
        } catch (err) {
            const wrapped = wrapError(
                err,
                {
                    namespace: 'SpaceGraph',
                    operation: 'Initialization',
                    reason: 'Initialization failed during SpaceGraph.create()',
                },
                logger,
            );
            throw wrapped;
        }
    }

    static async load(
        container: string | HTMLElement,
        data: GraphImportData,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        const element = StaticMethods.getContainerElement(container);
        if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);

        const sg = new SpaceGraph(element, options);
        try {
            await sg.init();
            sg.import(data);
            sg.render();
        } catch (err) {
            throw wrapError(
                err,
                { namespace: 'SpaceGraph', operation: 'Import', reason: 'Failed to import data' },
                logger,
            );
        }
        return sg;
    }

    static async fromURL(
        url: string,
        container: string | HTMLElement,
        options: SpaceGraphOptions = {},
    ): Promise<SpaceGraph> {
        if (!url || typeof url !== 'string') throw new Error(`[SpaceGraph] Invalid URL: "${url}"`);
        if (!container) throw new Error('[SpaceGraph] Container is required');

        const element = StaticMethods.getContainerElement(container);
        if (!element) throw new Error(`[SpaceGraph] Container not found: "${container}"`);

        const sg = new SpaceGraph(element, options);
        try {
            await sg.init();
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            sg.loadSpec((await response.json()) as GraphSpec).render();
        } catch (err) {
            throw wrapError(
                err,
                {
                    namespace: 'SpaceGraph',
                    operation: 'fromURL',
                    reason: `Failed to load from ${url}`,
                },
                logger,
            );
        }
        return sg;
    }

    static async quickGraph(
        container: string | HTMLElement,
        nodes: Array<{
            id: string;
            label?: string;
            position?: [number, number, number];
            data?: Record<string, unknown>;
        }>,
        edges?: Array<{ id: string; source: string; target: string }>,
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
