import { describe, expect, test } from 'vitest';
import type { RenderNode } from '@spacegraphjs/renderer';
import { adapterConformance } from '../src/conformance';
import { ModelAdapter } from '../src/ModelAdapter';
import type { AdapterBounds } from '../src/types';

interface TestNode {
  id: string;
  kind: string;
  label: string;
  summary?: string;
  status: string;
  derived?: boolean;
  clusterOf?: string[];
}

interface TestEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
}

interface TestModel {
  nodes: TestNode[];
  edges: TestEdge[];
}

class TestAdapter extends ModelAdapter<TestNode, TestEdge, 'fine', TestModel> {
  nodeShape(node: TestNode): RenderNode['shape'] {
    return node.kind === 'card' ? 'card' : 'panel';
  }

  nodeStatus(node: TestNode) {
    return node.status === 'bad' ? 'error' : 'success';
  }

  isStructuralKind(kind: string): boolean {
    return kind === 'group';
  }

  nodeData(node: TestNode, level: string, dimmed: boolean): Record<string, unknown> {
    return { level, dimmed, kind: node.kind };
  }

  toRenderEdge(edge: TestEdge) {
    return { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind, visible: true };
  }
}

const MODEL: TestModel = {
  nodes: [
    { id: 'group-1', kind: 'group', label: 'Group', status: 'ok' },
    { id: 'card-1', kind: 'card', label: 'Read', summary: 'a file', status: 'ok' },
    { id: 'card-2', kind: 'card', label: 'Write', status: 'bad' },
    { id: 'chip-1', kind: 'card', label: 'Cluster', status: 'ok', derived: true, clusterOf: ['card-1', 'card-2'] },
  ],
  edges: [
    { id: 'e1', source: 'group-1', target: 'card-1', kind: 'part-of' },
    { id: 'e2', source: 'card-1', target: 'card-2', kind: 'sequence' },
  ],
};

const POSITIONS = new Map([
  ['group-1', { x: 0, y: 0, z: 0 }],
  ['card-1', { x: 200, y: 0, z: 0 }],
  ['card-2', { x: 400, y: 0, z: 0 }],
  ['chip-1', { x: 600, y: 0, z: 0 }],
]);

const adapter = new TestAdapter({
  cardBudget: 8,
  isClusterExpanded: () => false,
  neighbors: (_model, id) => (id === 'card-1' ? ['card-2'] : []),
});

const FIXTURE = {
  model: MODEL,
  level: 'fine' as const,
  positions: POSITIONS,
  visible: MODEL.nodes.map((node) => node.id),
  card: 'card-1',
  structural: 'group-1',
  chip: 'chip-1',
  focus: 'card-1',
  lit: ['card-1', 'card-2'],
  dimmed: ['group-1', 'chip-1'],
  options: {
    laneLabels: [{ id: 'explore', label: 'Explore', y: 0 }],
    axisLabels: [{ id: 'col:0', label: 'Turn', x: 0, y: -30, role: 'column' as const }],
  },
};

describe('the model adapter pipeline', () => {
  for (const conformanceCase of adapterConformance(adapter, FIXTURE)) {
    test(conformanceCase.name, conformanceCase.check);
  }

  test('draws a collapsed cluster as a counted chip', () => {
    const model = adapter.build(MODEL, { level: 'fine', positions: POSITIONS });
    const chip = model.nodes.find((node) => node.id === 'chip-1');

    expect(chip?.shape).toBe('card');
    expect(chip?.size).toEqual([132, 44, 0]);
    expect(chip?.html).toContain('>2<');
  });

  test('escapes the text that reaches the markup', () => {
    const hostile: TestModel = {
      nodes: [{ id: 'x', kind: 'card', label: '<script>alert(1)</script>', status: 'ok' }],
      edges: [],
    };

    const model = adapter.build(hostile, { level: 'fine', positions: new Map() });

    expect(model.nodes[0]?.html).toContain('&lt;script&gt;');
    expect(model.nodes[0]?.html).not.toContain('<script>');
  });

  test('fades a card outside the focus neighbourhood without touching its content', () => {
    const model = adapter.build(MODEL, { level: 'fine', positions: POSITIONS, focus: 'card-1' });
    const dimmed = model.nodes.find((node) => node.id === 'group-1');

    expect(dimmed?.data?.dimmed).toBe(true);
    expect(dimmed?.html).toContain('opacity:.3');
  });

  test('keeps the card budget per level', () => {
    const model = adapter.build(MODEL, { level: 'fine', positions: POSITIONS, cardBudget: 1 });
    const cards = model.nodes.filter((node) => node.html !== undefined && node.kind === 'card');

    expect(cards.length).toBe(1);
  });

  test('emits the bands before the content', () => {
    class BandAdapter extends TestAdapter {
      buildBands(): RenderNode[] {
        return [{ id: 'band:group-1', kind: 'band', label: 'Group', shape: 'panel', position: [0, 0, 0] }];
      }
    }

    const model = new BandAdapter({ cardBudget: 8 }).build(MODEL, { level: 'fine', positions: POSITIONS, bands: true });

    expect(model.nodes[0]?.id).toBe('band:group-1');
  });

  test('the band template receives the bounds of the members', () => {
    const seen: AdapterBounds[] = [];

    class BandAdapter extends TestAdapter {
      buildBands(_model: TestModel, _level: string, _positions: Map<string, { x: number; y: number; z: number }>, renderBand: (node: TestNode, count: number, bounds: AdapterBounds) => string): RenderNode[] {
        const bounds: AdapterBounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 0 } };

        seen.push(bounds);

        return [{ id: 'band:group-1', kind: 'band', label: 'Group', shape: 'panel', position: [0, 0, 0], html: renderBand(MODEL.nodes[0]!, 2, bounds) }];
      }
    }

    const model = new BandAdapter({ cardBudget: 8 }).build(MODEL, { level: 'fine', positions: POSITIONS, bands: true });

    expect(seen.length).toBe(1);
    expect(model.nodes[0]?.html).toContain('Group');
  });
});
