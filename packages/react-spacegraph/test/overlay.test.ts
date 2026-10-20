import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ScopedSubgraphOverlay, CodeDiffOverlay, type ScopedSubgraphScope } from '../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MODEL = {
    nodes: [
        { id: 'session', kind: 'session' },
        { id: 'turn', kind: 'turn' },
        { id: 'tool', kind: 'tool' },
        { id: 'file', kind: 'file' },
    ],
    edges: [
        { id: 'e1', source: 'turn', target: 'session', kind: 'part-of' },
        { id: 'e2', source: 'tool', target: 'turn', kind: 'part-of' },
        { id: 'e3', source: 'file', target: 'tool', kind: 'writes' },
    ],
};

let roots: Root[] = [];

function mount(node: ReturnType<typeof createElement>) {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    roots.push(root);
    return { container, render: () => act(async () => root.render(node)) };
}

const flush = async () => {
    await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

afterEach(async () => {
    for (const root of roots) await act(async () => root.unmount());
    roots = [];
    document.body.innerHTML = '';
});

describe('react-spacegraph ScopedSubgraphOverlay', () => {
    it('renders the scope of the node and hands it to the content slot', async () => {
        let scope: ScopedSubgraphScope | undefined;
        const { container, render } = mount(
            createElement(ScopedSubgraphOverlay, {
                model: MODEL,
                nodeId: 'turn',
                label: 'Turn map',
                onClose: () => {},
                content: (current) => {
                    scope = current;
                    return createElement('span', null, current.nodes.length);
                },
            }),
        );

        await render();
        await flush();

        expect(scope?.root?.id).toBe('turn');
        expect(scope?.nodes.map((node) => node.id)).toEqual(['turn', 'tool']);
        expect(container.querySelector('[data-slot="scoped-overlay-content"]')?.textContent).toBe('2');
    });

    it('traps the focus, closes on Escape, and restores it on unmount', async () => {
        const opener = document.createElement('button');
        document.body.append(opener);
        opener.focus();

        let closed = 0;
        const { container, render } = mount(
            createElement(ScopedSubgraphOverlay, {
                model: MODEL,
                nodeId: 'turn',
                label: 'Turn map',
                onClose: () => (closed += 1),
            }),
        );

        await render();
        await flush();

        const dialog = container.querySelector('[data-slot="scoped-overlay-dialog"]') as HTMLElement;
        expect(dialog.getAttribute('role')).toBe('dialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(document.activeElement).toBe(dialog);

        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        expect(closed).toBe(1);

        await act(async () => roots[0]!.unmount());
        roots = [];
        expect(document.activeElement).toBe(opener);
    });

    it('opens the full graph with the scoped node id', async () => {
        let opened: string | undefined;
        const { container, render } = mount(
            createElement(ScopedSubgraphOverlay, {
                model: MODEL,
                nodeId: 'turn',
                label: 'Turn map',
                openFullLabel: 'Open full graph',
                onClose: () => {},
                onOpenFull: (id) => (opened = id),
            }),
        );

        await render();
        await flush();

        (container.querySelector('[data-slot="scoped-overlay-open-full"]') as HTMLElement).click();
        expect(opened).toBe('turn');
    });
});

describe('react-spacegraph CodeDiffOverlay', () => {
    it('renders the patch as selectable text', async () => {
        const { container, render } = mount(
            createElement(CodeDiffOverlay, {
                diffs: [
                    {
                        file: 'src/file.ts',
                        patch: '@@ -1 +1 @@\n-const a = 1\n+const a = 2',
                        additions: 1,
                        deletions: 1,
                        status: 'modified',
                    },
                ],
            }),
        );

        await render();
        await flush();

        expect(container.querySelector('[data-slot="code-diff-path"]')?.textContent).toBe('src/file.ts');
        expect(container.querySelectorAll('[data-slot="code-diff-line"]')).toHaveLength(3);
        expect(container.querySelector('[data-tone="added"]')?.textContent).toBe('+const a = 2');
    });
});
