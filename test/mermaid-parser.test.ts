// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MermaidParser } from '../src/plugins/mermaid/MermaidParser';

const shapeOf = (line: string) => new MermaidParser().parse(`graph TD\n${line}`).nodes[0];
const edgesOf = (line: string) => new MermaidParser().parse(`graph TD\n${line}`).edges;

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

describe('Mermaid edges', () => {
    it('keeps the target id out of an unlabelled edge', () => {
        expect(edgesOf('A --> B')).toMatchObject([{ source: 'A', target: 'B', style: 'solid' }]);
        expect(edgesOf('A --> B')[0].label).toBeUndefined();
    });

    it('reads the label from a labelled edge', () => {
        expect(edgesOf('A -->|yes| B')).toMatchObject([
            { source: 'A', target: 'B', label: 'yes', style: 'solid' },
        ]);
        expect(edgesOf('A -.->|later| B')).toMatchObject([
            { source: 'A', target: 'B', label: 'later', style: 'dotted' },
        ]);
    });

    it('parses bold edges with and without labels', () => {
        expect(edgesOf('A ==> C')).toMatchObject([{ source: 'A', target: 'C', style: 'bold' }]);
        expect(edgesOf('A ==>|must| C')).toMatchObject([
            { source: 'A', target: 'C', label: 'must', style: 'bold' },
        ]);
        expect(new MermaidParser().parse('graph TD\nA ==> C').nodes.map((node) => node.id)).toEqual(
            ['A', 'C'],
        );
    });
});
