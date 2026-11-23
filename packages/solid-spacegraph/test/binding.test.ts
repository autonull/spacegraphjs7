import { afterEach, describe, expect, it } from 'vitest';
import { createComponent, createRoot, createSignal } from 'solid-js';
import { insert } from 'solid-js/web';
import { MODEL, THEME, fakeRenderer } from '../../renderer/test/fixtures';
import type { RenderModel } from '@spacegraphjs/renderer';
import { GraphView } from '../src';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const disposers: (() => void)[] = [];

function mount(code: () => unknown) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const dispose = createRoot((root) => {
        insert(container, code() as Node);
        return root;
    });
    disposers.push(dispose);
    return container;
}

afterEach(() => {
    for (const dispose of disposers) dispose();
    disposers.length = 0;
    document.body.innerHTML = '';
});

describe('solid-spacegraph GraphView', () => {
    it('mounts the renderer, pushes the model and selection, and disposes on cleanup', async () => {
        const { renderer, calls } = fakeRenderer();
        mount(() =>
            createComponent(GraphView, {
                createRenderer: () => renderer,
                model: MODEL,
                theme: THEME,
                selection: ['read'],
            }),
        );

        await flush();

        expect(calls.mounted).toBe(1);
        expect(calls.models.at(-1)?.nodes.map((node) => node.id)).toEqual(['root', 'read']);
        expect(calls.selection.at(-1)).toEqual(['read']);

        for (const dispose of disposers) dispose();
        disposers.length = 0;
        expect(calls.disposed).toBe(1);
    });

    it('reacts to a model signal without remounting the renderer', async () => {
        const { renderer, calls } = fakeRenderer();
        const [model, setModel] = createSignal<RenderModel>(MODEL);
        mount(() =>
            createComponent(GraphView, {
                createRenderer: () => renderer,
                get model() {
                    return model();
                },
                theme: THEME,
            }),
        );
        await flush();
        calls.models.length = 0;

        setModel({
            nodes: [{ id: 'root', kind: 'session', label: 'Session', position: [0, 0, 0] }],
            edges: [],
        });
        await flush();

        expect(calls.mounted).toBe(1);
        expect(calls.models.at(-1)?.nodes.map((node) => node.id)).toEqual(['root']);
    });
});
