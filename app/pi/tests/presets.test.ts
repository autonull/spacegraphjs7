// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GRAPH_LAYOUTS } from '../src/graph-layout';
import { POLICY_SCHEMA } from '../src/policy';
import { uiComparison } from '../src/ui/evidence';
import {
    UI_PRESETS,
    applyUIPreset,
    isUIPresetID,
    uiPresetById,
    type UIPresetTarget,
} from '../src/ui/presets';

const calls = () => {
    const log: string[] = [];
    const target: UIPresetTarget = {
        setPolicyLayer: (layer, values) => log.push(`layer:${layer}:${Object.keys(values).join(',')}`),
        setGraphLayout: (mode) => log.push(`layout:${mode}`),
        setGraphLayoutAligned: (aligned) => log.push(`aligned:${aligned}`),
        setRibbonCorridor: (enabled) => log.push(`ribbon:${enabled}`),
        setGraphMorph: (enabled) => log.push(`morph:${enabled}`),
        setTranscriptCollapsed: (collapsed) => log.push(`transcript:${collapsed}`),
    };
    return { log, target };
};

describe('UI preset catalogue', () => {
    it('names unique ids and only uses existing knobs and graph views', () => {
        expect(new Set(UI_PRESETS.map((entry) => entry.id)).size).toBe(UI_PRESETS.length);
        const knobs = new Set(POLICY_SCHEMA.knobs.map((knob) => knob.id));
        for (const entry of UI_PRESETS) {
            for (const id of Object.keys(entry.knobs))
                expect(knobs.has(id), `${entry.id}: ${id}`).toBe(true);
            const layout = entry.flags?.graphLayout;
            if (layout) expect(GRAPH_LAYOUTS).toContain(layout);
            expect(entry.gates.length).toBeGreaterThan(0);
        }
    });

    it('resolves ids without guessing', () => {
        expect(uiPresetById('compact')?.title).toBe('Compact chrome');
        expect(uiPresetById('missing')).toBeUndefined();
        expect(isUIPresetID('full')).toBe(true);
        expect(isUIPresetID('')).toBe(false);
    });
});

describe('applyUIPreset', () => {
    it('applies the knob bundle at the experiment layer and declares a chrome', () => {
        const { log, target } = calls();
        const applied = applyUIPreset('compact', target);
        expect(applied?.chrome).toBe('compact');
        expect(log).toEqual(['layer:experiment:navigation.minimap,navigation.trail,navigation.breadcrumbs']);
    });

    it('applies graph flags through existing view setters', () => {
        const { log, target } = calls();
        applyUIPreset('morph', target);
        expect(log).toEqual(['layer:experiment:', 'morph:true']);
    });

    it('leaves the target untouched for an unknown id', () => {
        const { log, target } = calls();
        expect(applyUIPreset('missing', target)).toBeUndefined();
        expect(log).toEqual([]);
    });
});

describe('UI comparison scaffolding', () => {
    it('emits one pending ADR decision per non-incumbent preset', () => {
        const comparison = uiComparison(UI_PRESETS, '2026-11-22');
        expect(comparison.recorded).toBe('2026-11-22');
        expect(comparison.decisions.map((decision) => decision.id)).not.toContain('ui-preset-full');
        expect(comparison.decisions).toHaveLength(UI_PRESETS.length - 1);
        for (const decision of comparison.decisions) {
            expect(decision.status).toContain('default not flipped');
            expect(decision.data).toBe('docs/screenshots/ui-presets/comparison.json');
            expect(decision.gates.length).toBeGreaterThan(0);
            expect(decision.images).toContain('pending');
            expect(decision.decision).toContain('pending human review');
        }
    });
});
