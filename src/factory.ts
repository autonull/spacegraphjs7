// SpaceGraphJS - Factory Functions
// Public API for creating SpaceGraph instances

import { SpaceGraph } from './SpaceGraph';
import type { SpaceGraphOptions } from './types';
import type { GraphSpec } from './types';

export { SpaceGraph };
export type { SpaceGraphOptions };

/**
 * Create a SpaceGraph instance
 */
export async function createSpaceGraph(
    container: HTMLElement | string,
    spec: GraphSpec,
    options: SpaceGraphOptions = {},
): Promise<SpaceGraph> {
    const element =
        typeof container === 'string'
            ? (document.querySelector(container) as HTMLElement | null)
            : container;

    if (!element) {
        throw new Error(`[createSpaceGraph] Container not found: ${container}`);
    }

    const sg = await SpaceGraph.create(element, spec, options);
    return sg;
}

/**
 * Create a SpaceGraph from a URL
 */
export async function createSpaceGraphFromURL(
    url: string,
    container: HTMLElement | string,
    options: SpaceGraphOptions = {},
): Promise<SpaceGraph> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch graph spec: ${response.statusText}`);
    }
    const spec: GraphSpec = await response.json();
    return createSpaceGraph(container, spec, options);
}

/**
 * Create a SpaceGraph from a ZUI manifest
 */
export async function createSpaceGraphFromManifest(
    origin: string,
    container: HTMLElement | string,
    options: SpaceGraphOptions = {},
): Promise<SpaceGraph> {
    const manifestUrl = `${origin}/.well-known/zui-manifest.json`;
    const response = await fetch(manifestUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch ZUI manifest: ${response.statusText}`);
    }

    const manifest = (await response.json()) as Record<string, unknown>;

    let spec: GraphSpec;
    if (manifest.spec) {
        spec = manifest.spec as GraphSpec;
    } else if (manifest.spec_url) {
        const specResponse = await fetch(manifest.spec_url as string);
        if (!specResponse.ok) {
            throw new Error(`Failed to fetch spec_url: ${specResponse.statusText}`);
        }
        spec = await specResponse.json();
    } else {
        throw new Error('Manifest must include spec or spec_url');
    }

    const sg = await createSpaceGraph(container, spec, {
        ...options,
        initialLayout: manifest.initial_layout as string | undefined,
    });

    if (manifest.stream_url) {
        console.warn('[createSpaceGraphFromManifest] Stream support not yet implemented');
    }

    return sg;
}

/**
 * Quick graph prototype API
 */
export async function quickGraph(
    container: HTMLElement | string,
    nodes: Array<{
        id: string;
        label?: string;
        position?: [number, number, number];
        data?: Record<string, unknown>;
    }>,
    edges?: Array<{
        id: string;
        source: string;
        target: string;
    }>,
): Promise<SpaceGraph> {
    const spec: GraphSpec = {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: 'ShapeNode',
            label: n.label,
            position: n.position,
            data: n.data,
        })),
        edges:
            edges?.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: 'Edge',
            })) ?? [],
    };

    return createSpaceGraph(container, spec);
}
