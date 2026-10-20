import { afterEach, describe, expect, it } from 'vitest';
import { createComponent, createRoot } from 'solid-js';
import { insert } from 'solid-js/web';
import { ScopedSubgraphOverlay, CodeDiffOverlay, type ScopedSubgraphScope } from '../src';

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

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
    for (const dispose of disposers) dispose();
    disposers.length = 0;
    document.body.innerHTML = '';
});

describe('solid-spacegraph ScopedSubgraphOverlay', () => {
    it('renders the scope of the node and hands it to the content slot', async () => {
        let scope: ScopedSubgraphScope | undefined;
        const container = mount(() =>
            createComponent(ScopedSubgraphOverlay, {
                model: MODEL,
                nodeId: 'turn',
                label: 'Turn map',
                onClose: () => {},
                content: (current) => {
                    scope = current;
                    const text = document.createElement('span');
                    text.textContent = String(current.nodes.length);
                    return text;
                },
            }),
        );
        await flush();

        expect(scope?.root?.id).toBe('turn');
        expect(scope?.nodes.map((node) => node.id)).toEqual(['turn', 'tool']);
        expect(container.querySelector('[data-slot="scoped-overlay-content"]')?.textContent).toBe('2');
    });

    it('traps the focus, closes on Escape, and restores it on dispose', async () => {
        const opener = document.createElement('button');
        document.body.append(opener);
        opener.focus();

        let closed = 0;
        const container = mount(() =>
            createComponent(ScopedSubgraphOverlay, {
                model: MODEL,
                nodeId: 'turn',
                label: 'Turn map',
                onClose: () => (closed += 1),
            }),
        );
        await flush();

        const dialog = container.querySelector('[data-slot="scoped-overlay-dialog"]') as HTMLElement;
        expect(dialog.getAttribute('role')).toBe('dialog');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(document.activeElement).toBe(dialog);

        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        expect(closed).toBe(1);

        for (const dispose of disposers) dispose();
        disposers.length = 0;
        expect(document.activeElement).toBe(opener);
    });

    it('opens the full graph with the scoped node id', async () => {
        let opened: string | undefined;
        const container = mount(() =>
            createComponent(ScopedSubgraphOverlay, {
                model: MODEL,
                nodeId: 'turn',
                label: 'Turn map',
                openFullLabel: 'Open full graph',
                onClose: () => {},
                onOpenFull: (id) => (opened = id),
            }),
        );
        await flush();

        (container.querySelector('[data-slot="scoped-overlay-open-full"]') as HTMLElement).click();
        expect(opened).toBe('turn');
    });
});

describe('solid-spacegraph CodeDiffOverlay', () => {
    it('renders the patch as selectable text', async () => {
        const container = mount(() =>
            createComponent(CodeDiffOverlay, {
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
        await flush();

        expect(container.querySelector('[data-slot="code-diff-path"]')?.textContent).toBe('src/file.ts');
        expect(container.querySelectorAll('[data-slot="code-diff-line"]')).toHaveLength(3);
        expect(container.querySelector('[data-tone="added"]')?.textContent).toBe('+const a = 2');
    });
});
