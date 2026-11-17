import { describe, expect, it } from 'bun:test';
import { buildManifest, ConfigSpace, ConfigState, manifestIds, manifestSpace, negotiate } from './index';
import type { ManifestEntry } from './index';

const entries: ManifestEntry[] = [
    {
        id: 'projection',
        values: ['spacegraph', 'cytoscape', 'svg-preview'],
        source: 'renderer/src/index.ts',
        default: 'spacegraph',
    },
    {
        id: 'depth',
        values: ['none', 'fog', 'layers'],
        source: 'DepthCues.ts',
        capability: 'depth',
        reducedMotion: 'static fog; no parallax',
    },
    {
        id: 'motion',
        values: ['full', 'reduced'],
        source: 'graph-motion.css',
        default: 'reduced',
        valueFlags: { full: 'graph_motion' },
    },
];

const space = new ConfigSpace(entries);

describe('ConfigSpace', () => {
    it('preserves registry order and reports every value', () => {
        expect(space.ids()).toEqual(['projection', 'depth', 'motion']);
        expect(space.values('depth')).toEqual(['none', 'fog', 'layers']);
        expect(space.values('missing')).toEqual([]);
    });

    it('derives a baseline from descriptor defaults', () => {
        expect(space.defaultValues()).toEqual({
            projection: 'spacegraph',
            depth: 'none',
            motion: 'reduced',
        });
    });
});

describe('ConfigState', () => {
    it('is immutable and URL round-trips exactly', () => {
        const base = ConfigState.from(space);
        const next = base.set('depth', 'fog');
        expect(base.get('depth')).toBe('none');
        expect(next.get('depth')).toBe('fog');
        expect(ConfigState.fromSearch(space, next.toHash()).equals(next)).toBe(true);
    });

    it('ignores unknown axes and values from a hash', () => {
        const restored = ConfigState.fromSearch(space, '#depth=bogus&ghost=on&motion=full');
        expect(restored.get('depth')).toBe('none');
        expect(restored.get('ghost')).toBeUndefined();
        expect(restored.get('motion')).toBe('full');
    });
});

describe('negotiate', () => {
    it('keeps supported values unchanged', () => {
        const result = negotiate(space, ConfigState.from(space, { depth: 'fog' }), {
            capabilities: new Set(['depth']),
        });
        expect(result.axes.every((axis) => axis.status === 'supported')).toBe(true);
        expect(result.state.get('depth')).toBe('fog');
    });

    it('explains capability and flag gates and falls back when possible', () => {
        const result = negotiate(space, ConfigState.from(space, { depth: 'layers', motion: 'full' }));
        const byAxis = Object.fromEntries(result.axes.map((axis) => [axis.axis, axis]));
        expect(byAxis.depth?.status).toBe('unsupported');
        expect(byAxis.depth?.reason).toContain('capability "depth"');
        expect(byAxis.motion?.status).toBe('degraded-to');
        expect(byAxis.motion?.value).toBe('reduced');
        expect(byAxis.motion?.reason).toContain('flag "graph_motion"');
        expect(result.state.get('depth')).toBe('layers');
        expect(result.state.get('motion')).toBe('reduced');
    });

    it('reports unsupported when no fallback is available', () => {
        const narrow = new ConfigSpace([
            { id: 'depth', values: ['fog'], source: 'test', capability: 'depth' },
        ]);
        const result = negotiate(narrow, ConfigState.from(narrow, { depth: 'fog' }));
        expect(result.axes[0]).toMatchObject({ status: 'unsupported', value: 'fog' });
    });
});

describe('manifest', () => {
    it('exposes registered values as a config space and a coverage set', () => {
        const manifest = buildManifest('1.0.0', entries);
        expect(manifestIds(manifest)).toEqual(new Set(['projection', 'depth', 'motion']));
        expect(manifestSpace(manifest).values('projection')).toContain('svg-preview');
        expect(manifest.entries[1]?.reducedMotion).toBe('static fog; no parallax');
    });
});
