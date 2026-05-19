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

    // Add button for manual "mess-up"
    const info = document.getElementById('info');
    if (info) {
        const messUpBtn = document.createElement('button');
        messUpBtn.id = 'mess-up-btn';
        messUpBtn.textContent = 'Programmatically Create Issues';
        messUpBtn.style.marginTop = '15px';
        messUpBtn.style.width = '100%';
        messUpBtn.style.padding = '10px';
        messUpBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        messUpBtn.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        messUpBtn.style.borderRadius = '6px';
        messUpBtn.style.color = '#f87171';
        messUpBtn.style.fontWeight = '600';
        messUpBtn.style.cursor = 'pointer';

        messUpBtn.addEventListener('click', () => {
            console.log('Messing up the graph...');
            // 1. Create overlaps
            sg.graph.updateNode('node1', { position: [5, 5, 0] });
            sg.graph.updateNode('node2', { position: [-5, -5, 0] });

            // 2. Create bad contrast
            sg.graph.updateNode('node3', {
                data: {
                    color: 0xeeeeee,
                    labelColor: 0xffffff
                }
            });

            // 3. Move another node to overlap
            sg.graph.updateNode('node4', { position: [195, 5, 0] }); // Near node3

            sg.events.emit('graph:updated' as any, {});
        });

        info.appendChild(messUpBtn);

        // Update vision status in real-time
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        sg.events.on('vision:analysis-complete' as any, (report: any) => {
            if (statusDot && statusText) {
                const score = report.overall.score;
                statusText.textContent = `VISION HEALTH: ${Math.round(score)}%`;

                if (score >= 90) statusDot.style.background = '#4ade80';
                else if (score >= 70) statusDot.style.background = '#facc15';
                else statusDot.style.background = '#f87171';
            }
        });
    }

    console.log('Vision Self-Healing demo initialized.');
}

init();
