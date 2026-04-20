import { createDemoWithNodes, shapeNode, edge } from '../framework';

export default async function fractalDemo() {
  const LEVELS = ['Overview', 'Cluster', 'Detail', 'Micro', 'Nano'];
  let currentLevel = 0;

  const sg = await createDemoWithNodes(
        [
            shapeNode('node1', [-200, 0, 0], { color: 0x4488ff, size: 60 }),
            shapeNode('node2', [200, 0, 0], { color: 0xff4488, size: 60 }),
            shapeNode('node3', [0, 150, 0], { color: 0x44ff88, size: 60 }),
            shapeNode('node4', [0, -150, 0], { color: 0xffaa44, size: 60 }),
            shapeNode('node5', [-100, 75, 0], { color: 0xaa44ff, size: 60 }),
            shapeNode('node6', [100, 75, 0], { color: 0x44ffff, size: 60 }),
        ],
        [
            edge('node1', 'node2'),
            edge('node1', 'node3'),
            edge('node2', 'node3'),
            edge('node3', 'node4'),
            edge('node4', 'node5'),
            edge('node5', 'node6'),
            edge('node6', 'node1'),
        ],
    );

    // Create zoom level indicator
    const zoomIndicator = document.createElement('div');
    zoomIndicator.className = 'fractal-zoom-indicator';
    Object.assign(zoomIndicator.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#ffffff',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: '1000',
        pointerEvents: 'none',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    });
    zoomIndicator.innerHTML = `
    <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">ZOOM LEVEL</div>
    <div style="font-size: 18px; font-weight: bold;" id="level-text">${LEVELS[0]}</div>
    <div style="font-size: 12px; opacity: 0.5; margin-top: 4px;" id="level-hint">Pinch zoom or scroll</div>
  `;
    document.body.appendChild(zoomIndicator);

    // Update level display
    sg.events.on('fractal:level-change', ({ to, label }: any) => {
        const levelText = document.getElementById('level-text');
        if (levelText) {
            levelText.textContent = label;
            levelText.style.color = `hsl(${(to / LEVELS.length) * 360}, 80%, 60%)`;
        }
    });

    // Add keyboard shortcuts for zoom
    document.addEventListener('keydown', (e) => {
        const fractalPlugin = sg.pluginManager.getPlugin('fractal-zoom');
        if (!fractalPlugin) return;

        if (e.key === '+' || e.key === '=') {
            (fractalPlugin as any).zoomIn();
        } else if (e.key === '-' || e.key === '_') {
            (fractalPlugin as any).zoomOut();
        }
    });

    // Add instructions
    const instructions = document.createElement('div');
    instructions.className = 'fractal-instructions';
    Object.assign(instructions.style, {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: '#ffffff',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '13px',
        fontFamily: 'sans-serif',
        zIndex: '1000',
        maxWidth: '300px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    });
    instructions.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">Fractal UI Demo</div>
    <div style="opacity: 0.8; line-height: 1.6;">
      • Pinch zoom to change levels<br>
      • Scroll wheel to zoom<br>
      • <code>+</code> / <code>-</code> keys<br>
      • Watch the indicator change<br>
      • Each level reveals more detail
    </div>
  `;
    document.body.appendChild(instructions);

    return sg;
}
