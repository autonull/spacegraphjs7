/**
 * A base class for renderer adapters that handle model diffing and incremental updates.
 * Extends BaseGraphRenderer with shared model management logic.
 */

import { BaseGraphRenderer } from './adapter';
import type {
    RenderModel,
    RenderModelPatch,
    RenderTheme,
    RendererViewport,
    FitOptions,
    RenderNode,
    RenderEdge,
} from './index';
import { mergeRenderModelPatch } from './patch';

export abstract class ModelRenderer extends BaseGraphRenderer {
    #model: RenderModel | null = null;
    #nodes = new Set<string>();
    #edges = new Set<string>();

    protected get model(): RenderModel | null {
        return this.#model;
    }

    protected set model(model: RenderModel | null) {
        this.#model = model;
    }

    protected get nodes(): Set<string> {
        return this.#nodes;
    }

    protected get edges(): Set<string> {
        return this.#edges;
    }

    /** Apply a full model to the renderer. */
    setModel(model: RenderModel): void {
        try {
            const theme = this.getTheme();
            if (!theme) return;

            const liveNodes = new Set(model.nodes.map((n) => n.id));
            const liveEdges = new Set(model.edges.map((e) => e.id));

            // Remove nodes/edges not in the new model
            for (const id of this.#nodes) {
                if (!liveNodes.has(id)) this.removeNode(id);
            }
            for (const id of this.#edges) {
                if (!liveEdges.has(id)) this.removeEdge(id);
            }

            // Apply the model (renderer-specific)
            this.applyModel(model, theme);

            // Update visibility
            for (const node of model.nodes) {
                this.setNodeVisibility(node.id, node.visible !== false);
            }

            this.#model = model;
            this.#nodes = liveNodes;
            this.#edges = liveEdges;
        } catch (error) {
            this.emit('error', { error });
        }
    }

    /** Apply an incremental patch to the current model. */
    applyPatch(patch: RenderModelPatch): void {
        try {
            const theme = this.getTheme();
            const model = this.#model;
            if (!theme || !model) return;

            // Apply node changes
            for (const id of patch.nodes.removed) {
                this.removeNode(id);
                this.#nodes.delete(id);
            }

            for (const node of patch.nodes.added) {
                this.addNode(node, theme);
                this.#nodes.add(node.id);
            }

            for (const node of patch.nodes.changed) {
                this.updateNode(node, theme);
            }

            // Apply edge changes
            for (const id of patch.edges.removed) {
                this.removeEdge(id);
                this.#edges.delete(id);
            }

            for (const edge of patch.edges.added) {
                this.addEdge(edge, theme);
                this.#edges.add(edge.id);
            }

            for (const edge of patch.edges.changed) {
                this.updateEdge(edge, theme);
            }

            // Update the stored model
            const updatedModel = mergeRenderModelPatch(model, patch);
            this.#model = updatedModel;

            // Update visibility for all nodes
            for (const node of updatedModel.nodes) {
                this.setNodeVisibility(node.id, node.visible !== false);
            }
        } catch (error) {
            this.emit('error', { error });
        }
    }

    setTheme(theme: RenderTheme): void {
        this.setThemeInternal(theme);
        if (this.#model) this.setModel(this.#model);
    }

    /** Get the current theme. Override to store theme internally. */
    protected abstract getTheme(): RenderTheme | null;

    /** Store the theme internally. Override to store theme. */
    protected abstract setThemeInternal(theme: RenderTheme): void;

    /** Apply a full model to the renderer. Override with renderer-specific logic. */
    protected applyModel(_model: RenderModel, _theme: RenderTheme): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Add a node to the renderer. */
    protected addNode(_node: RenderNode, _theme: RenderTheme): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Update a node in the renderer. */
    protected updateNode(_node: RenderNode, _theme: RenderTheme): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Remove a node from the renderer. */
    protected removeNode(_id: string): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Add an edge to the renderer. */
    protected addEdge(_edge: RenderEdge, _theme: RenderTheme): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Update an edge in the renderer. */
    protected updateEdge(_edge: RenderEdge, _theme: RenderTheme): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Remove an edge from the renderer. */
    protected removeEdge(_id: string): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Set node visibility. */
    protected setNodeVisibility(_id: string, _visible: boolean): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    /** Trigger a render. */
    protected render(): void {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }

    // The following methods have default implementations that can be overridden

    setProjection(_projection: '2d' | '3d'): void {
        // Default: no-op. Override if the renderer supports projection changes.
    }

    setDepth(_depth: 'flat' | 'layered' | 'depth-stack' | 'orbit'): void {
        // Default: no-op. Override if the renderer supports depth changes.
    }

    setSelection(ids: readonly string[]): void {
        this.applySelection(ids, () => this.selectNodes(ids));
    }

    /** Select nodes in the renderer. Override with renderer-specific logic. */
    protected selectNodes(_ids: readonly string[]): void {
        // Default: no-op. Override with renderer-specific logic.
    }

    setViewport(viewport: RendererViewport): void {
        this.applyViewport(viewport);
    }

    /** Apply viewport to the renderer. Override with renderer-specific logic. */
    protected applyViewport(_viewport: RendererViewport): void {
        // Default: no-op. Override with renderer-specific logic.
    }

    getViewport(): RendererViewport {
        return this.readViewport() ?? { zoom: 1, center: [0, 0, 0] };
    }

    /** Read viewport from the renderer. Override with renderer-specific logic. */
    protected readViewport(): RendererViewport | undefined {
        // Default: undefined. Override with renderer-specific logic.
        return undefined;
    }

    getNodeScreenPosition(id: string): { x: number; y: number } | undefined {
        return this.readNodeScreenPosition(id);
    }

    /** Read node screen position from the renderer. Override with renderer-specific logic. */
    protected readNodeScreenPosition(_id: string): { x: number; y: number } | undefined {
        // Default: undefined. Override with renderer-specific logic.
        return undefined;
    }

    fit(ids?: readonly string[], options?: FitOptions): void {
        this.applyFit(ids, options);
    }

    /** Apply fit to the renderer. Override with renderer-specific logic. */
    protected applyFit(
        _ids: readonly string[] | undefined,
        _options: FitOptions | undefined,
    ): void {
        // Default: no-op. Override with renderer-specific logic.
    }

    focus(id: string): void {
        this.applyFocus(id);
    }

    /** Apply focus to the renderer. Override with renderer-specific logic. */
    protected applyFocus(_id: string): void {
        // Default: no-op. Override with renderer-specific logic.
    }

    resize(): void {
        this.render();
    }

    dispose(): void {
        for (const off of this.disposers) off();
        this.disposers = [];
        this.events.clear();
        this.cleanup();
        this.#model = null;
        this.#nodes.clear();
        this.#edges.clear();
    }

    /** Cleanup renderer-specific resources. */
    protected cleanup(): void {
        // Default: no-op. Override with renderer-specific cleanup.
    }

    /** Array of cleanup functions for event listeners. Override to register listeners. */
    protected disposers: (() => void)[] = [];

    /** Register an event listener with automatic cleanup. */
    protected registerListener(off: () => void): void {
        this.disposers.push(off);
    }
}
