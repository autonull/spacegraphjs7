// SpaceGraphJS - VirtualGridNode
// Virtualized grid with cell culling based on camera view

import * as THREE from 'three';
import { GroupNode } from './GroupNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import type { Node } from './Node';

export interface GridModel<T> {
    getCell(x: number, y: number): T | null;
    getRowCount(): number;
    getColCount(): number;
}

export class VirtualGridNode<T = unknown> extends GroupNode {
    model!: GridModel<T>;
    cellRenderer!: (x: number, y: number, value: T) => NodeSpec;
    visibleCells = new Map<string, Node>();
    cellWidth = 200;
    cellHeight = 150;

    constructor(sg?: SpaceGraph, spec?: NodeSpec) {
        super(sg!, spec!);
        if (spec?.data) {
            const d = spec.data as Record<string, unknown>;
            if (typeof d.cellWidth === 'number') this.cellWidth = d.cellWidth;
            if (typeof d.cellHeight === 'number') this.cellHeight = d.cellHeight;
        }
    }

    setModel(model: GridModel<T>, renderer: (x: number, y: number, value: T) => NodeSpec): void {
        this.model = model;
        this.cellRenderer = renderer;
        this.visibleCells.clear();
    }

    onPreRender(_dt: number): void {
        if (!this.model || !this.cellRenderer || !this.sg) return;

        const viewRect = this.getViewRect();
        const neededCells = this.computeNeededCells(viewRect);

        for (const [key, node] of this.visibleCells) {
            if (!neededCells.has(key)) {
                this.sg.graph.removeNode(node.id);
                this.visibleCells.delete(key);
            }
        }

        for (const [key, { x, y, value }] of neededCells) {
            if (!this.visibleCells.has(key)) {
                const spec = this.cellRenderer(x, y, value);
                const node = this.sg.graph.addNode(spec);
                if (node) {
                    node.position.set(
                        this.position.x + x * this.cellWidth,
                        this.position.y - y * this.cellHeight,
                        this.position.z,
                    );
                    this.visibleCells.set(key, node);
                }
            }
        }
    }

    private getViewRect(): { xMin: number; xMax: number; yMin: number; yMax: number } {
        if (!this.sg?.renderer?.camera) return { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

        const camera = this.sg.renderer.camera;
        const frustum = new THREE.Frustum();
        const projMatrix = new THREE.Matrix4().multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse,
        );
        frustum.setFromProjectionMatrix(projMatrix);

        const margin = 2;
        const xMin =
            Math.floor(
                (frustum.planes[0] ? this.position.x - camera.position.x : -1000) / this.cellWidth,
            ) - margin;
        const xMax =
            Math.ceil(
                (frustum.planes[0] ? this.position.x + camera.position.x : 1000) / this.cellWidth,
            ) + margin;
        const yMin = Math.floor((this.position.y - 500) / this.cellHeight) - margin;
        const yMax = Math.ceil((this.position.y + 500) / this.cellHeight) + margin;

        return {
            xMin: Math.max(0, xMin),
            xMax: Math.min(this.model.getColCount() - 1, xMax),
            yMin: Math.max(0, yMin),
            yMax: Math.min(this.model.getRowCount() - 1, yMax),
        };
    }

    private computeNeededCells(viewRect: {
        xMin: number;
        xMax: number;
        yMin: number;
        yMax: number;
    }): Map<string, { x: number; y: number; value: T }> {
        const result = new Map<string, { x: number; y: number; value: T }>();
        for (let y = viewRect.yMin; y <= viewRect.yMax; y++) {
            for (let x = viewRect.xMin; x <= viewRect.xMax; x++) {
                const value = this.model.getCell(x, y);
                if (value !== null) {
                    result.set(`${x},${y}`, { x, y, value });
                }
            }
        }
        return result;
    }
}
