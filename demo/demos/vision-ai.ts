import { createDemoWithNodes, SpaceGraph } from '../framework';
import { VisionOverlayPlugin } from '../../src/index';

export default async function visionAiDemo(): Promise<SpaceGraph> {
  const nodes = [
    // Layout issue: Severe Overlap
    {
      id: 'overlap_a',
      type: 'ShapeNode',
      label: 'Overlapping Node A',
      position: [-100, 100, 0],
      data: { shape: 'box', color: 0xeab308 },
    },
    {
      id: 'overlap_b',
      type: 'ShapeNode',
      label: 'Overlapping Node B',
      position: [-90, 110, 0], // Almost exactly the same position
      data: { shape: 'box', color: 0xf97316 },
    },
    {
      id: 'overlap_c',
      type: 'ShapeNode',
      label: 'Overlapping Node C',
      position: [-110, 90, 0],
      data: { shape: 'box', color: 0xef4444 },
    },

    // Legibility issue: Bad Contrast
    {
      id: 'contrast_bad',
      type: 'ShapeNode',
      label: 'Illegible Text',
      position: [200, 0, 0],
      // Dark background with black text
      data: { shape: 'box', color: 0x111111, textColor: 0x000000 },
    },

    // Fine nodes
    {
      id: 'good_a',
      type: 'ShapeNode',
      label: 'Good Node A',
      position: [0, -150, 0],
      data: { shape: 'sphere', color: 0x3b82f6 },
    },
    {
      id: 'good_b',
      type: 'ShapeNode',
      label: 'Good Node B',
      position: [-200, -100, 0],
      data: { shape: 'box', color: 0x10b981 },
    },
  ];

  const edges = [
    { id: 'e1', source: 'good_a', target: 'overlap_a', type: 'CurvedEdge' },
    { id: 'e2', source: 'good_b', target: 'contrast_bad', type: 'CurvedEdge' },
    { id: 'e3', source: 'overlap_b', target: 'good_a', type: 'Edge' },
  ];

  const sg = await createDemoWithNodes(nodes, edges);

  // Ensure nodes are pinned so they don't auto-resolve before AI sees them
  for (const node of sg.graph.nodes.values()) {
    (node.data as any).pinned = true;
  }

  // Real VisionOverlayPlugin running full ONNX models
  const visionOverlay = new VisionOverlayPlugin();
  sg.pluginManager.add(visionOverlay);

  return sg;
}
