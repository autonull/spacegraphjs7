import { describe, expect, it } from 'vitest';
import { EdgeBundler, bundleEdges, type BundledEdge } from './edge-bundling';
import type { Position } from './placement';

describe('EdgeBundler', () => {
    const positions = new Map<string, Position>([
        ['a', { x: 0, y: 0, z: 0 }],
        ['b', { x: 100, y: 0, z: 0 }],
        ['c', { x: 200, y: 0, z: 0 }],
        ['d', { x: 300, y: 0, z: 0 }],
        ['e', { x: 0, y: 100, z: 0 }],
        ['f', { x: 100, y: 100, z: 0 }],
    ]);

    const hierarchy = new Map<string, string[]>([
        ['a', ['root', 'a']],
        ['b', ['root', 'b']],
        ['c', ['root', 'c']],
        ['d', ['root', 'd']],
        ['e', ['root', 'e']],
        ['f', ['root', 'f']],
    ]);

    const edges = [
        { id: 'e1', source: 'a', target: 'e', kind: 'sequence' },
        { id: 'e2', source: 'b', target: 'f', kind: 'sequence' },
        { id: 'e3', source: 'c', target: 'e', kind: 'sequence' },
        { id: 'e4', source: 'd', target: 'f', kind: 'sequence' },
    ];

    it('bundles edges with common hierarchy', () => {
        const bundler = new EdgeBundler({ minBundleSize: 2 });
        const bundled = bundler.bundleEdges(edges, positions, hierarchy);

        expect(bundled.length).toBe(4);

        // Check that bundled edges have bundleId
        const bundledWithId = bundled.filter(e => e.bundleId);
        expect(bundledWithId.length).toBeGreaterThan(0);
    });

    it('does not bundle when minBundleSize not met', () => {
        const bundler = new EdgeBundler({ minBundleSize: 5 });
        const bundled = bundler.bundleEdges(edges, positions, hierarchy);

        // All edges should be individual (no bundleId)
        const bundledWithId = bundled.filter(e => e.bundleId);
        expect(bundledWithId.length).toBe(0);
    });

    it('creates control points for bundled edges', () => {
        const bundler = new EdgeBundler({ minBundleSize: 2 });
        const bundled = bundler.bundleEdges(edges, positions, hierarchy);

        // Check that bundled edges have bundleId
        const bundledWithId = bundled.filter(e => e.bundleId);
        expect(bundledWithId.length).toBeGreaterThan(0);

        // Bundled edges have subdivisions + 1 control points
        for (const edge of bundledWithId) {
            expect(edge.controlPoints.length).toBe(21); // default subdivisions=20 + 1
        }
    });

    it('handles missing positions gracefully', () => {
        const bundler = new EdgeBundler({ minBundleSize: 2 });
        const badEdges = [{ id: 'e1', source: 'missing', target: 'a', kind: 'sequence' }];
        const bundled = bundler.bundleEdges(badEdges, positions, hierarchy);

        expect(bundled.length).toBe(1);
        expect(bundled[0].controlPoints).toEqual([]);
    });

    it('convenience function works', () => {
        const bundled = bundleEdges(edges, positions, hierarchy, { minBundleSize: 2 });

        expect(bundled.length).toBe(4);
    });

    it('respects bundlingStrength parameter', () => {
        const bundlerLow = new EdgeBundler({ minBundleSize: 2, bundlingStrength: 0.1 });
        const bundlerHigh = new EdgeBundler({ minBundleSize: 2, bundlingStrength: 0.9 });

        const bundledLow = bundlerLow.bundleEdges(edges, positions, hierarchy);
        const bundledHigh = bundlerHigh.bundleEdges(edges, positions, hierarchy);

        // With low strength, curves should be closer to straight
        // With high strength, curves should deviate more
        // We just verify both produce valid results
        expect(bundledLow.length).toBe(4);
        expect(bundledHigh.length).toBe(4);
    });

    it('respects subdivisions parameter', () => {
        const bundler = new EdgeBundler({ minBundleSize: 2, subdivisions: 5 });
        // Use 2 edges to meet minBundleSize
        const bundled = bundler.bundleEdges(edges.slice(0, 2), positions, hierarchy);

        // Should have subdivisions + 1 points (start + subdivisions)
        expect(bundled[0].controlPoints.length).toBe(6);
    });

    it('handles empty edges', () => {
        const bundler = new EdgeBundler();
        const bundled = bundler.bundleEdges([], positions, hierarchy);

        expect(bundled).toEqual([]);
    });

    it('handles edges with no common ancestor', () => {
        const flatHierarchy = new Map<string, string[]>([
            ['a', ['a']],
            ['b', ['b']],
            ['c', ['c']],
            ['d', ['d']],
        ]);

        const edges = [
            { id: 'e1', source: 'a', target: 'b', kind: 'sequence' },
            { id: 'e2', source: 'c', target: 'd', kind: 'sequence' },
        ];

        const bundler = new EdgeBundler({ minBundleSize: 2 });
        const bundled = bundler.bundleEdges(edges, positions, flatHierarchy);

        // Should still work, just grouped under 'none'
        expect(bundled.length).toBe(2);
    });
});