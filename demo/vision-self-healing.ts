import { SpaceGraph, VisionOverlayPlugin, InteractionPlugin, ForceLayout } from '../src';

async function init() {
    const container = document.getElementById('container')!;

    // Create a graph with some intentional issues (overlaps)
    const spec = {
        nodes: [
            { id: 'center', type: 'ShapeNode', label: 'Main Controller', position: [0, 0, 0], data: { color: 0x3b82f6, size: 60 } },
            { id: 'node1', type: 'ShapeNode', label: 'Satellite A', position: [10, 10, 0], data: { color: 0x10b981 } }, // Overlaps center
            { id: 'node2', type: 'ShapeNode', label: 'Satellite B', position: [-20, -20, 0], data: { color: 0x10b981 } }, // Overlaps center
            { id: 'node3', type: 'ShapeNode', label: 'Satellite C', position: [200, 0, 0], data: { color: 0x10b981 } },
            { id: 'node4', type: 'ShapeNode', label: 'Satellite D', position: [0, 200, 0], data: { color: 0x10b981 } },
            { id: 'bad-contrast', type: 'ShapeNode', label: 'Hard to Read', position: [-200, 0, 0], data: { color: 0xeeeeee, labelColor: 0xffffff } },
        ],
        edges: [
            { id: 'e1', source: 'center', target: 'node1' },
            { id: 'e2', source: 'center', target: 'node2' },
            { id: 'e3', source: 'center', target: 'node3' },
            { id: 'e4', source: 'center', target: 'node4' },
            { id: 'e5', source: 'center', target: 'bad-contrast' },
        ]
    };

    const sg = await SpaceGraph.create(container, spec, {
        cameraControls: {
            enableDamping: true
        }
    });

    // Register plugins
    sg.pluginManager.register('interaction', new InteractionPlugin());
    sg.pluginManager.register('force', new ForceLayout());

    const visionOverlay = new VisionOverlayPlugin();
    sg.pluginManager.register('vision-overlay', visionOverlay);

    // Initialize plugins manually since they were added after SpaceGraph.create()
    console.log('Initializing plugins...');
    await sg.pluginManager.initAll();
    console.log('Plugins initialized.');

    sg.render();
    sg.fitView(150);

    // Expose for debugging
    (window as any).sg = sg;

    console.log('Vision Self-Healing demo initialized.');
}

init();
