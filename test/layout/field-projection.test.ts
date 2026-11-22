import { describe, expect, it } from 'vitest';
import { scopeFieldRects, type ScopeBounds, type ScopeLayout } from '../../src/layout';

const bounds = (minX: number, maxY: number, maxX: number, minY: number): ScopeBounds => ({
    min: { x: minX, y: minY, z: 0 },
    max: { x: maxX, y: maxY, z: 0 },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: 0 },
    size: [maxX - minX, maxY - minY, 0],
});

const layout = (): ScopeLayout => ({
    positions: new Map(),
    locals: new Map(),
    frames: new Map([
        ['run/unit-1', {
            id: 'run/unit-1',
            depth: 1,
            origin: { x: 0, y: 0, z: 0 },
            bounds: bounds(-100, 50, 100, -50),
            active: true,
        }],
    ]),
    edges: [],
    bounds: bounds(-100, 50, 100, -50),
});

const project = ({ x, y }: { readonly x: number; readonly y: number }) => ({
    x: (x + 200) * 2,
    y: (200 - y) * 3,
});

describe('solved scope fields', () => {
    it('maps a solved frame through the host projector into a screen rectangle', () => {
        const rects = scopeFieldRects(layout(), project);
        expect([...rects]).toEqual([['run/unit-1', { x: 200, y: 450, width: 400, height: 300 }]]);
    });

    it('grows the rectangle by padding in world units before projecting', () => {
        const rects = scopeFieldRects(layout(), project, 10);
        expect(rects.get('run/unit-1')).toEqual({ x: 180, y: 420, width: 440, height: 360 });
    });

    it('yields nothing without a solved layout or a projector that can place the frame', () => {
        expect(scopeFieldRects(undefined, project).size).toBe(0);
        expect(scopeFieldRects(layout(), () => undefined).size).toBe(0);
    });
});
