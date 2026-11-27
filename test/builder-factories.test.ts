// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NodeFactory } from '../src/builder/factories';

const dataOf = (builder: { build(): { data?: Record<string, unknown> } }) =>
    builder.build().data ?? {};

describe('NodeFactory', () => {
    it('writes the data keys its control nodes read', () => {
        expect(dataOf(NodeFactory.colorPicker('c', '#00ff00')).color).toBe('#00ff00');
        expect(dataOf(NodeFactory.markdown('m', '# Hi')).markdown).toBe('# Hi');
        expect(dataOf(NodeFactory.math('x', 'a+b')).math).toBe('a+b');
        expect(dataOf(NodeFactory.video('v', 'movie.mp4')).src).toBe('movie.mp4');
        expect(dataOf(NodeFactory.audio('a', 'sound.mp3')).src).toBe('sound.mp3');
        expect(dataOf(NodeFactory.port('p', 'input')).portDirection).toBe('input');
    });

    it('maps dropdown labels to option objects with matching ids and labels', () => {
        expect(dataOf(NodeFactory.dropdown('d', ['A', 'B'])).options).toEqual([
            { id: 'A', label: 'A' },
            { id: 'B', label: 'B' },
        ]);
    });
});
