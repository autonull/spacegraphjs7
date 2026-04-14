import { createDemo } from '../framework';

export default function fingeringWiringDemo() {
    return createDemo({
        nodes: [
            { id: 'n1', type: 'ShapeNode', position: [-200, 100, 0], data: { color: 0xff6644 } },
            { id: 'n2', type: 'ShapeNode', position: [0, 100, 0], data: { color: 0x44ff88 } },
            { id: 'n3', type: 'ShapeNode', position: [200, 100, 0], data: { color: 0x4488ff } },
            { id: 'n4', type: 'ShapeNode', position: [-200, -100, 0], data: { color: 0xaa44ff } },
            { id: 'n5', type: 'ShapeNode', position: [0, -100, 0], data: { color: 0xffaa44 } },
            { id: 'n6', type: 'ShapeNode', position: [200, -100, 0], data: { color: 0x44aaff } },
        ],
        edges: [
            { id: 'e1', source: 'n1', target: 'n2', type: 'Edge' },
            { id: 'e2', source: 'n2', target: 'n3', type: 'Edge' },
        ],
    });
}
