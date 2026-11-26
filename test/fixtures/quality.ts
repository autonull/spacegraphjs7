import type { QualityModel } from '../../src/quality';

export const cleanModel = (): QualityModel => ({
    nodes: [
        { id: 'a', label: 'A', position: [0, 0, 0] },
        { id: 'b', label: 'B', position: [400, 0, 0] },
    ],
    edges: [{ id: 'e', source: 'a', target: 'b' }],
});

export const defectiveModel = (): QualityModel => ({
    nodes: [
        { id: 'a', position: [0, 0, 0] },
        { id: 'b', position: [2, 0, 0] },
    ],
    edges: [{ id: 'e', source: 'a', target: 'missing' }],
});

export const heavyModel = (): QualityModel => ({
    nodes: ['a', 'b', 'c'].map((id, index) => ({
        id,
        label: id.toUpperCase(),
        position: [index * 100, 0, 0] as const,
        data: { html: '<b>x</b>' },
    })),
});
