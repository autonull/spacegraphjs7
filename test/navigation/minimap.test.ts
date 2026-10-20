import { describe, expect, it } from 'vitest';
import { Navigation } from '../../src/navigation';

const BOX = { width: 100, height: 100 };

const positions = new Map([
    ['a', { x: 0, y: 0 }],
    ['b', { x: 100, y: 50 }],
]);

describe('Navigation.project', () => {
    it('fits the content into the box and flips the Y axis', () => {
        const projection = Navigation.project({ positions, box: BOX });

        expect(projection.scale).toBe(1);
        expect(projection.project({ x: 0, y: 0 })).toEqual({ x: 0, y: 75 });
        expect(projection.project({ x: 100, y: 50 })).toEqual({ x: 100, y: 25 });
    });

    it('centres the content and keeps the padding', () => {
        const projection = Navigation.project({ positions, box: BOX, padding: 10 });

        expect(projection.scale).toBe(0.8);
        expect(projection.project({ x: 0, y: 0 })).toEqual({ x: 10, y: 70 });
        expect(projection.project({ x: 100, y: 50 })).toEqual({ x: 90, y: 30 });
    });

    it('projects a box point back into graph space', () => {
        const projection = Navigation.project({ positions, box: BOX });
        const graph = projection.unproject({ x: 25, y: 75 });

        expect(graph.x).toBeCloseTo(25);
        expect(graph.y).toBeCloseTo(0);
    });

    it('keeps a single point centred', () => {
        const projection = Navigation.project({ positions: new Map([['a', { x: 10, y: 20 }]]), box: BOX });

        expect(projection.project({ x: 10, y: 20 })).toEqual({ x: 50, y: 50 });
    });

    it('reports the visible rectangle when the renderer knows its viewport', () => {
        const projection = Navigation.project({
            positions,
            box: BOX,
            viewport: { center: [50, 25], extent: { width: 50, height: 50 } },
        });

        expect(projection.viewRect).toEqual({ x: 25, y: 25, width: 50, height: 50 });
    });

    it('has no view rectangle without a viewport', () => {
        expect(Navigation.project({ positions, box: BOX }).viewRect).toBeUndefined();
    });

    it('survives an empty model', () => {
        const projection = Navigation.project({ positions: new Map(), box: BOX });

        expect(projection.bounds).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
        expect(projection.project({ x: 0, y: 0 })).toEqual({ x: 50, y: 50 });
    });
});
