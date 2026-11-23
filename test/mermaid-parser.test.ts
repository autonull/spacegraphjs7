// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MermaidParser } from '../src/plugins/mermaid/MermaidParser';

const shapeOf = (line: string) => new MermaidParser().parse(`graph TD\n${line}`).nodes[0];

describe('Mermaid node shapes', () => {
    it('recognises the reachable shape forms', () => {
        expect(shapeOf('A[label]')).toMatchObject({ shape: 'rect', label: 'label' });
        expect(shapeOf('A(label)')).toMatchObject({ shape: 'round', label: 'label' });
        expect(shapeOf('A{label}')).toMatchObject({ shape: 'diamond', label: 'label' });
        expect(shapeOf('A>label<')).toMatchObject({ shape: 'trapezoid', label: 'label' });
    });

    it('matches the round and rect forms before the double-delimiter variants', () => {
        expect(shapeOf('A((label))')).toMatchObject({ shape: 'round', label: '(label' });
        expect(shapeOf('A[[label]]')).toMatchObject({ shape: 'rect', label: '[label' });
    });
});
