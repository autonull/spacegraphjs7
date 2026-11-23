// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { checkQuality, correctQuality, type QualityModel } from '../src/quality';

const model: QualityModel = {
    nodes: [
        { id: 'a', label: 'A', position: [0, 0, 0] },
        { id: 'b', label: 'B', position: [400, 0, 0] },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b' }],
};

function mirror(ids: readonly string[], options: { direction?: string; reduced?: boolean } = {}) {
    const container = document.createElement('div');
    if (options.direction) container.setAttribute('dir', options.direction);
    if (options.reduced) container.setAttribute('data-reduced-motion', 'true');
    for (const id of ids) {
        const item = document.createElement('li');
        item.dataset.id = id;
        item.setAttribute('role', 'treeitem');
        item.tabIndex = -1;
        container.appendChild(item);
    }
    return container;
}

describe('quality accessibility assertions', () => {
    it('passes when the DOM mirror, direction and reduced motion match', () => {
        const report = checkQuality(model, {
            dom: mirror(['a', 'b'], { direction: 'rtl', reduced: true }),
            direction: 'rtl',
            reducedMotion: true,
        });
        expect(report.issues).toEqual([]);
        expect(report.score).toBe(100);
    });

    it('reports a missing mirror item without trying to auto-fix it', () => {
        const report = checkQuality(model, { dom: mirror(['a']) });
        expect(report.issues.map((issue) => issue.code)).toEqual(['a11y-missing-item']);
        expect(report.issues[0]?.autofix).toBe(false);
        const outcome = correctQuality(model, { dom: mirror(['a']) });
        expect(outcome.applied).toEqual([]);
        expect(outcome.after.issues.map((issue) => issue.code)).toEqual(['a11y-missing-item']);
    });

    it('reports direction and motion mismatches', () => {
        const report = checkQuality(model, {
            dom: mirror(['a', 'b'], { direction: 'ltr' }),
            direction: 'rtl',
            reducedMotion: true,
        });
        expect(report.issues.map((issue) => issue.code)).toEqual([
            'direction-mismatch',
            'motion-mismatch',
        ]);
    });

    it('accepts the roving-tabindex list items the a11y layer paints', () => {
        const dom = mirror(['a', 'b']);
        for (const item of [...dom.querySelectorAll('li')]) item.removeAttribute('role');
        expect(checkQuality(model, { dom }).issues).toEqual([]);
    });
});
