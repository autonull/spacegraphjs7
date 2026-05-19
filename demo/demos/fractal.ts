import { createDemoWithNodes, shapeNode, edge, addOverlayPanel, SpaceGraph } from '../framework';

export default async function fractalDemo(): Promise<SpaceGraph> {
  const LEVELS = ['Overview', 'Cluster', 'Detail', 'Micro', 'Nano'];

  const sg = await createDemoWithNodes(
    [
      { id: 'world', type: 'GroupNode', position: [0, 0, 0], data: { label: 'The World', width: 1000, height: 1000, depth: 100, color: 0x1e1e3f } },

      // Level 1: Clusters inside world
      { id: 'cluster-a', type: 'GroupNode', position: [-250, 0, 0], data: { parent: 'world', label: 'Cluster A', width: 400, height: 400, depth: 50, color: 0x3b82f6, lodThreshold: 2000 } },
      { id: 'cluster-b', type: 'GroupNode', position: [250, 0, 0], data: { parent: 'world', label: 'Cluster B', width: 400, height: 400, depth: 50, color: 0x10b981, lodThreshold: 2000 } },

      // Level 2: Detailed nodes inside clusters
      shapeNode('node-a1', [-350, 100, 0], { parent: 'cluster-a', color: 0x60a5fa, size: 40 }),
      shapeNode('node-a2', [-150, -100, 0], { parent: 'cluster-a', color: 0x60a5fa, size: 40 }),

      shapeNode('node-b1', [150, 100, 0], { parent: 'cluster-b', color: 0x34d399, size: 40 }),
      shapeNode('node-b2', [350, -100, 0], { parent: 'cluster-b', color: 0x34d399, size: 40 }),

      // Micro-level: Small details inside nodes
      shapeNode('detail-a1-1', [-370, 120, 10], { parent: 'node-a1', color: 0xffffff, size: 10 }),
      shapeNode('detail-a1-2', [-330, 80, 10], { parent: 'node-a1', color: 0xffffff, size: 10 }),
    ],
    [
      edge('cluster-a', 'cluster-b'),
      edge('node-a1', 'node-a2'),
      edge('node-b1', 'node-b2'),
      edge('node-a1', 'node-b1'),
    ],
  );

  const zoomIndicator = addOverlayPanel(
    sg,
    'top-right',
    { pointerEvents: 'none' },
    `<div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">ZOOM LEVEL</div>
  <div style="font-size: 18px; font-weight: bold;" id="level-text">${LEVELS[0]}</div>
  <div style="font-size: 12px; opacity: 0.5; margin-top: 4px;" id="level-hint">Pinch zoom or scroll</div>`,
  );

  sg.events.on('fractal:level-change', ({ to, label }: any) => {
    const levelText = document.getElementById('level-text');
    if (levelText) {
      levelText.textContent = label;
      levelText.style.color = `hsl(${(to / LEVELS.length) * 360}, 80%, 60%)`;
    }
  });

  document.addEventListener('keydown', (e) => {
    const fractalPlugin = sg.pluginManager.getPlugin('fractal-zoom');
    if (!fractalPlugin) return;

    if (e.key === '+' || e.key === '=') {
      (fractalPlugin as any).zoomIn();
    } else if (e.key === '-' || e.key === '_') {
      (fractalPlugin as any).zoomOut();
    }
  });

  addOverlayPanel(
    sg,
    'bottom-left',
    {},
    `<div style="font-weight: bold; margin-bottom: 8px;">Fractal UI Demo</div>
  <div style="opacity: 0.8; line-height: 1.6;">
    • Pinch zoom to change levels<br>
    • Scroll wheel to zoom<br>
    • <code>+</code> / <code>-</code> keys<br>
    • Watch the indicator change<br>
    • Each level reveals more detail
  </div>`,
  );

  return sg;
}
