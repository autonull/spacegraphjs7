// builder.ts - Ergonomic Graph Builder API
import type { SpaceGraph } from './SpaceGraph';
import type { GraphSpec, NodeSpec, EdgeSpec, SpaceGraphOptions } from './types';

const TAU = Math.PI * 2;

// ============= Base Builder =============
abstract class BaseBuilder<T> {
    protected spec: T;

    constructor(spec: T) {
        this.spec = spec;
    }

    data(data: Record<string, unknown>): this {
        const s = this.spec as any;
        s.data = { ...s.data, ...data };
        return this;
    }

    build(): T {
        return this.spec;
    }
    toSpec(): T {
        return this.spec;
    }

    protected mergeData(updates: Record<string, unknown>): void {
        (this.spec as any).data = { ...((this.spec as any).data ?? {}), ...updates };
    }
}

// ============= Node Builder =============
export class NodeBuilder extends BaseBuilder<NodeSpec> {
    constructor(id: string, type: string = 'ShapeNode') {
        super({ id, type });
    }

    label(label: string): this {
        this.spec.label = label;
        return this;
    }
    position(x: number, y: number, z: number = 0): this {
        this.spec.position = [x, y, z];
        return this;
    }
    rotation(x: number, y: number, z: number = 0): this {
        this.spec.rotation = [x, y, z];
        return this;
    }
    scale(x: number, y: number, z: number = 1): this {
        this.spec.scale = [x, y, z];
        return this;
    }
    size(size: number): this {
        this.mergeData({ size });
        return this;
    }
    color(color: number | string): this {
        this.mergeData({ color });
        return this;
    }
    opacity(opacity: number): this {
        this.mergeData({ opacity });
        return this;
    }
    params(params: Record<string, unknown>): this {
        this.spec.parameters = params;
        return this;
    }
    type(type: string): this {
        this.spec.type = type;
        return this;
    }
    visible(visible: boolean): this {
        this.mergeData({ visible });
        return this;
    }
    pinned(pinned: boolean): this {
        this.mergeData({ pinned });
        return this;
    }

    at(x: number, y: number, z?: number): this {
        return this.position(x, y, z ?? 0);
    }
    rotate(x: number, y: number, z?: number): this {
        return this.rotation(x, y, z ?? 0);
    }
    scaleTo(x: number, y?: number, z?: number): this {
        return this.scale(x, y ?? x, z ?? x);
    }

    // Chained positioning
    center(): this {
        return this.position(0, 0, 0);
    }
    origin(): this {
        return this.position(0, 0, 0);
    }
}

// ============= Edge Builder =============
export class EdgeBuilder extends BaseBuilder<EdgeSpec> {
    constructor(id: string, source: string, target: string, type: string = 'Edge') {
        super({ id, source, target, type });
    }

    label(label: string): this {
        this.mergeData({ label });
        return this;
    }
    thickness(thickness: number): this {
        this.mergeData({ thickness });
        return this;
    }
    dashed(dashed: boolean = true): this {
        this.mergeData({ dashed });
        return this;
    }
    arrowhead(arrowhead: boolean | 'source' | 'target' | 'both' = true): this {
        this.mergeData({ arrowhead });
        return this;
    }
    color(color: number | string): this {
        this.mergeData({ color });
        return this;
    }
    type(type: string): this {
        this.spec.type = type;
        return this;
    }

    // New ergonomic options
    dashScale(scale: number): this {
        this.mergeData({ dashScale: scale });
        return this;
    }
    gapSize(size: number): this {
        this.mergeData({ gapSize: size });
        return this;
    }
    arrowSize(size: number): this {
        this.mergeData({ arrowheadSize: size });
        return this;
    }
    noArrow(): this {
        this.mergeData({ arrowhead: false });
        return this;
    }
    bothArrows(): this {
        this.mergeData({ arrowhead: 'both' });
        return this;
    }
}

// ============= Graph Spec Builder =============
export class GraphSpecBuilder {
    #nodes: NodeSpec[] = [];
    #edges: EdgeSpec[] = [];

    node(id: string, type?: string): NodeBuilder {
        const builder = new NodeBuilder(id, type);
        this.#nodes.push(builder.build());
        return builder;
    }

    addNode(node: NodeSpec): this {
        this.#nodes.push(node);
        return this;
    }

    edge(id: string, source: string, target: string, type?: string): EdgeBuilder {
        const builder = new EdgeBuilder(id, source, target, type);
        this.#edges.push(builder.build());
        return builder;
    }

    addEdge(edge: EdgeSpec): this {
        this.#edges.push(edge);
        return this;
    }

