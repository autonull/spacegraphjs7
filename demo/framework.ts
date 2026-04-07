import { SpaceGraph } from '../src/SpaceGraph';
import type { GraphSpec } from '../src/types';

export function createDemo(spec: GraphSpec, _options?: Record<string, unknown>): SpaceGraph {
    let container = document.getElementById('app');
    if (!container) {
        container = document.getElementById('container');
    }
    if (!container) {
        console.error("Could not find container 'app' or 'container'");
    }
    const sg = new SpaceGraph(container!);
    sg.init().then(() => {
        sg.loadSpec(spec);
        sg.render();
    });
    return sg;
}

export function createDemoWithNodes(nodes: any[], edges: any[] = []): SpaceGraph {
    return createDemo({
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type ?? 'ShapeNode',
            position: n.position ?? [0, 0, 0],
            data: n.data ?? {},
        })),
        edges: edges.map((e: any) => ({
            ...e,
            type: e.type ?? 'CurvedEdge',
        })),
    });
}

export function shapeNode(
    id: string,
    position: [number, number, number] = [0, 0, 0],
    data: Record<string, unknown> = {},
): { id: string; type: string; position: [number, number, number]; data: Record<string, unknown> } {
    return { id, type: 'ShapeNode', position, data };
}

export function htmlNode(
    id: string,
    position: [number, number, number] = [0, 0, 0],
    data: Record<string, unknown> = {},
): { id: string; type: string; position: [number, number, number]; data: Record<string, unknown> } {
    return { id, type: 'HtmlNode', position, data: { width: 200, height: 100, ...data } };
}

export function edge(
    source: string,
    target: string,
    type = 'CurvedEdge',
): { id: string; source: string; target: string; type: string } {
    return { id: `e_${source}_${target}`, source, target, type };
}

export function gridLayout(cols = 3, cellWidth = 150, cellHeight = 100, gap = 30) {
    return { columns: cols, cellWidth, cellHeight, gap };
}
