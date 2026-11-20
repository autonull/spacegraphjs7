// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { agentDomain } from '@spacegraphjs/agent';
import { fixtureKernel } from '../src/fixture';
import {
    CARD_BUDGETS,
    UNSUPPORTED,
    decayActivity,
    exportHTML,
    exportJSON,
    exportSVG,
    levelForZoom,
    scoreVision,
    windowedView,
} from '../src/policy';

describe('host policy', () => {
    it('scores overlap and maps zoom to levels with hysteresis', () => {
        expect(scoreVision(new Map())).toEqual({ overlap: 0, legibility: 1 });
        const positions = new Map([
            ['a', { x: 0, y: 0, z: 0 }],
            ['b', { x: 10, y: 10, z: 0 }],
            ['c', { x: 900, y: 900, z: 0 }],
        ]);
        const score = scoreVision(positions);
        expect(score.overlap).toBeGreaterThan(0);
        expect(score.legibility).toBeLessThan(1);
        expect(levelForZoom(0.2, 'execution')).toBe('overview');
        expect(levelForZoom(0.8, 'overview')).toBe('execution');
        expect(levelForZoom(2, 'execution')).toBe('detail');
        expect(levelForZoom(1.4, 'detail')).toBe('execution');
        expect(CARD_BUDGETS).toEqual({ overview: 12, execution: 40, detail: 24 });
    });

    it('windows turns without changing layout input and exports portable artifacts', () => {
        const kernel = fixtureKernel();
        const view = agentDomain.build(kernel);
        const positions = new Map(view.nodes.map((node, index) => [node.id, { x: index * 20, y: 0, z: 0 }]));
        const windowed = windowedView(view, 1);
        expect(windowed.hidden).toBeGreaterThan(0);
        expect(windowed.view.nodes.length).toBeLessThan(view.nodes.length);
        expect(windowed.view.edges.every((edge) =>
            windowed.view.nodes.some((node) => node.id === edge.source),
        )).toBe(true);
        expect(exportJSON(kernel)).toContain('nodes');
        expect(exportHTML(view, positions)).toContain('<li');
        expect(exportSVG(view, positions)).toContain('<svg');
    });

    it('decays activity and reports sensory seams without attempts', () => {
        const activity = new Map([
            ['a', 1],
            ['b', 0.01],
        ]);
        decayActivity(activity, 1);
        expect(activity.has('b')).toBe(false);
        expect(activity.get('a')).toBeLessThan(1);
        expect(UNSUPPORTED.map((item) => item.id)).toEqual(['webxr', 'sound', 'haptics']);
    });
});
