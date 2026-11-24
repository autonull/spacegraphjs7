import { TabRegistry } from 'pi-kit';
import { describe, expect, it } from 'vitest';
import { scenarioByID, scenarioOps } from '../src/scenarios';

const ids = (registry: TabRegistry): readonly string[] =>
    registry.active()!.session.state().nodes.map((node) => node.id);

describe('code and image workshops', () => {
    it.each(['code-mode', 'images'])('%s folds deterministically from committed data', (id) => {
        const scenario = scenarioByID(id)!;
        expect(scenarioOps(scenario)).toEqual(scenarioOps(scenario));
        const kinds = scenarioOps(scenario).flatMap((op) => (op.op === 'add-node' ? [op.node.kind] : []));
        expect(kinds).toContain(id === 'code-mode' ? 'action' : 'artifact');
    });

    it('keeps nested calls and artifacts stable across a journaled restart', () => {
        const scenario = scenarioByID('code-mode')!;
        const first = new TabRegistry();
        first.add('1', scenarioOps(scenario));
        const journal = first.active()!.session.entries.map((entry) => entry.op);
        const restarted = new TabRegistry();
        restarted.add('1', journal);
        expect(ids(restarted)).toEqual(ids(first));
        expect(ids(restarted)).toContain('d:1:code:call');
        expect(ids(restarted)).toContain('d:1:code:artifact:a1');
    });

    it('carries the image inside data, not a renderer contract', () => {
        const ops = scenarioOps(scenarioByID('images')!);
        const image = ops.find((op) => op.op === 'add-node' && op.node.id === 'd:1:image:pixel');
        expect(image?.op).toBe('add-node');
        if (image?.op === 'add-node') {
            expect(String(image.node.data?.['image'])).toMatch(/^iVBORw0KGgo/);
            expect(image.node.data?.['toolName']).toBe('fit');
        }
    });
});
