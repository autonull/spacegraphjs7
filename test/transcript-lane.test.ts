// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { transcriptLane, type TranscriptLine } from '../src/layout/transcript';
const lines: readonly TranscriptLine[] = [
    { id: 'u1', width: 200, height: 22 },
    { id: 'f1', parent: 'u1', width: 80, height: 12 },
    { id: 'p1', parent: 'u1', width: 120, height: 12 },
    { id: 'd1', parent: 'p1', width: 60, height: 9 },
    { id: 'a1', width: 160, height: 22 },
];
const lane = () => transcriptLane(lines, { gutter: 12, spineStep: 40, contextStep: 20 });
describe('transcriptLane', () => {
    it('aligns spine left edges and steps downward', () => {
        const { positions } = lane();
        expect(positions.get('u1')).toEqual({ x: 100, y: 0, z: 0 });
        expect(positions.get('a1')).toEqual({ x: 80, y: -40, z: 0 });
    });
    it('opens a gutter and a column per attachment depth', () => {
        const { positions, octaves } = lane();
        expect(positions.get('f1')!.x - 80 / 2).toBe(212);
        expect(positions.get('p1')!.x - 120 / 2).toBe(212);
        expect(positions.get('d1')!.x - 60 / 2).toBe(344);
        expect([...octaves].filter(([, value]) => value === -1).map(([id]) => id)).toEqual([
            'f1',
            'p1',
        ]);
        expect(octaves.get('d1')).toBe(-2);
    });
    it('centers attached cards on their parent and never moves earlier lines', () => {
        const { positions } = lane();
        expect(positions.get('f1')!.y).toBe(-10);
        expect(positions.get('p1')!.y).toBe(10);
        expect(positions.get('d1')!.y).toBe(10);
        const grown = transcriptLane([...lines, { id: 'a2', width: 180, height: 22 }], {
            gutter: 12,
            spineStep: 40,
            contextStep: 20,
        });
        expect(grown.positions.get('u1')).toEqual(positions.get('u1'));
        expect(grown.positions.get('f1')).toEqual(positions.get('f1'));
        expect(grown.positions.get('a2')!.y).toBe(-80);
    });
    it('treats an unknown parent as a spine line', () => {
        const { positions, octaves } = transcriptLane([
            { id: 'lonely', parent: 'gone', width: 40, height: 10 },
        ]);
        expect(positions.get('lonely')).toEqual({ x: 20, y: 0, z: 0 });
        expect(octaves.get('lonely')).toBe(0);
    });
});
