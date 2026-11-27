// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DropdownNode } from '../src/nodes/DropdownNode';
import { ProgressBarNode } from '../src/nodes/ProgressBarNode';

const dropdown = () =>
    new DropdownNode(undefined, {
        id: 'd',
        type: 'DropdownNode',
        data: {
            options: [
                { id: 'a', label: 'A', value: 7 },
                { id: 'b', label: 'B' },
            ],
        },
    });

describe('DropdownNode', () => {
    it('selects by id and reports the option value', () => {
        const node = dropdown();
        const select = node.domElement.querySelector('select')!;
        expect(select.value).toBe('a');

        select.value = 'b';
        select.dispatchEvent(new Event('change'));
        expect(node.getValue()).toBe('b');

        node.setValue('a');
        expect(select.value).toBe('a');
        expect(node.getValue()).toBe('a');
        node.dispose();
    });
});

describe('ProgressBarNode', () => {
    it('shares one keyframes rule across instances and ignores repeated starts', () => {
        document.head.replaceChildren();
        const first = new ProgressBarNode(undefined, {
            id: 'p1',
            type: 'ProgressBarNode',
            data: { indeterminate: true },
        });
        new ProgressBarNode(undefined, {
            id: 'p2',
            type: 'ProgressBarNode',
            data: { indeterminate: true },
        }).dispose();
        first.setIndeterminate(true);

        expect(document.head.querySelectorAll('#sg-progress-indeterminate')).toHaveLength(1);
        first.dispose();
    });
});
