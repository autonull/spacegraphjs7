import { describe, expect, it } from 'vitest';
import { Kernel } from './kernel';
import { filterByTime, filterByKind, filterByEdgeKind } from './time-filter';

describe('time-filter', () => {
  const kernel = new Kernel({
    nodes: [
      { id: 'a', kind: 'tool', label: 'tool:a', data: { time: 100 } },
      { id: 'b', kind: 'tool', label: 'tool:b', data: { time: 200 } },
      { id: 'c', kind: 'file', label: 'file:c', data: { time: 150 } },
      { id: 'd', kind: 'error', label: 'error:d', data: { time: 300 } },
      { id: 'e', kind: 'tool', label: 'tool:e', data: { time: 400 } },
      { id: 'f', kind: 'tool', label: 'tool:f', data: {} }, // no time field
    ],
    edges: [
      { id: 'e1', kind: 'sequence', source: 'a', target: 'b' },
      { id: 'e2', kind: 'sequence', source: 'b', target: 'c' },
      { id: 'e3', kind: 'produces', source: 'b', target: 'c' },
      { id: 'e4', kind: 'evidence', source: 'd', target: 'b' },
      { id: 'e5', kind: 'sequence', source: 'c', target: 'e' },
    ],
    hyperedges: [],
  });

  describe('filterByTime', () => {
    it('returns original kernel when no bounds specified', () => {
      const result = filterByTime(kernel, {});
      expect(result.nodes).toEqual(kernel.nodes);
      expect(result.edges).toEqual(kernel.edges);
    });

    it('filters by from time (inclusive)', () => {
      const result = filterByTime(kernel, { from: 200 });
      const nodeIds = result.nodes.map(n => n.id).sort();
      // Nodes with time >= 200: b(200), c(150-no), d(300), e(400), f(no time-kept)
      // Wait, c has time 150 which is < 200, so not kept
      expect(nodeIds).toContain('b');
      expect(nodeIds).toContain('d');
      expect(nodeIds).toContain('e');
      expect(nodeIds).toContain('f'); // no time field kept
      expect(nodeIds).not.toContain('a'); // time 100 < 200
      expect(nodeIds).not.toContain('c'); // time 150 < 200
    });

    it('filters by to time (inclusive)', () => {
      const result = filterByTime(kernel, { to: 200 });
      const nodeIds = result.nodes.map(n => n.id).sort();
      // Nodes with time <= 200: a(100), b(200), c(150), f(no time)
      expect(nodeIds).toContain('a');
      expect(nodeIds).toContain('b');
      expect(nodeIds).toContain('c');
      expect(nodeIds).toContain('f');
      expect(nodeIds).not.toContain('d'); // time 300 > 200
      expect(nodeIds).not.toContain('e'); // time 400 > 200
    });

    it('filters by both from and to', () => {
      const result = filterByTime(kernel, { from: 150, to: 300 });
      const nodeIds = result.nodes.map(n => n.id).sort();
      // Nodes with 150 <= time <= 300: b(200), c(150), d(300), f(no time)
      expect(nodeIds).toContain('b');
      expect(nodeIds).toContain('c');
      expect(nodeIds).toContain('d');
      expect(nodeIds).toContain('f');
      expect(nodeIds).not.toContain('a'); // time 100 < 150
      expect(nodeIds).not.toContain('e'); // time 400 > 300
    });

    it('filters edges to only keep those with both endpoints', () => {
      const result = filterByTime(kernel, { from: 200 });
      // Nodes kept: b, d, e, f
      // Edges where both source and target are kept:
      // e4: d->b (both kept)
      // e5: c->e (c not kept)
      const edgeIds = result.edges.map(e => e.id).sort();
      expect(edgeIds).toContain('e4');
      expect(edgeIds).not.toContain('e1');
      expect(edgeIds).not.toContain('e2');
      expect(edgeIds).not.toContain('e3');
      expect(edgeIds).not.toContain('e5');
    });

    it('uses custom time field', () => {
      const customKernel = new Kernel({
        nodes: [
          { id: 'a', kind: 'tool', label: 'a', data: { timestamp: 100 } },
          { id: 'b', kind: 'tool', label: 'b', data: { timestamp: 200 } },
        ],
        edges: [],
        hyperedges: [],
      });

      const result = filterByTime(customKernel, { from: 150, timeField: 'timestamp' });
      expect(result.nodes.map(n => n.id)).toEqual(['b']);
    });

    it('keeps nodes without time field by default', () => {
      const result = filterByTime(kernel, { from: 1000 }); // all timed nodes filtered out
      const nodeIds = result.nodes.map(n => n.id);
      // Only f (no time field) should remain
      expect(nodeIds).toEqual(['f']);
    });
  });

  describe('filterByKind', () => {
    it('filters nodes by kind', () => {
      const result = filterByKind(kernel, ['tool']);
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['a', 'b', 'e', 'f']);
    });

    it('filters edges to only keep connected nodes', () => {
      const result = filterByKind(kernel, ['tool']);
      // Kept nodes: a, b, e, f
      // Edges between kept nodes: e1 (a->b), e5 (c->e) - c not kept so e5 dropped
      const edgeIds = result.edges.map(e => e.id).sort();
      expect(edgeIds).toContain('e1');
      expect(edgeIds).not.toContain('e2');
      expect(edgeIds).not.toContain('e3');
      expect(edgeIds).not.toContain('e4');
      expect(edgeIds).not.toContain('e5');
    });

    it('returns original when no kinds specified', () => {
      const result = filterByKind(kernel, []);
      expect(result.nodes).toEqual(kernel.nodes);
    });
  });

  describe('filterByEdgeKind', () => {
    it('filters edges by kind', () => {
      const result = filterByEdgeKind(kernel, ['sequence']);
      const edgeIds = result.edges.map(e => e.id).sort();
      expect(edgeIds).toEqual(['e1', 'e2', 'e5']);
    });

    it('keeps nodes connected by kept edges', () => {
      const result = filterByEdgeKind(kernel, ['produces']);
      // Kept edge: e3 (b->c)
      // Kept nodes: b, c
      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['b', 'c']);
    });

    it('returns original when no kinds specified', () => {
      const result = filterByEdgeKind(kernel, []);
      expect(result.edges).toEqual(kernel.edges);
    });
  });
});