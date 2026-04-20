import { createDemo } from '../framework';

export default async function fingeringHoverDemo() {
  return await createDemo({
        nodes: [
            { id: 'n1', type: 'ShapeNode', position: [-200, 100, 0], data: { color: 0xff6644 } },
            { id: 'n2', type: 'ShapeNode', position: [0, 100, 0], data: { color: 0x44ff88 } },
            { id: 'n3', type: 'ShapeNode', position: [200, 100, 0], data: { color: 0x4488ff } },
            { id: 'n4', type: 'ShapeNode', position: [-100, -100, 0], data: { color: 0xaa44ff } },
            { id: 'n5', type: 'ShapeNode', position: [100, -100, 0], data: { color: 0xffaa44 } },
        ],
        edges: [],
    });
}
