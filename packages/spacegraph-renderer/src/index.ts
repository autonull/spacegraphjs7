import {
    ModelRenderer,
    type CardFacing,
    type DepthMode,
    type FitOptions,
    type GraphRenderer,
    type Projection,
    type RendererCapabilities,
    rendererCapabilities,
    type RendererViewport,
    type RenderModel,
    type RenderTheme,
    type RenderNode,
    type RenderEdge,
    idOf,
    nodeIdOf,
    idsOf,
} from '@spacegraphjs/renderer';
import type { GraphSpec, NodeSpec, SpaceGraph } from 'spacegraphjs/activity';
import { Vector3 } from 'three';
import { worldToScreen } from 'spacegraphjs/utils';
import { WIDGET_SLOTS } from 'spacegraphjs/widgets';
import { CAMERA_MOTION_VERBS } from 'spacegraphjs/motion';
import { SCENE_FEATURES } from 'spacegraphjs/world';
import { edgeSpec, nodeSpec, spaceGraphTheme } from './mapping';

const CAPABILITIES: RendererCapabilities = rendererCapabilities({
    projections: ['2d', '3d'],
    depths: ['flat', 'layered', 'depth-stack', 'orbit'],
    domNodes: true,
    maxDomNodes: 80,
    clusterNodes: true,
    maxRecommendedNodes: 300,
    zoomRange: { min: 0, max: 1 },
    cardFacing: true,
    fitInsets: true,
    emphasis: ['size', 'opacity', 'edgeThickness'],
    widgetSlots: [...WIDGET_SLOTS],
    motionVerbs: [...CAMERA_MOTION_VERBS],
    sceneFeatures: [...SCENE_FEATURES],
});

// Wraps the lean SpaceGraphJS core behind the dependency-free contract. It is the only package that
// imports both the core and the contract; the core never imports the contract.
export class SpaceGraphRenderer extends ModelRenderer implements GraphRenderer {
    readonly capabilities = CAPABILITIES;

    #sg: SpaceGraph | null = null;
    #nodeTypes = new Map<string, string>();
    #band: string | undefined;

    async mount(
        container: HTMLElement,
        options: {
            theme: RenderTheme;
            projection: Projection;
            reducedMotion?: boolean;
            global?: boolean;
        },
    ): Promise<void> {
        if (this.#sg) return;
        try {
            const { SpaceGraph } = await import('spacegraphjs/activity');
            this.setThemeInternal(options.theme);
            const ortho = options.projection === '2d';
            const sg = await SpaceGraph.create(
                container,
                { nodes: [], edges: [] },
                {
                    chrome: false,
                    doubleClickFocus: false,
                    reducedMotion: options.reducedMotion,
                    global: options.global,
                    render: {
                        projection: ortho ? 'orthographic' : 'perspective',
                        transparent: true,
                        backgroundColor: options.theme.background,
                        preserveDrawingBuffer: true,
                    },
                    theme: spaceGraphTheme(options.theme),
                    cameraControls: { enableRotate: !ortho },
                },
            );
            this.#sg = sg;
            this.#bind();
            this.#applyDepth(options.projection === '2d' ? 'flat' : 'orbit');
            if (this.model) this.setModel(this.model);
            this.emit('ready', undefined);
        } catch (error) {
            this.emit('error', { error });
            throw error;
        }
    }

    protected onThemeChanged(theme: RenderTheme): void {
        if (this.#sg) this.#sg.options.theme = spaceGraphTheme(theme);
    }

    // Override the template methods to use SpaceGraph core
    protected applyModel(model: RenderModel, theme: RenderTheme): void {
        const sg = this.#sg;
        if (!sg) return;

        const nodes = model.nodes.map((node) => nodeSpec(node, theme));

        // Semantic zoom changes a node's representation (a phase is a panel at execution and a counted chip
        // at overview). The core upserts by id and never remodels, so drop any node whose spec type changed
        // first; loadSpec then recreates it with the new type.
        for (const node of nodes) this.upsertNodeType(node.id, node.type);

        const spec: GraphSpec = {
            nodes,
            edges: model.edges.map((edge) => edgeSpec(edge, theme)),
        };
        sg.loadSpec(spec);
        sg.setPositions(Object.fromEntries(model.nodes.map((node) => [node.id, node.position])));
    }

    protected applyPositions(positions: Record<string, [number, number, number]>): void {
        this.#sg?.setPositions(positions);
    }

    /** Drop a node whose spec type changed, then remember the type the core now holds. */
    private upsertNodeType(id: string, type: string): void {
        const sg = this.#sg;
        if (!sg) return;
        const previous = this.#nodeTypes.get(id);
        if (previous && previous !== type) sg.removeNode(id);
        this.#nodeTypes.set(id, type);
    }

    private loadNodeSpec(spec: NodeSpec): void {
        if (!this.#sg) return;
        this.upsertNodeType(spec.id, spec.type);
        this.#sg.loadSpec({ nodes: [spec], edges: [] });
    }

    protected addNode(node: RenderNode, theme: RenderTheme): void {
        this.loadNodeSpec(nodeSpec(node, theme));
    }

    protected updateNode(node: RenderNode, theme: RenderTheme): void {
        const spec = nodeSpec(node, theme);
        this.loadNodeSpec(spec);
        this.#sg?.setPositions({ [node.id]: node.position });
    }

    protected removeNode(id: string): void {
        this.#sg?.removeNode(id);
        this.#nodeTypes.delete(id);
    }

    protected addEdge(edge: RenderEdge, theme: RenderTheme): void {
        const sg = this.#sg;
        if (!sg) return;
        const spec = edgeSpec(edge, theme);
        sg.loadSpec({ nodes: [], edges: [spec] });
    }

    protected updateEdge(edge: RenderEdge, theme: RenderTheme): void {
        this.addEdge(edge, theme);
    }

    protected removeEdge(id: string): void {
        this.#sg?.removeEdge(id);
    }

    protected setNodeVisibility(id: string, visible: boolean): void {
        if (visible) this.#sg?.show(id);
        else this.#sg?.hide(id);
    }

    protected render(): void {
        this.#sg?.render();
    }

    protected selectNodes(ids: readonly string[]): void {
        const sg = this.#sg;
        if (!sg) return;
        if (ids.length === 0) sg.clearSelection();
        else sg.select([...ids]);
    }

    protected applyViewport(viewport: RendererViewport): void {
        this.#sg?.setZoom(viewport.zoom);
        if (viewport.center) {
            const [x, y, z] = viewport.center;
            this.#sg?.cameraControls?.setTarget(x, y, z);
        }
    }

    protected readViewport(): RendererViewport | undefined {
        const sg = this.#sg;
        if (!sg) return undefined;

        const viewport = sg.viewport;
        const zoomBandsPlugin = sg.pluginManager.get('zoom-bands') as
            { bands: { band: string } } | undefined;
        return {
            zoom: viewport.zoom,
            center: viewport.center,
            extent: viewport.extent,
            band: zoomBandsPlugin?.bands.band ?? viewport.band,
        };
    }

    protected readNodeScreenPosition(id: string): { x: number; y: number } | undefined {
        const sg = this.#sg;
        if (!sg) return undefined;

        const node = sg.graph.queryEngine.getNode(id);
        if (!node) return undefined;

        return worldToScreen(node.position, sg.renderer.camera, sg.renderer.renderer.domElement);
    }

    projectWorld(point: readonly [number, number, number]): { x: number; y: number } | undefined {
        const sg = this.#sg;
        if (!sg) return undefined;
        return worldToScreen(
            new Vector3(point[0], point[1], point[2]),
            sg.renderer.camera,
            sg.renderer.renderer.domElement,
        );
    }

    protected applyFit(ids?: readonly string[], options?: FitOptions): void {
        this.#sg?.fitView(options?.padding ?? 100, 0, ids, {
            minScale: options?.minScale,
            insets: options?.insets
                ? {
                      top: options.insets.top ?? 0,
                      right: options.insets.right ?? 0,
                      bottom: options.insets.bottom ?? 0,
                      left: options.insets.left ?? 0,
                  }
                : undefined,
        });
    }

    protected applyFocus(id: string): void {
        this.#sg?.focusNode(id);
    }

    protected cleanup(): void {
        this.#sg?.dispose();
        this.#sg = null;
        this.#nodeTypes.clear();
    }

    // The core owns the camera and the cards; the adapter only translates the request.
    setCardFacing(facing: CardFacing): void {
        this.#sg?.setCardFacing(facing);
    }

    setProjection(projection: Projection): void {
        this.#applyDepth(projection === '2d' ? 'flat' : 'orbit');
    }

    setDepth(depth: DepthMode): void {
        this.#applyDepth(depth);
    }

    // The core owns camera framing and depth treatment (contract rule 1); the adapter only translates the
    // requested depth into the core call.
    #applyDepth(depth: DepthMode): void {
        this.#sg?.setDepth(depth);
    }

