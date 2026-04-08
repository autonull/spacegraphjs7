import * as THREE from 'three';
import { GroupNode } from './GroupNode';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export type LayoutStrategy = (
    children: Node[],
    parent: { position: THREE.Vector3; data: Record<string, unknown> },
    params: Record<string, unknown>,
) => void;

export const gridStrategy: LayoutStrategy = (children, parent, params) => {
    const columns = (params.columns as number) ?? 3;
    const rows = (params.rows as number) ?? Math.ceil(Math.sqrt(children.length));
    const cellWidth = (params.cellWidth as number) ?? 200;
    const cellHeight = (params.cellHeight as number) ?? 150;
    const cellDepth = (params.cellDepth as number) ?? 100;
    const gapX = (params.gapX as number) ?? (params.gap as number) ?? 20;
    const gapY = (params.gapY as number) ?? (params.gap as number) ?? 20;
    const gapZ = (params.gapZ as number) ?? 50;

    children.forEach((child, i) => {
        const col = i % columns;
        const row = Math.floor((i / columns) % rows);
        const layer = Math.floor(i / (columns * rows));

        child.position.set(
            parent.position.x + col * (cellWidth + gapX),
            parent.position.y - row * (cellHeight + gapY),
            parent.position.z + layer * (cellDepth + gapZ),
        );
    });
};

export const sphereStrategy: LayoutStrategy = (children, parent, params) => {
    const radius = (params.radius as number) ?? 200;
    const n = children.length;
    const phi = Math.PI * (3 - Math.sqrt(5));

    children.forEach((child, i) => {
        const y = 1 - (i / (n - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = phi * i;

        child.position.set(
            parent.position.x + Math.cos(theta) * radiusAtY * radius,
            parent.position.y + y * radius,
            parent.position.z + Math.sin(theta) * radiusAtY * radius,
        );

        child.rotation.set(0, Math.atan2(child.position.z - parent.position.z, child.position.x - parent.position.x), 0);
    });
};

export const stackingStrategy: LayoutStrategy = (children, parent) => {
    for (const child of children) {
        child.position.copy(parent.position);
    }
};

export const splitStrategy: LayoutStrategy = (children, parent, params) => {
    if (children.length < 2) return;
    const [first, second] = children;
    const axis = (params.splitAxis as 'horizontal' | 'vertical') ?? 'horizontal';
    const ratio = (params.splitRatio as number) ?? 0.5;
    const totalWidth = (parent.data.width as number) ?? 600;
    const totalHeight = (parent.data.height as number) ?? 400;

    if (axis === 'horizontal') {
        const w1 = totalWidth * ratio;
        const w2 = totalWidth * (1 - ratio);
        first.position.set(
            parent.position.x - totalWidth / 2 + w1 / 2,
            parent.position.y,
            parent.position.z,
        );
        second.position.set(
            parent.position.x + totalWidth / 2 - w2 / 2,
            parent.position.y,
            parent.position.z,
        );
    } else {
        const h1 = totalHeight * ratio;
        const h2 = totalHeight * (1 - ratio);
        first.position.set(
            parent.position.x,
            parent.position.y + totalHeight / 2 - h1 / 2,
            parent.position.z,
        );
        second.position.set(
            parent.position.x,
            parent.position.y - totalHeight / 2 + h2 / 2,
            parent.position.z,
        );
    }
};

type BorderRegion = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CENTER' | 'NW' | 'NE' | 'SW' | 'SE';

export const borderStrategy: LayoutStrategy = (children, parent, params) => {
    const width = (parent.data.width as number) ?? 600;
    const height = (parent.data.height as number) ?? 400;
    const halfW = width / 2;
    const halfH = height / 2;
    const regions = (params.regions as Record<string, BorderRegion>) ?? {};

    const positions: Record<BorderRegion, [number, number]> = {
        CENTER: [0, 0],
        NORTH: [0, halfH],
        SOUTH: [0, -halfH],
        EAST: [halfW, 0],
        WEST: [-halfW, 0],
        NW: [-halfW, halfH],
        NE: [halfW, halfH],
        SW: [-halfW, -halfH],
        SE: [halfW, -halfH],
    };

    for (const child of children) {
        const region = regions[child.id] ?? 'CENTER';
        const [dx, dy] = positions[region];
        child.position.set(parent.position.x + dx, parent.position.y + dy, parent.position.z);
    }
};

export const switchStrategy: LayoutStrategy = (children, _parent, params) => {
    const activeIndex = (params.activeIndex as number) ?? 0;
    children.forEach((child, i) => {
        child.object.visible = i === activeIndex;
    });
};

export class LayoutNode extends GroupNode {
    private strategy: LayoutStrategy;
    private params: Record<string, unknown>;

    constructor(
        sg: SpaceGraph,
        spec: NodeSpec,
        strategy: LayoutStrategy,
        params: Record<string, unknown> = {},
    ) {
        super(sg, spec);
        this.strategy = strategy;
        this.params = { ...params };
        if (spec?.data) {
            const data = spec.data as Record<string, unknown>;
            for (const key of Object.keys(params)) {
                if (key in data) this.params[key] = data[key];
            }
        }
    }

    onPreRender(_dt: number): void {
        super.onPreRender(_dt);
        const childNodes = this.children.filter((c): c is Node => c instanceof Node);
        this.strategy(childNodes, this, this.params);
    }
}