    addNodes(nodes: Array<{ id: string; type?: string; label?: string } | string>): this {
        for (const n of nodes) {
            if (typeof n === 'string') this.node(n, 'ShapeNode');
            else this.node(n.id, n.type).label(n.label ?? '');
        }
        return this;
    }

    connect(source: string, target: string, id?: string): this {
        this.edge(id ?? `e-${source}-${target}`, source, target);
        return this;
    }

    connectChain(nodeIds: string[]): this {
        for (let i = 1; i < nodeIds.length; i++) {
            this.edge(`edge-${nodeIds[i - 1]}-${nodeIds[i]}`, nodeIds[i - 1], nodeIds[i]);
        }
        return this;
    }

    connectStar(centerId: string, spokeIds: string[]): this {
        spokeIds.forEach((spokeId) => this.edge(`edge-${centerId}-${spokeId}`, centerId, spokeId));
        return this;
    }

    // Ergonomic: batch connect
    connectAll(pairs: Array<[string, string]>): this {
        pairs.forEach(([s, t]) => this.connect(s, t));
        return this;
    }

    // Ergonomic: bidirectional edges
    bidirectional(pairs: Array<[string, string]>): this {
        pairs.forEach(([s, t]) => {
            this.edge(`e-${s}-${t}`, s, t);
            this.edge(`e-${t}-${s}`, t, s);
        });
        return this;
    }

    // Ergonomic: complete graph (every node connected to every other)
    complete(nodeIds: string[]): this {
        for (let i = 0; i < nodeIds.length; i++) {
            for (let j = i + 1; j < nodeIds.length; j++) {
                this.edge(`e-${nodeIds[i]}-${nodeIds[j]}`, nodeIds[i], nodeIds[j]);
            }
        }
        return this;
    }

