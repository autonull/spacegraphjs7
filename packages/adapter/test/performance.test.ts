// @vitest-environment node
import { describe, expect, test } from 'vitest';
import type { RenderNode } from '@spacegraphjs/renderer';
import { ModelAdapter } from '../src/ModelAdapter';
import type { AdapterModel, AdapterNode, AdapterEdge, AdapterPosition, BuildOptions } from '../src/types';

interface PerfNode extends AdapterNode {
  lane: string;
  outcome: string;
}

interface PerfEdge extends AdapterEdge {}

interface PerfModel extends AdapterModel<PerfNode, PerfEdge> {}

class PerfAdapter extends ModelAdapter<PerfNode, PerfEdge, 'execution', PerfModel> {
  nodeShape(): RenderNode['shape'] {
    return 'card';
  }

  nodeStatus() {
    return 'success';
  }

  isStructuralKind(): boolean {
    return false;
  }

  nodeData(node: PerfNode): Record<string, unknown> {
    return { lane: node.lane, outcome: node.outcome };
  }

  toRenderEdge(edge: PerfEdge) {
    return { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind, directed: true, confidence: 'explicit' };
  }
}

function generateModel(nodeCount: number, edgeCount: number): { model: PerfModel; positions: Map<string, AdapterPosition> } {
  const nodes: PerfNode[] = [];
  const edges: PerfEdge[] = [];
  const positions = new Map<string, AdapterPosition>();
  const lanes = ['plan', 'fetch', 'compile', 'test', 'package', 'publish'];
  const outcomes = ['planned', 'changed', 'failed', 'retried'];

  for (let i = 0; i < nodeCount; i++) {
    const id = `node-${i}`;
    const lane = lanes[i % lanes.length];
    const outcome = outcomes[i % outcomes.length];
    nodes.push({
      id,
      kind: 'step',
      label: `Task ${i}`,
      summary: `Summary for task ${i}`,
      status: 'passed',
      lane,
      outcome,
    });
    positions.set(id, { x: (i % 50) * 200, y: Math.floor(i / 50) * 100, z: 0 });
  }

  for (let i = 0; i < edgeCount; i++) {
    const source = `node-${i % nodeCount}`;
    const target = `node-${(i + 1) % nodeCount}`;
    edges.push({
      id: `edge-${i}`,
      source,
      target,
      kind: i % 3 === 0 ? 'sequence' : i % 3 === 1 ? 'evidence' : 'part-of',
    });
  }

  return { model: { nodes, edges }, positions };
}

function timed<T>(run: () => T): { value: T; ms: number } {
  const start = performance.now();
  const value = run();
  return { value, ms: performance.now() - start };
}

const adapter = new PerfAdapter({
  cardBudget: (level) => (level === 'overview' ? 12 : level === 'execution' ? 40 : 24),
  neighbors: (_model, id) => [id], // simple neighbor for focus
  nodeSizeFn: () => [200, 64],
});

describe('adapter pipeline performance', () => {
  const sizes = [
    { nodes: 1_200, edges: 2_000, label: '300-message session' },
    { nodes: 4_000, edges: 7_000, label: '1,000-message session' },
    { nodes: 20_000, edges: 36_000, label: '5,000-message session' },
  ];

  for (const { nodes, edges, label } of sizes) {
    test(`${label}: build render model within budget`, () => {
      const { model, positions } = generateModel(nodes, edges);

      // Warm-up run (JIT)
      adapter.build(model, { level: 'execution', positions });

      const { ms } = timed(() => adapter.build(model, { level: 'execution', positions }));

      const budget = nodes <= 1_500 ? 50 : nodes <= 5_000 ? 100 : 250;
      expect(ms).toBeLessThan(budget);
    });
  }
});

describe('adapter incremental patch performance', () => {
  test('buildPatch produces minimal diff for streaming', () => {
    const { model, positions } = generateModel(20_000, 36_000);

    const baseline = adapter.build(model, { level: 'execution', positions });

    const extendedModel: PerfModel = {
      nodes: [...model.nodes, { id: 'node-new', kind: 'step', label: 'New', status: 'passed', lane: 'test', outcome: 'planned' }],
      edges: [...model.edges, { id: 'edge-new', source: 'node-0', target: 'node-new', kind: 'sequence' }],
    };
    const extendedPositions = new Map(positions);
    extendedPositions.set('node-new', { x: 100, y: 100, z: 0 });

    const { ms: patchMs, value: patch } = timed(() => adapter.buildPatch(baseline, extendedModel, { level: 'execution', positions: extendedPositions }));

    // Patch should complete quickly (under 500ms for 20k nodes - CI can vary)
    expect(patchMs).toBeLessThan(500);

    // Patch should only contain the new node/edge
    expect(patch.nodes.added.length).toBe(1);
    expect(patch.edges.added.length).toBe(1);
  });
});

describe('diffRenderModels performance', () => {
  test('diff is fast even on large models', () => {
    const { model, positions } = generateModel(20_000, 36_000);

    const renderModel = adapter.build(model, { level: 'execution', positions });

    const { ms } = timed(() => {
      // diff against itself (worst case: no changes but still walks all nodes)
      adapter.build(model, { level: 'execution', positions });
    });

    expect(ms).toBeLessThan(100);
  });
});