    #bind(): void {
        const sg = this.#sg!;
        const on = (type: string, handler: (payload: unknown) => void) => {
            sg.events.on(type, handler);
            this.registerListener(() => sg.events.off(type, handler));
        };
        on('node:click', (payload) => this.emit('nodeClick', { id: idOf(payload) }));
        on('edge:click', (payload) => this.emit('edgeClick', { id: idOf(payload) }));
        on('background:click', () => this.emit('backgroundClick', undefined));
        on('node:dblclick', (payload) => this.emit('nodeDoubleClick', { id: idOf(payload) }));
        on('node:pointerenter', (payload) =>
            this.emit('hoverChange', { id: nodeIdOf(payload), kind: 'node' }),
        );
        on('node:pointerleave', () => this.emit('hoverChange', {}));
        on('interaction:dragend', (payload) => {
            const moved = payload as {
                nodes?: readonly { id: string; position: [number, number, number] }[];
            };
            if (moved.nodes) this.emit('nodeMoved', { nodes: moved.nodes });
        });
        on('node:resizeend', (payload) => {
            const resized = payload as {
                node: { id: string; position: { x: number; y: number; z: number } };
                finalSize: { width: number; height: number };
            };
            this.emit('nodeResized', {
                id: resized.node.id,
                size: [resized.finalSize.width, resized.finalSize.height],
                position: [
                    resized.node.position.x,
                    resized.node.position.y,
                    resized.node.position.z,
                ],
            });
        });
        on('selection:changed', (payload) => {
            if (this.applyingSelection) return;
            this.emit('selectionChange', { ids: idsOf(payload) });
        });
        on('camera:change', (payload) => this.#emitViewport(payload as RendererViewport));
    }

    #emitViewport(viewport: RendererViewport): void {
        const sg = this.#sg;
        const zoomBandsPlugin = sg?.pluginManager.get('zoom-bands') as
            { bands: { band: string } } | undefined;
        const band = viewport.band ?? zoomBandsPlugin?.bands.band;
        this.emit('viewportChange', {
            zoom: viewport.zoom,
            center: viewport.center,
            extent: viewport.extent,
            band,
        });
        if (band && band !== this.#band) {
            this.#band = band;
            this.emit('bandChange', { band, zoom: viewport.zoom });
        }
    }
}

export type { GraphRenderer } from '@spacegraphjs/renderer';
