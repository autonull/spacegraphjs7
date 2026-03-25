// SpaceGraphJS v7.0 - Factory Functions
// Public API for creating SpaceGraph instances

import { Graph } from './graph/Graph';
import { EventSystem, PluginEventBus } from './core/events/EventSystem';
import { PluginRegistry } from './core/plugins/PluginRegistry';
import { RenderingSystem } from './core/renderer/RenderingSystem';
import { VisionSystem } from './vision/VisionSystem';
import { SpaceGraph, type SpaceGraphOptions } from './core/SpaceGraph';
import { TypeRegistry } from './core/TypeRegistry';
import type { GraphSpec, NodeSpec, EdgeSpec } from './graph/types';

/**
 * Create a SpaceGraph instance
 */
export async function createSpaceGraph(
  container: HTMLElement | string,
  spec: GraphSpec,
  options: SpaceGraphOptions = {}
): Promise<SpaceGraph> {
  // Resolve container
  const element = typeof container === 'string'
    ? document.querySelector(container)
    : container;

  if (!element) {
    throw new Error(`[createSpaceGraph] Container not found: ${container}`);
  }

  // Create core systems
  const graph = new Graph();
  const events = new EventSystem();
  const pluginBus = new PluginEventBus();
  const plugins = new PluginRegistry();
  
  const vision = new VisionSystem(options.vision);
  const renderer = new RenderingSystem(element, options.rendering);

  // Initialize plugin registry
  plugins.init(graph, events, pluginBus);

  // Create SpaceGraph
  const sg = new SpaceGraph(
    element,
    graph,
    events,
    vision,
    plugins,
    renderer,
    options
  );

  // Load spec
  loadGraphSpec(graph, spec);

  // Emit ready event
  events.emit('plugin:ready', { pluginId: 'spacegraph', timestamp: Date.now() });

  return sg;
}

/**
 * Create a SpaceGraph from a URL
 */
export async function createSpaceGraphFromURL(
  url: string,
  container: HTMLElement | string,
  options: SpaceGraphOptions = {}
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
  options: SpaceGraphOptions = {}
): Promise<SpaceGraph> {
  // Fetch manifest
  const manifestUrl = `${origin}/.well-known/zui-manifest.json`;
  const response = await fetch(manifestUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ZUI manifest: ${response.statusText}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifest: Record<string, any> = await response.json();

  // Get graph spec
  let spec: GraphSpec;
  if (manifest.spec) {
    spec = manifest.spec;
  } else if (manifest.spec_url) {
    const specResponse = await fetch(manifest.spec_url);
    if (!specResponse.ok) {
      throw new Error(`Failed to fetch spec_url: ${specResponse.statusText}`);
    }
    spec = await specResponse.json();
  } else {
    throw new Error('Manifest must include spec or spec_url');
  }

  // Create graph
  const sg = await createSpaceGraph(container, spec, {
    ...options,
    initialLayout: manifest.initial_layout
  });

  // TODO: Connect to stream if available
  if (manifest.stream_url) {
    console.log('[createSpaceGraphFromManifest] Stream support not yet implemented');
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
  }>
): Promise<SpaceGraph> {
  const spec: GraphSpec = {
    nodes: nodes.map(n => ({
      id: n.id,
      type: 'ShapeNode',
      label: n.label,
      position: n.position,
      data: n.data
    })),
    edges: edges?.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'Edge'
    })) ?? []
  };

  return createSpaceGraph(container, spec);
}

/**
 * Load graph spec into graph
 */
function loadGraphSpec(graph: Graph, spec: GraphSpec): void {
  graph.fromJSON(spec);
}
