/**
 * A base class for renderer adapters that handle model diffing and incremental updates.
 * Extends BaseGraphRenderer with shared model management logic.
 */
import { BaseGraphRenderer } from './adapter';
import { mergeRenderModelPatch } from './patch';
export class ModelRenderer extends BaseGraphRenderer {
    #model = null;
    #nodes = new Set();
    #edges = new Set();
    get model() {
        return this.#model;
    }
    set model(model) {
        this.#model = model;
    }
    get nodes() {
        return this.#nodes;
    }
    get edges() {
        return this.#edges;
    }
    /** Apply a full model to the renderer. */
    setModel(model) {
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
    applyPatch(patch) {
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
    setTheme(theme) {
        this.setThemeInternal(theme);
        if (this.#model) this.setModel(this.#model);
    }
    /** Apply a full model to the renderer. Override with renderer-specific logic. */
    applyModel(_model, _theme) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Add a node to the renderer. */
    addNode(_node, _theme) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Update a node in the renderer. */
    updateNode(_node, _theme) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Remove a node from the renderer. */
    removeNode(_id) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Add an edge to the renderer. */
    addEdge(_edge, _theme) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Update an edge in the renderer. */
    updateEdge(_edge, _theme) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Remove an edge from the renderer. */
    removeEdge(_id) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Set node visibility. */
    setNodeVisibility(_id, _visible) {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    /** Trigger a render. */
    render() {
        // Default: no-op. Concrete renderers that override setModel/applyPatch don't need this.
    }
    // The following methods have default implementations that can be overridden
    setProjection(_projection) {
        // Default: no-op. Override if the renderer supports projection changes.
    }
    setDepth(_depth) {
        // Default: no-op. Override if the renderer supports depth changes.
    }
    setSelection(ids) {
        this.applySelection(ids, () => this.selectNodes(ids));
    }
    /** Select nodes in the renderer. Override with renderer-specific logic. */
    selectNodes(_ids) {
        // Default: no-op. Override with renderer-specific logic.
    }
    setViewport(viewport) {
        this.applyViewport(viewport);
    }
    /** Apply viewport to the renderer. Override with renderer-specific logic. */
    applyViewport(_viewport) {
        // Default: no-op. Override with renderer-specific logic.
    }
    getViewport() {
        return this.readViewport() ?? { zoom: 1, center: [0, 0, 0] };
    }
    /** Read viewport from the renderer. Override with renderer-specific logic. */
    readViewport() {
        // Default: undefined. Override with renderer-specific logic.
        return undefined;
    }
    getNodeScreenPosition(id) {
        return this.readNodeScreenPosition(id);
    }
    /** Read node screen position from the renderer. Override with renderer-specific logic. */
    readNodeScreenPosition(_id) {
        // Default: undefined. Override with renderer-specific logic.
        return undefined;
    }
    fit(ids, options) {
        this.applyFit(ids, options);
    }
    /** Apply fit to the renderer. Override with renderer-specific logic. */
    applyFit(_ids, _options) {
        // Default: no-op. Override with renderer-specific logic.
    }
    focus(id) {
        this.applyFocus(id);
    }
    /** Apply focus to the renderer. Override with renderer-specific logic. */
    applyFocus(_id) {
        // Default: no-op. Override with renderer-specific logic.
    }
    resize() {
        this.render();
    }
    dispose() {
        for (const off of this.disposers) off();
        this.disposers = [];
        this.events.clear();
        this.cleanup();
        this.#model = null;
        this.#nodes.clear();
        this.#edges.clear();
    }
    /** Cleanup renderer-specific resources. */
    cleanup() {
        // Default: no-op. Override with renderer-specific cleanup.
    }
    /** Array of cleanup functions for event listeners. Override to register listeners. */
    disposers = [];
    /** Register an event listener with automatic cleanup. */
    registerListener(off) {
        this.disposers.push(off);
    }
}
