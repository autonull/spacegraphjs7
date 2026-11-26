import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { passthroughI18n } from '@spacegraphjs/shared';
import { GraphSearch } from './GraphSearch';

describe('GraphSearch', () => {
    it('renders one option per result', () => {
        const model = {
            nodes: [
                { id: 's1', label: 'Session', kind: 'session', status: 'complete' },
                { id: 's2', label: 'Another', kind: 'session', status: 'complete' },
            ],
            edges: [],
        };
        const renderers = createRoot(() =>
            GraphSearch({
                model,
                onSelect: () => {},
                onClose: () => {},
                initialQuery: 'g s',
                t: passthroughI18n.t,
                plural: passthroughI18n.plural,
                Icon: () => null,
            }),
        );
        const list = renderers[2](undefined, 0) as HTMLElement;
        expect(
            [...list.querySelectorAll('[role="option"]')].map((option) =>
                option.getAttribute('data-node-id'),
            ),
        ).toEqual(['s1', 's2']);
    });
});
