/**
 * A base class for renderer adapters that handle model diffing and incremental updates.
 * Extends BaseGraphRenderer with shared model management logic.
 */
import { BaseGraphRenderer } from './adapter';
import type { RenderModel, RenderModelPatch, RenderTheme, RendererViewport, FitOptions, RenderNode, RenderEdge } from './index';
export declare abstract class ModelRenderer extends BaseGraphRenderer {
    #private;
    protected get model(): RenderModel | null;
    protected set model(model: RenderModel | null);
    protected get nodes(): Set<string>;
    protected get edges(): Set<string>;
    /** Apply a full model to the renderer. */
    setModel(model: RenderModel): void;
    /** Apply an incremental patch to the current model. */
    applyPatch(patch: RenderModelPatch): void;
    setTheme(theme: RenderTheme): void;
    /** Get the current theme. Override to store theme internally. */
    protected abstract getTheme(): RenderTheme | null;
    /** Store the theme internally. Override to store theme. */
    protected abstract setThemeInternal(theme: RenderTheme): void;
    /** Apply a full model to the renderer. Override with renderer-specific logic. */
    protected applyModel(_model: RenderModel, _theme: RenderTheme): void;
    /** Add a node to the renderer. */
    protected addNode(_node: RenderNode, _theme: RenderTheme): void;
    /** Update a node in the renderer. */
    protected updateNode(_node: RenderNode, _theme: RenderTheme): void;
    /** Remove a node from the renderer. */
    protected removeNode(_id: string): void;
    /** Add an edge to the renderer. */
    protected addEdge(_edge: RenderEdge, _theme: RenderTheme): void;
    /** Update an edge in the renderer. */
    protected updateEdge(_edge: RenderEdge, _theme: RenderTheme): void;
    /** Remove an edge from the renderer. */
    protected removeEdge(_id: string): void;
    /** Set node visibility. */
    protected setNodeVisibility(_id: string, _visible: boolean): void;
    /** Trigger a render. */
    protected render(): void;
    setProjection(_projection: '2d' | '3d'): void;
    setDepth(_depth: 'flat' | 'layered' | 'depth-stack' | 'orbit'): void;
    setSelection(ids: readonly string[]): void;
    /** Select nodes in the renderer. Override with renderer-specific logic. */
    protected selectNodes(_ids: readonly string[]): void;
    setViewport(viewport: RendererViewport): void;
    /** Apply viewport to the renderer. Override with renderer-specific logic. */
    protected applyViewport(_viewport: RendererViewport): void;
    getViewport(): RendererViewport;
    /** Read viewport from the renderer. Override with renderer-specific logic. */
    protected readViewport(): RendererViewport | undefined;
    getNodeScreenPosition(id: string): {
        x: number;
        y: number;
    } | undefined;
    /** Read node screen position from the renderer. Override with renderer-specific logic. */
    protected readNodeScreenPosition(_id: string): {
        x: number;
        y: number;
    } | undefined;
    fit(ids?: readonly string[], options?: FitOptions): void;
    /** Apply fit to the renderer. Override with renderer-specific logic. */
    protected applyFit(_ids: readonly string[] | undefined, _options: FitOptions | undefined): void;
    focus(id: string): void;
    /** Apply focus to the renderer. Override with renderer-specific logic. */
    protected applyFocus(_id: string): void;
    resize(): void;
    dispose(): void;
    /** Cleanup renderer-specific resources. */
    protected cleanup(): void;
    /** Array of cleanup functions for event listeners. Override to register listeners. */
    protected disposers: (() => void)[];
    /** Register an event listener with automatic cleanup. */
    protected registerListener(off: () => void): void;
}
//# sourceMappingURL=model-renderer.d.ts.map