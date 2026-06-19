import { createDemoWithNodes, shapeNode, addOverlayPanel, SpaceGraph } from '../framework';

export default async function fractalDebugDemo(): Promise<SpaceGraph> {
  const LEVELS = ['Alpha', 'Beta', 'Gamma'];

  const nodes = [
    {
      id: 'debug-group',
      type: 'GroupNode',
      label: 'DEBUG GROUP',
      position: [0, 0, 0],
      data: { width: 500, height: 500, depth: 500, color: 0xff0000, lodThreshold: 1000 }
    },
    {
      id: 'debug-child',
      type: 'ShapeNode',
      position: [0, 0, 0],
      data: { parent: 'debug-group', color: 0x00ff00, size: 50 }
    }
  ];

  const sg = await createDemoWithNodes(nodes);

  // Debug timing of plugin access
  const fractalPlugin = sg.pluginManager.getPlugin('fractal-zoom');
  const levelText = document.createElement('div');
  levelText.id = 'debug-level-text';
  levelText.style.position = 'fixed';
  levelText.style.top = '100px';
  levelText.style.left = '20px';
  levelText.style.color = 'white';
  levelText.style.fontSize = '24px';
  levelText.textContent = 'Wait...';
  document.body.appendChild(levelText);

  if (fractalPlugin) {
    console.log('Fractal plugin found, current levels:', (fractalPlugin as any).config.levels.map((l:any) => l.label));

    // Override
    (fractalPlugin as any).config.levels = [
        { level: 0, minDistance: 1000, maxDistance: 5000, detailThreshold: 0.1, label: 'Alpha' },
        { level: 1, minDistance: 0, maxDistance: 1000, detailThreshold: 0.5, label: 'Beta' },
    ];

    // Attempt to force update
    (fractalPlugin as any).updateLevel(0);
    levelText.textContent = (fractalPlugin as any).currentZoomLabel;
  }

  sg.events.on('fractal:level-change', ({ label }: any) => {
    levelText.textContent = label;
  });

  return sg;
}
