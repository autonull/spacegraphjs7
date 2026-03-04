import { SpaceGraph, VisionOverlayPlugin } from 'spacegraphjs';

const nodes = [
    {
        id: 'a',
        type: 'ShapeNode',
        label: 'Start Here',
        position: [-100, 0, 0],
        data: { color: 0x3b82f6 },
    },
    {
        id: 'b',
        type: 'ShapeNode',
        label: 'Build Your App',
        position: [100, 0, 0],
        data: { color: 0x10b981 },
    },
];

const edges = [{ id: 'e1', source: 'a', target: 'b', type: 'CurvedEdge' }];

const sg = SpaceGraph.create('#app', { nodes, edges });

// Expose the vision overlay UI
sg.pluginManager.add(new VisionOverlayPlugin());

sg.render();
