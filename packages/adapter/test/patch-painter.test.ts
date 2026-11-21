// @vitest-environment node
import { describe, expect, test } from 'vitest';
import type { GraphRenderer, RenderModel, RenderModelPatch } from '@spacegraphjs/renderer';
import { createPatchPainter } from '../src/patch-painter';

const model = (label: string): RenderModel => ({
    nodes: [{ id: 'a', kind: 'card', label, status: 'neutral', position: [0, 0, 0] }],
    edges: [],
});

function recorder() {
    const calls: string[] = [];
    const renderer: Pick<GraphRenderer, 'setModel' | 'applyPatch'> = {
        setModel: () => calls.push('setModel'),
        applyPatch: (patch: RenderModelPatch) =>
            calls.push(`applyPatch:${patch.nodes.changed.length}`),
    };
    return { calls, renderer };
}

describe('createPatchPainter', () => {
    test('the first paint is a full model', () => {
        const { calls, renderer } = recorder();
        createPatchPainter(renderer).paint(model('A'));
        expect(calls).toEqual(['setModel']);
    });

    test('later paints send a patch when the renderer accepts one', () => {
        const { calls, renderer } = recorder();
        const painter = createPatchPainter(renderer);
        painter.paint(model('A'));
        painter.paint(model('B'));
        expect(calls).toEqual(['setModel', 'applyPatch:1']);
    });

    test('a renderer without patch support keeps receiving full models', () => {
        const calls: string[] = [];
        const renderer: Pick<GraphRenderer, 'setModel' | 'applyPatch'> = {
            setModel: () => calls.push('setModel'),
        };
        const painter = createPatchPainter(renderer);
        painter.paint(model('A'));
        painter.paint(model('B'));
        expect(calls).toEqual(['setModel', 'setModel']);
    });

    test('host data changes are part of the patch', () => {
        const { calls, renderer } = recorder();
        const painter = createPatchPainter(renderer);
        const base = model('A');
        painter.paint(base);
        painter.paint({
            ...base,
            nodes: base.nodes.map((node) => ({ ...node, data: { tone: 'dim' } })),
        });
        expect(calls).toEqual(['setModel', 'applyPatch:1']);
    });
});