    build(): GraphSpec {
        return { nodes: this.#nodes, edges: this.#edges };
    }

    async create(
        container: string | HTMLElement,
        options?: SpaceGraphOptions,
    ): Promise<SpaceGraph> {
        const { SpaceGraph } = await import('./SpaceGraph');
        return SpaceGraph.create(container, this.build(), options);
    }

    toSpec(): GraphSpec {
        return this.build();
    }
}

// ============= Factory Functions =============
// Main graph builder factory
export const graph = (): GraphSpecBuilder => new GraphSpecBuilder();

// Quick graph - minimal syntax for rapid prototyping
export async function quickGraph(
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
    const { SpaceGraph } = await import('./SpaceGraph');
    return SpaceGraph.quickGraph(container, nodes, edges, options);
}

// ============= Pre-built Patterns =============
export const Patterns = {
    circle(count: number, radius: number = 100, labelPrefix: string = 'Node'): GraphSpecBuilder {
        const builder = graph();
        const angleStep = TAU / count;
        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;
            builder
                .node(`node-${i}`)
                .type('ShapeNode')
                .label(`${labelPrefix} ${i}`)
                .position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            if (i > 0)
                builder.addEdge({ id: `edge-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
        }
        builder.connect(`node-${count - 1}`, 'node-0');
        return builder;
    },

    grid(rows: number, cols: number, spacing: number = 100): GraphSpecBuilder {
        const builder = graph();
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const id = `node-${row}-${col}`;
                builder
                    .node(id)
                    .type('ShapeNode')
                    .label(`${row},${col}`)
                    .position(col * spacing, 0, row * spacing);
                if (col > 0)
                    builder.addEdge({
                        id: `h-${row}-${col}`,
                        source: `node-${row}-${col - 1}`,
                        target: id,
                    });
                if (row > 0)
                    builder.addEdge({
                        id: `v-${row}-${col}`,
                        source: `node-${row - 1}-${col}`,
                        target: id,
                    });
            }
        }
        return builder;
    },

    hierarchy(levels: number[], spacing: number = 100): GraphSpecBuilder {
        const builder = graph();
        let nodeId = 0,
            prevLevelStart = 0;
        levels.forEach((count, levelIndex) => {
            const y = levelIndex * spacing,
                levelStart = nodeId;
            for (let i = 0; i < count; i++) {
                const id = `node-${nodeId++}`;
                builder
                    .node(id)
                    .type('ShapeNode')
                    .label(id)
                    .position(((i - (count - 1) / 2) * spacing) / 2, y, 0);
                if (levelIndex > 0 && prevLevelStart < nodeId) {
                    const prevCount = levels[levelIndex - 1] || 0;
                    const parentIndex = prevLevelStart + Math.floor((i * prevCount) / count);
                    if (parentIndex >= prevLevelStart && parentIndex < nodeId)
                        builder.addEdge({
                            id: `edge-${nodeId}-${parentIndex}`,
                            source: `node-${parentIndex}`,
                            target: id,
                        });
                }
            }
            prevLevelStart = levelStart;
        });
        return builder;
    },

    chain(count: number, spacing: number = 100): GraphSpecBuilder {
        const builder = graph();
        for (let i = 0; i < count; i++) {
            builder
                .node(`node-${i}`)
                .type('ShapeNode')
                .label(`Node ${i}`)
                .position(i * spacing, 0, 0);
            if (i > 0)
                builder.addEdge({ id: `edge-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
        }
        return builder;
    },

    star(spokes: number, radius: number = 100): GraphSpecBuilder {
        const builder = graph();
        const angleStep = TAU / spokes;
        builder.node('center').type('ShapeNode').label('Center').position(0, 0, 0);
        for (let i = 0; i < spokes; i++) {
            const angle = i * angleStep;
            builder
                .node(`spoke-${i}`)
                .type('ShapeNode')
                .label(`Spoke ${i}`)
                .position(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            builder.addEdge({ id: `edge-${i}`, source: 'center', target: `spoke-${i}` });
        }
        return builder;
    },

    binaryTree(depth: number, spacing: number = 100): GraphSpecBuilder {
        const builder = graph();
        const addNode = (level: number, index: number): string => {
            const id = `node-${level}-${index}`;
            const x = (index - (2 ** level - 1) / 2) * spacing;
            const y = level * spacing;
            builder.node(id).type('ShapeNode').label(id).position(x, 0, -y);
            if (level > 0) {
                const parentIndex = Math.floor((index - 1) / 2);
                builder.addEdge({
                    id: `e-${id}-p`,
                    source: `node-${level - 1}-${parentIndex}`,
                    target: id,
                });
            }
            return id;
        };
        for (let l = 0; l < depth; l++) {
            for (let i = 0; i < 2 ** l; i++) addNode(l, i);
        }
        return builder;
    },

    // New patterns
    mesh(width: number, height: number, spacing: number = 100): GraphSpecBuilder {
        return Patterns.grid(height, width, spacing);
    },

    torus(count: number, majorRadius: number = 200, minorRadius: number = 50): GraphSpecBuilder {
        const builder = graph();
        const angleStep = TAU / count;
        for (let i = 0; i < count; i++) {
            const majorAngle = i * angleStep;
            const x = (majorRadius + minorRadius * Math.cos(i * 3)) * Math.cos(majorAngle);
            const z = (majorRadius + minorRadius * Math.cos(i * 3)) * Math.sin(majorAngle);
            const y = minorRadius * Math.sin(i * 3);
            builder.node(`node-${i}`).type('ShapeNode').label(`Node ${i}`).position(x, y, z);
            if (i > 0)
                builder.addEdge({ id: `e-${i}`, source: `node-${i - 1}`, target: `node-${i}` });
        }
        builder.connect(`node-${count - 1}`, 'node-0');
        return builder;
    },

    random(count: number, spread: number = 500): GraphSpecBuilder {
        const builder = graph();
        for (let i = 0; i < count; i++) {
            builder
                .node(`node-${i}`)
                .type('ShapeNode')
                .label(`Node ${i}`)
                .position(
                    Math.random() * spread - spread / 2,
                    Math.random() * spread - spread / 2,
                    Math.random() * spread - spread / 2,
                );
        }
        return builder;
    },
};

// ============= Animation Helpers =============
export const Animate = {
    move(
        sg: SpaceGraph,
        nodeId: string,
        to: { x?: number; y?: number; z?: number },
        duration: number = 1000,
    ): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return Promise.resolve();
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    gsap.to(node.position, {
                        x: to.x ?? node.position.x,
                        y: to.y ?? node.position.y,
                        z: to.z ?? node.position.z,
                        duration: duration / 1000,
                        ease: 'power2.inOut',
                        onUpdate: () =>
                            node.updatePosition(node.position.x, node.position.y, node.position.z),
                        onComplete: resolve,
                    });
                }),
        );
    },

    fade(sg: SpaceGraph, nodeId: string, to: number, duration: number = 500): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return Promise.resolve();
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    gsap.to(node.data, {
                        opacity: to,
                        duration: duration / 1000,
                        ease: 'power2.inOut',
                        onComplete: resolve,
                    });
                }),
        );
    },

    scale(sg: SpaceGraph, nodeId: string, to: number, duration: number = 500): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return Promise.resolve();
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    gsap.to(node.object.scale, {
                        x: to,
                        y: to,
                        z: to,
                        duration: duration / 1000,
                        ease: 'power2.inOut',
                        onComplete: resolve,
                    });
                }),
        );
    },

    rotate(
        sg: SpaceGraph,
        nodeId: string,
        to: { x?: number; y?: number; z?: number },
        duration: number = 1000,
    ): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return Promise.resolve();
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    const target = { x: to.x ?? 0, y: to.y ?? 0, z: to.z ?? 0 };
                    gsap.to(node.object.rotation, {
                        x: target.x,
                        y: target.y,
                        z: target.z,
                        duration: duration / 1000,
                        ease: 'power2.inOut',
                        onComplete: resolve,
                    });
                }),
        );
    },

    color(
        sg: SpaceGraph,
        nodeId: string,
        to: string | number,
        _duration: number = 500,
    ): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return Promise.resolve();
        node.data.color = to;
        return Promise.resolve();
    },

    sequence(
        sg: SpaceGraph,
        animations: Array<{
            nodeId: string;
            type: 'move' | 'fade' | 'scale' | 'rotate';
            to: any;
            duration?: number;
        }>,
    ): Promise<void> {
        return animations.reduce((promise, anim) => {
            return promise.then(() => {
                const fn = Animate[anim.type] as (
                    sg: SpaceGraph,
                    id: string,
                    to: any,
                    dur?: number,
                ) => Promise<void>;
                return fn(sg, anim.nodeId, anim.to, anim.duration);
            });
        }, Promise.resolve());
    },
};

