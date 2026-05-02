// builder/graph.ts - Graph spec builder
import type { GraphSpec, NodeSpec, EdgeSpec, SpaceGraphOptions } from '../types';
import type { SpaceGraph } from '../SpaceGraph';
import { NodeBuilder } from './node';
import { EdgeBuilder } from './edge';
import { TAU } from '../utils/math';

export class GraphBuilder {
    #nodes: NodeSpec[] = [];
    #edges: EdgeSpec[] = [];

    node(id: string, type?: string): NodeBuilder {
        const builder = new NodeBuilder(id, type);
        this.#nodes.push(builder.build());
        return builder;
    }

    addNode(node: NodeSpec): this { this.#nodes.push(node); return this; }
    edge(id: string, source: string, target: string, type?: string): EdgeBuilder {
        const builder = new EdgeBuilder(id, source, target, type);
        this.#edges.push(builder.build());
        return builder;
    }
    addEdge(edge: EdgeSpec): this { this.#edges.push(edge); return this; }

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
    connectAll(pairs: Array<[string, string]>): this { pairs.forEach(([s, t]) => this.connect(s, t)); return this; }
    bidirectional(pairs: Array<[string, string]>): this {
        pairs.forEach(([s, t]) => {
            this.edge(`e-${s}-${t}`, s, t);
            this.edge(`e-${t}-${s}`, t, s);
        });
        return this;
    }
    complete(nodeIds: string[]): this {
        for (let i = 0; i < nodeIds.length; i++) {
            for (let j = i + 1; j < nodeIds.length; j++) {
                this.edge(`e-${nodeIds[i]}-${nodeIds[j]}`, nodeIds[i], nodeIds[j]);
            }
        }
        return this;
    }

    eachNode(fn: (spec: NodeSpec, index: number) => void): this {
        this.#nodes.forEach(fn);
        return this;
    }
    eachEdge(fn: (spec: EdgeSpec, index: number) => void): this {
        this.#edges.forEach(fn);
        return this;
    }

    filterNodes(predicate: (spec: NodeSpec) => boolean): this {
        this.#nodes = this.#nodes.filter(predicate);
        return this;
    }
    filterEdges(predicate: (spec: EdgeSpec) => boolean): this {
        this.#edges = this.#edges.filter(predicate);
        return this;
    }

    transformNodes(fn: (spec: NodeSpec) => NodeSpec): this {
        this.#nodes = this.#nodes.map(fn);
        return this;
    }
    transformEdges(fn: (spec: EdgeSpec) => EdgeSpec): this {
        this.#edges = this.#edges.map(fn);
        return this;
    }

    styleAllNodes(style: Record<string, unknown>): this {
        this.#nodes = this.#nodes.map(n => ({ ...n, data: { ...n.data, ...style } }));
        return this;
    }
    typeAllNodes(type: string): this {
        this.#nodes = this.#nodes.map(n => ({ ...n, type }));
        return this;
    }

    gridLayout(cols: number, spacing = 100): this {
        this.#nodes.forEach((node, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            node.position = [col * spacing, 0, row * spacing];
        });
        return this;
    }

    circularLayout(radius = 100): this {
        const count = this.#nodes.length;
        const step = TAU / count;
        this.#nodes.forEach((node, i) => {
            const angle = i * step;
            node.position = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
        });
        return this;
    }

    centerNodes(): this {
        if (this.#nodes.length === 0) return this;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of this.#nodes) {
            const [x, y] = node.position ?? [0, 0, 0];
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        for (const node of this.#nodes) {
            node.position = [(node.position?.[0] ?? 0) - cx, (node.position?.[1] ?? 0) - cy, node.position?.[2] ?? 0];
        }
        return this;
    }

    scalePositions(scale: number): this {
        for (const node of this.#nodes) {
            node.position = [
                (node.position?.[0] ?? 0) * scale,
                (node.position?.[1] ?? 0) * scale,
                (node.position?.[2] ?? 0) * scale,
            ];
        }
        return this;
    }

    translateNodes(dx: number, dy: number, dz = 0): this {
        for (const node of this.#nodes) {
            node.position = [
                (node.position?.[0] ?? 0) + dx,
                (node.position?.[1] ?? 0) + dy,
                (node.position?.[2] ?? 0) + dz,
            ];
        }
        return this;
    }

    randomizePositions(spread = 100): this {
        for (const node of this.#nodes) {
            node.position = [
                (node.position?.[0] ?? 0) + (Math.random() - 0.5) * spread,
                (node.position?.[1] ?? 0) + (Math.random() - 0.5) * spread,
                (node.position?.[2] ?? 0) + (Math.random() - 0.5) * spread,
            ];
        }
        return this;
    }

    colorNodes(color: string | number): this {
        for (const node of this.#nodes) {
            node.data = { ...node.data, color };
        }
        return this;
    }
    opacityNodes(opacity: number): this {
        for (const node of this.#nodes) {
            node.data = { ...node.data, opacity };
        }
        return this;
    }

    filterByType(type: string): this {
        this.#nodes = this.#nodes.filter(n => n.type === type);
        return this;
    }
    filterByLabel(pattern: RegExp): this {
        this.#nodes = this.#nodes.filter(n => n.label && pattern.test(n.label));
        return this;
    }

    get nodes(): NodeSpec[] { return this.#nodes; }
    get edges(): EdgeSpec[] { return this.#edges; }
    get nodeCount(): number { return this.#nodes.length; }
    get edgeCount(): number { return this.#edges.length; }
    get isEmpty(): boolean { return this.#nodes.length === 0; }

    build(): GraphSpec { return { nodes: this.#nodes, edges: this.#edges }; }
    toSpec(): GraphSpec { return this.build(); }

    async create(container: string | HTMLElement, options?: SpaceGraphOptions): Promise<SpaceGraph> {
        const { SpaceGraph } = await import('../SpaceGraph');
        return SpaceGraph.create(container, this.build(), options);
    }

    loadInto(sg: SpaceGraph): this {
        sg.loadSpec(this.build()).render();
        return this;
    }
}