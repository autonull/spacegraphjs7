// SpaceGraphJS v7.0 - Plugin System
// Plugin interface, registry, and event bus for plugin communication

import type { Graph } from '../../graph/Graph';
import type { Node } from '../../graph/Node';
import type { Edge } from '../../graph/Edge';
import type { EventSystem, PluginEventBus } from '../events/EventSystem';

/**
 * Plugin context provided to all plugins during initialization
 */
export interface PluginContext {
  readonly graph: Graph;
  readonly events: EventSystem;
  readonly pluginBus: PluginEventBus;
  readonly config: Readonly<Record<string, unknown>>;
}

/**
 * Base plugin interface
 * All plugins must implement this interface
 */
export interface Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /**
   * Initialize the plugin
   * Called once when the plugin is registered
   */
  init(context: PluginContext): void | Promise<void>;

  /**
   * Clean up plugin resources
   * Called when the plugin is disposed
   */
  dispose?(): void;

  /**
   * Called before each frame render
   * @param delta - Time since last frame in seconds
   */
  onPreFrame?(delta: number): void;

  /**
   * Called after each frame render
   * @param delta - Time since last frame in seconds
   */
  onPostFrame?(delta: number): void;

  /**
   * Called when a node is added to the graph
   */
  onNodeAdded?(node: Node): void;

  /**
   * Called when a node is removed from the graph
   */
  onNodeRemoved?(node: Node): void;

  /**
   * Called when an edge is added to the graph
   */
  onEdgeAdded?(edge: Edge): void;

  /**
   * Called when an edge is removed from the graph
   */
  onEdgeRemoved?(edge: Edge): void;

  /**
   * Export plugin state for serialization
   */
  export?(): unknown;

  /**
   * Import plugin state from serialization
   */
  import?(data: unknown): void;
}

/**
 * Plugin registry for managing plugin lifecycle
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  private graph!: Graph;
  private events!: EventSystem;
  private pluginBus!: PluginEventBus;
  private defaultConfig: Record<string, Record<string, unknown>> = {};

  /**
   * Initialize the registry
   */
  init(graph: Graph, events: EventSystem, pluginBus: PluginEventBus): void {
    this.graph = graph;
    this.events = events;
    this.pluginBus = pluginBus;
  }

  /**
   * Set default configuration for a plugin
   */
  setConfig(pluginId: string, config: Record<string, unknown>): void {
    this.defaultConfig[pluginId] = config;
  }

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" is already registered.`);
      return;
    }

    const context: PluginContext = {
      graph: this.graph,
      events: this.events,
      pluginBus: this.pluginBus,
      config: Object.freeze(this.defaultConfig[plugin.id] ?? {})
    };

    try {
      // Initialize plugin
      const initResult = plugin.init(context);
      if (initResult instanceof Promise) {
        await initResult;
      }

      this.plugins.set(plugin.id, plugin);
      this.contexts.set(plugin.id, context);

      // Emit plugin ready event
      this.events.emit('plugin:ready', {
        pluginId: plugin.id,
        timestamp: Date.now()
      });

      // Subscribe to graph events for plugin hooks
      this.setupGraphEventListeners(plugin);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[PluginRegistry] Failed to initialize plugin "${plugin.id}":`, err);
      
      this.events.emit('plugin:error', {
        pluginId: plugin.id,
        error: err,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Set up graph event listeners for a plugin
   */
  private setupGraphEventListeners(plugin: Plugin): void {
    if (plugin.onNodeAdded || plugin.onNodeRemoved) {
      this.events.on('node:added', ({ node }) => {
        if (plugin.onNodeAdded) plugin.onNodeAdded(node as Node);
      });
      this.events.on('node:removed', ({ id }) => {
        if (plugin.onNodeRemoved) {
          // Create a minimal node object for the hook
          plugin.onNodeRemoved({ id } as Node);
        }
      });
    }

    if (plugin.onEdgeAdded || plugin.onEdgeRemoved) {
      this.events.on('edge:added', ({ edge }) => {
        if (plugin.onEdgeAdded) plugin.onEdgeAdded(edge as Edge);
      });
      this.events.on('edge:removed', ({ id }) => {
        if (plugin.onEdgeRemoved) {
          plugin.onEdgeRemoved({ id } as Edge);
        }
      });
    }
  }

  /**
   * Get a plugin by ID
   */
  get<T extends Plugin>(pluginId: string): T | undefined {
    return this.plugins.get(pluginId) as T | undefined;
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Call onPreFrame hook on all plugins
   */
  updatePreFrame(delta: number): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onPreFrame) {
        try {
          plugin.onPreFrame(delta);
        } catch (err) {
          console.error(`[PluginRegistry] Plugin "${plugin.id}" onPreFrame failed:`, err);
        }
      }
    }
  }

  /**
   * Call onPostFrame hook on all plugins
   */
  updatePostFrame(delta: number): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.onPostFrame) {
        try {
          plugin.onPostFrame(delta);
        } catch (err) {
          console.error(`[PluginRegistry] Plugin "${plugin.id}" onPostFrame failed:`, err);
        }
      }
    }
  }

  /**
   * Export all plugin states
   */
  export(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    
    for (const [id, plugin] of this.plugins.entries()) {
      if (plugin.export) {
        try {
          state[id] = plugin.export();
        } catch (err) {
          console.error(`[PluginRegistry] Plugin "${id}" export failed:`, err);
        }
      }
    }

    return state;
  }

  /**
   * Import plugin states
   */
  import(state: Record<string, unknown>): void {
    for (const [id, data] of Object.entries(state)) {
      const plugin = this.plugins.get(id);
      if (plugin && plugin.import) {
        try {
          plugin.import(data);
        } catch (err) {
          console.error(`[PluginRegistry] Plugin "${id}" import failed:`, err);
        }
      }
    }
  }

  /**
   * Dispose all plugins
   */
  dispose(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.dispose) {
        try {
          plugin.dispose();
        } catch (err) {
          console.error(`[PluginRegistry] Plugin "${plugin.id}" dispose failed:`, err);
        }
      }
    }

    this.plugins.clear();
    this.contexts.clear();
  }
}