// ============= Layout Helpers =============
type LayoutOptions = { duration?: number; easing?: string };

export const Layout = {
    async apply(
        sg: SpaceGraph,
        layoutName: string,
        options?: Record<string, unknown>,
    ): Promise<void> {
        const plugin = sg.pluginManager.getPlugin(layoutName);
        if (!plugin) throw new Error(`Layout "${layoutName}" not found`);
        if ('applyLayout' in plugin) await (plugin as any).applyLayout(options);
    },
    force(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'ForceLayout', options);
    },
    circular(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'CircularLayout', options);
    },
    grid(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'GridLayout', options);
    },
    hierarchy(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'HierarchicalLayout', options);
    },
    radial(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'RadialLayout', options);
    },
    tree(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'TreeLayout', options);
    },
    spectral(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'SpectralLayout', options);
    },
    cluster(sg: SpaceGraph, options?: LayoutOptions): Promise<void> {
        return Layout.apply(sg, 'ClusterLayout', options);
    },
};

// ============= Camera Helpers =============
export const Camera = {
    fitView(sg: SpaceGraph, padding?: number, duration?: number): void {
        sg.fitView(padding, duration);
    },

    flyTo(
        sg: SpaceGraph,
        position: [number, number, number],
        target: [number, number, number],
        duration: number = 1.5,
    ): Promise<void> {
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    const start = {
                        x: sg.renderer.camera.position.x,
                        y: sg.renderer.camera.position.y,
                        z: sg.renderer.camera.position.z,
                    };
                    gsap.to(start, {
                        x: position[0],
                        y: position[1],
                        z: position[2],
                        duration,
                        ease: 'power2.inOut',
                        onUpdate: () => {
                            sg.renderer.camera.position.set(start.x, start.y, start.z);
                            sg.cameraControls.update();
                        },
                        onComplete: resolve,
                    });
                }),
        );
    },

    focus(sg: SpaceGraph, nodeIds: string[], padding: number = 100, duration: number = 1.5): void {
        const nodes = nodeIds
            .map((id) => sg.graph.getNode(id))
            .filter((n): n is NonNullable<typeof n> => n != null);
        if (nodes.length === 0) return;
        sg.fitView(padding, duration);
    },

    orbit(sg: SpaceGraph, angle: number, duration: number = 1.5): Promise<void> {
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    const startTheta = sg.cameraControls.spherical.theta;
                    gsap.to(
                        {},
                        {
                            duration,
                            ease: 'power2.inOut',
                            onUpdate: (self: any) => {
                                sg.cameraControls.spherical.theta =
                                    startTheta + self.progress() * angle;
                                sg.cameraControls.update();
                            },
                            onComplete: resolve,
                        },
                    );
                }),
        );
    },

    zoomTo(sg: SpaceGraph, zoom: number, duration: number = 1): Promise<void> {
        return import('gsap').then(
            ({ gsap }) =>
                new Promise((resolve) => {
                    const startRadius = sg.cameraControls.spherical.radius;
                    gsap.to(sg.cameraControls.spherical, {
                        radius: startRadius * zoom,
                        duration,
                        ease: 'power2.inOut',
                        onUpdate: () => sg.cameraControls.update(),
                        onComplete: resolve,
                    });
                }),
        );
    },

    reset(sg: SpaceGraph): void {
        const { camera } = sg.renderer;
        camera.position.set(0, 500, 500);
        sg.cameraControls.target.set(0, 0, 0);
        sg.cameraControls.update();
    },
};
