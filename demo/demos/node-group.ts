import { createDemo, SpaceGraph } from '../framework';

export default async function nodeGroupDemo(): Promise<SpaceGraph> {
  return await createDemo({
        nodes: [
            {
                id: 'group1',
                type: 'GroupNode',
                label: 'Cluster A',
                position: [-200, 0, 0],
                data: { width: 300, height: 250, color: 0x224488 },
            },
            {
                id: 'a1',
                type: 'ShapeNode',
                position: [-50, 50, 0],
                data: { parentId: 'group1', color: 0xff6644 },
            },
            {
                id: 'a2',
                type: 'ShapeNode',
                position: [50, 50, 0],
                data: { parentId: 'group1', color: 0x44ff88 },
            },
            {
                id: 'a3',
                type: 'ShapeNode',
                position: [0, -50, 0],
                data: { parentId: 'group1', color: 0x4488ff },
            },
            {
                id: 'group2',
                type: 'GroupNode',
                label: 'Cluster B',
                position: [200, 0, 0],
                data: { width: 300, height: 250, color: 0x884422 },
            },
            {
                id: 'b1',
                type: 'ShapeNode',
                position: [-50, 50, 0],
                data: { parentId: 'group2', color: 0xaa44ff },
            },
            {
                id: 'b2',
                type: 'ShapeNode',
                position: [50, 50, 0],
                data: { parentId: 'group2', color: 0xffaa44 },
            },
            {
                id: 'b3',
                type: 'ShapeNode',
                position: [0, -50, 0],
                data: { parentId: 'group2', color: 0x44aaff },
            },
        ],
        edges: [
            { id: 'e1', source: 'a1', target: 'a2', type: 'Edge' },
            { id: 'e2', source: 'a2', target: 'a3', type: 'Edge' },
            { id: 'e3', source: 'a3', target: 'a1', type: 'Edge' },
            { id: 'e4', source: 'b1', target: 'b2', type: 'Edge' },
            { id: 'e5', source: 'b2', target: 'b3', type: 'Edge' },
            { id: 'e6', source: 'b3', target: 'b1', type: 'Edge' },
        ],
    });
}
