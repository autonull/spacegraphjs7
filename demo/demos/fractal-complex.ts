import { createDemoWithNodes, edge, addOverlayPanel, SpaceGraph } from '../framework';

export default async function fractalComplexDemo(): Promise<SpaceGraph> {
  const LEVELS = [
    'Intergalactic',
    'Galactic Cluster',
    'Solar System',
    'Planetary',
    'City-State',
    'Structural',
    'Microscopic',
    'Atomic',
    'Subatomic'
  ];

  const nodes: any[] = [];
  const edges: any[] = [];

  // --- Level 0: Intergalactic ---
  const galaxyCenters = [
    { id: 'galaxy-alpha', pos: [0, 0, 0], color: 0x4488ff },
    { id: 'galaxy-beta', pos: [3000, 1000, -500], color: 0xff4488 },
    { id: 'galaxy-gamma', pos: [-2000, -1500, 800], color: 0x44ff88 },
  ];

  galaxyCenters.forEach(g => {
    nodes.push({
      id: g.id,
      type: 'GroupNode',
      label: g.id.toUpperCase(),
      position: g.pos,
      data: {
        width: 1200,
        height: 800,
        depth: 800,
        color: g.color,
        lodThreshold: 2000
      }
    });

    for (let i = 0; i < 20; i++) {
        const starId = `${g.id}-star-${i}`;
        nodes.push({
            id: starId,
            type: 'ShapeNode',
            position: [
                g.pos[0] + (Math.random() - 0.5) * 3000,
                g.pos[1] + (Math.random() - 0.5) * 3000,
                g.pos[2] + (Math.random() - 0.5) * 3000,
            ],
            data: {
                color: 0xffffff,
                size: Math.random() * 5 + 2,
                opacity: 0.5 + Math.random() * 0.5
            }
        });
    }
  });

  edges.push(edge('galaxy-alpha', 'galaxy-beta', 'FlowEdge'));
  edges.push(edge('galaxy-alpha', 'galaxy-gamma', 'FlowEdge'));

  // --- Level 1: Galactic Cluster ---
  const clusters = [
    { id: 'cluster-1', pos: [-300, 100, 0], color: 0xaa44ff },
    { id: 'cluster-2', pos: [300, -100, 100], color: 0x44ffff },
  ];

  clusters.forEach(c => {
    nodes.push({
      id: c.id,
      type: 'GroupNode',
      label: c.id.toUpperCase(),
      position: c.pos,
      data: {
        parent: 'galaxy-alpha',
        width: 400,
        height: 300,
        depth: 300,
        color: c.color,
        lodThreshold: 800
      }
    });
    edges.push(edge('galaxy-alpha', c.id, 'DottedEdge'));
  });

  // --- Level 2: Solar System ---
  const solPos = [-350, 150, 0];
  nodes.push({
    id: 'sol-system',
    type: 'GroupNode',
    label: 'SOL SYSTEM',
    position: solPos,
    data: {
        parent: 'cluster-1',
        width: 150,
        height: 150,
        depth: 150,
        color: 0xffaa44,
        lodThreshold: 300
    }
  });
  edges.push(edge('cluster-1', 'sol-system'));

  nodes.push({
    id: 'the-sun',
    type: 'GlobeNode',
    label: 'THE SUN',
    position: solPos,
    data: {
        parent: 'sol-system',
        radius: 20,
        color: 0xffcc33,
        segments: 32
    }
  });

  // --- Level 3: Planetary (Earth) ---
  const earthPos = [solPos[0] + 50, solPos[1], solPos[2] + 20];
  nodes.push({
    id: 'earth',
    type: 'GlobeNode',
    label: 'EARTH',
    position: earthPos,
    data: {
        parent: 'sol-system',
        radius: 8,
        textureUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Land_ocean_ice_2048.jpg/1024px-Land_ocean_ice_2048.jpg',
        segments: 32
    }
  });

  // --- Level 4: City-State ---
  nodes.push({
    id: 'data-center',
    type: 'DataNode',
    label: 'PLANETARY ARCHIVE',
    position: [earthPos[0] + 5, earthPos[1] + 5, earthPos[2] + 5],
    data: {
        parent: 'earth',
        width: 15,
        theme: 'dark',
        data: {
            status: 'Operational',
            capacity: '98.4 ZB',
            uptime: '99.999%',
            nodes: 12408
        }
    }
  });

  const sg = await createDemoWithNodes(nodes, edges);

  // Register FractalZoomPlugin with custom levels for this demo
  const fractalPlugin = sg.pluginManager.getPlugin('FractalZoomPlugin');
  if (fractalPlugin) {
    (fractalPlugin as any).config.levels = [
        { level: 0, minDistance: 4000, maxDistance: 20000, detailThreshold: 0.1, label: LEVELS[0] },
        { level: 1, minDistance: 2000, maxDistance: 4000, detailThreshold: 0.2, label: LEVELS[1] },
        { level: 2, minDistance: 800, maxDistance: 2000, detailThreshold: 0.3, label: LEVELS[2] },
        { level: 3, minDistance: 300, maxDistance: 800, detailThreshold: 0.4, label: LEVELS[3] },
        { level: 4, minDistance: 100, maxDistance: 300, detailThreshold: 0.5, label: LEVELS[4] },
        { level: 5, minDistance: 40, maxDistance: 100, detailThreshold: 0.6, label: LEVELS[5] },
        { level: 6, minDistance: 15, maxDistance: 40, detailThreshold: 0.7, label: LEVELS[6] },
        { level: 7, minDistance: 5, maxDistance: 15, detailThreshold: 0.8, label: LEVELS[7] },
        { level: 8, minDistance: 0, maxDistance: 5, detailThreshold: 0.9, label: LEVELS[8] },
    ];
    (fractalPlugin as any).updateLevel(0);
  }

  sg.cameraControls.flyTo(new (sg.graph.nodes.get('galaxy-alpha') as any).position, 6000, 0);

  addOverlayPanel(
    sg,
    'top-right',
    { pointerEvents: 'none', background: 'rgba(10, 10, 25, 0.8)', border: '1px solid #4488ff' },
    `<div style="font-size: 10px; opacity: 0.6; margin-bottom: 4px; letter-spacing: 0.1em; text-transform: uppercase;">Cosmic Navigation</div>
  <div style="font-size: 20px; font-weight: 800; color: #4488ff;" id="level-text">${LEVELS[0]}</div>
  <div style="font-size: 11px; opacity: 0.5; margin-top: 4px;" id="level-hint">Deep fractal zoom active</div>`,
  );

  sg.events.on('fractal:level-change', ({ to, label }: any) => {
    const levelText = document.getElementById('level-text');
    if (levelText) {
      levelText.textContent = LEVELS[to] || label;
      levelText.style.color = `hsl(${(to / LEVELS.length) * 280 + 200}, 80%, 60%)`;
    }
  });

  addOverlayPanel(
    sg,
    'bottom-left',
    { background: 'rgba(10, 10, 25, 0.8)', border: '1px solid #4488ff' },
    `<div style="font-weight: 800; margin-bottom: 8px; color: #4488ff;">Fractal Cosmic ZUI</div>
  <div style="opacity: 0.8; line-height: 1.6; font-size: 12px;">
    • Scroll to dive deep into the archive<br>
    • Double-click nodes to semantic zoom<br>
    • Watch as galaxies reveal planets<br>
    • Pure Spec-driven architecture
  </div>`,
  );

  sg.events.on('prerender', () => {
    const alpha = sg.graph.nodes.get('galaxy-alpha');
    if (alpha) alpha.object.rotation.y += 0.0005;

    const sun = sg.graph.nodes.get('the-sun');
    if (sun) sun.object.rotation.y += 0.002;

    const earth = sg.graph.nodes.get('earth');
    if (earth) {
        earth.object.rotation.y += 0.005;
        const time = Date.now() * 0.0005;
        earth.position.x = solPos[0] + Math.cos(time) * 60;
        earth.position.z = solPos[2] + Math.sin(time) * 60;
        earth.updatePosition(earth.position.x, earth.position.y, earth.position.z);
    }
  });

  return sg;
}
