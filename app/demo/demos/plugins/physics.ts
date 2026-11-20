import { PhysicsPlugin } from 'spacegraphjs';
import { createDemoWithNodes, type SpaceGraph } from '../../framework';

export default async function physicsDemo(): Promise<SpaceGraph> {
    const nodes: any[] = [];
    const edges: any[] = [];

    // Central node
    nodes.push({
        id: 'center',
        type: 'ShapeNode',
        label: 'Core',
        position: [0, 0, 0],
        data: { shape: 'sphere', color: 0x8b5cf6 },
    });

    // Satellites
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 200;
        const id = `sat_${i}`;

        nodes.push({
            id: id,
            type: 'ShapeNode',
            label: `Node ${i}`,
            position: [Math.cos(angle) * radius, Math.sin(angle) * radius, 0],
            data: { shape: 'box', color: 0x3b82f6 },
        });

        edges.push({
            id: `e_${i}`,
            source: 'center',
            target: id,
            type: 'FlowEdge',
        });

        // Connect ring
        const nextI = (i + 1) % 8;
        edges.push({
            id: `ring_${i}`,
            source: id,
            target: `sat_${nextI}`,
            type: 'DottedEdge',
        });
    }

    const physics = new PhysicsPlugin({
        gravity: 0,
        friction: 0.8,
        bounce: 0.5,
        enableCollisions: true,
    });
    const sg = await createDemoWithNodes(nodes, edges, { plugins: [physics] });

    return sg;
}
