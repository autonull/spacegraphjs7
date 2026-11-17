import { describe, expect, it } from 'vitest';
import { RENDERER_STRATEGIES } from '@spacegraphjs/adapter';
import { EXAMPLE_PRESETS } from '@spacegraphjs/config';
import { libraryManifest } from '@spacegraphjs/config/library';
import { CARD_FACINGS, DEPTH_MODES, PROJECTIONS } from '@spacegraphjs/renderer';
import { EDGE_RUNG_IDS } from 'spacegraphjs/edges/ladder';
import { LAYOUT_REGISTRY } from 'spacegraphjs/layout-registry';
import { DEFAULT_RUNG_IDS } from 'spacegraphjs/representations';

const manifest = libraryManifest();
const values = (axis: string): string[] =>
    manifest.entries.find((entry) => entry.id === axis)?.values.map(String) ?? [];

describe('library capability manifest', () => {
    it('lists every value owned by the library registries', () => {
        expect(values('projection')).toEqual([...PROJECTIONS]);
        expect(values('depth')).toEqual([...DEPTH_MODES]);
        expect(values('cardFacing')).toEqual([...CARD_FACINGS]);
        expect(values('layout')).toEqual(LAYOUT_REGISTRY.map((entry) => entry.id));
        expect(values('rendererStrategy')).toEqual([...RENDERER_STRATEGIES]);
        expect(values('lod')).toEqual([...DEFAULT_RUNG_IDS]);
        expect(values('edgeLod')).toEqual([...EDGE_RUNG_IDS]);
    });

    it('declares every axis an example preset touches', () => {
        const ids = new Set(manifest.entries.map((entry) => entry.id));
        for (const preset of EXAMPLE_PRESETS) {
            for (const axis of Object.keys(preset.values)) expect(ids.has(axis)).toBe(true);
        }
    });

    it('gives every entry a source and declares reduced-motion behavior where relevant', () => {
        for (const entry of manifest.entries) {
            expect(entry.source.length).toBeGreaterThan(0);
            expect(entry.values.length).toBeGreaterThan(0);
        }
        expect(manifest.entries.find((entry) => entry.id === 'depth')?.reducedMotion).toBeTruthy();
    });

    it('reflects a registry addition without library manifest edits', () => {
        const extra = { id: 'probe', name: 'Probe', description: 'test' };
        LAYOUT_REGISTRY.push(extra);
        try {
            const updated = libraryManifest().entries.find((entry) => entry.id === 'layout');
            expect(updated?.values).toContain('probe');
        } finally {
            LAYOUT_REGISTRY.splice(LAYOUT_REGISTRY.indexOf(extra), 1);
        }
    });
});
