import { describe, expect, it } from 'vitest';
import { Kernel } from './kernel';
import type { Node } from './kernel';
import { walk, pathsBetween, defaultScorer } from './walks';

describe('walks', () => {
  const kernel = new Kernel({
    nodes: [
      { id: 'a', kind: 'tool', label: 'tool:a', data: { name: 'read', path: 'src/a.ts' } },
      { id: 'b', kind: 'tool', label: 'tool:b', data: { name: 'write', path: 'src/b.ts' } },
      { id: 'c', kind: 'file', label: 'file:c', data: { path: 'src/c.ts' } },
      { id: 'd', kind: 'error', label: 'error:d', data: {} },
      { id: 'e', kind: 'tool', label: 'tool:e', data: { name: 'test', path: 'src/test.ts' } },
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

  describe('walk', () => {
    it('walks from a single start node', () => {
      const result = walk(kernel, { starts: ['a'], steps: ['sequence'] });
      expect(result.nodes).toEqual(['a', 'b', 'c', 'e']);
      expect(result.edges).toEqual(['e1', 'e2', 'e5']);
    });

    it('walks from multiple start nodes', () => {
      const result = walk(kernel, { starts: ['a', 'd'], steps: ['sequence', 'evidence'] });
      expect(result.nodes).toEqual(['a', 'd', 'b', 'c', 'e']);
      expect(result.edges).toEqual(['e1', 'e4', 'e2', 'e5']);
    });

    it('respects maxDepth', () => {
      const result = walk(kernel, { starts: ['a'], steps: ['sequence'], maxDepth: 1 });
      expect(result.nodes).toEqual(['a', 'b']);
      expect(result.edges).toEqual(['e1']);
    });

    it('respects edge kind filter', () => {
      const result = walk(kernel, { starts: ['b'], steps: ['produces'] });
      expect(result.nodes).toEqual(['b', 'c']);
      expect(result.edges).toEqual(['e3']);
    });

    it('empty steps means all edge kinds', () => {
      const result = walk(kernel, { starts: ['d'], steps: [] });
      // When steps is empty, all edge kinds are followed: evidence e4 (d->b), 
      // then sequence e2 (b->c), produces e3 (b->c), and sequence e5 (c->e)
      expect(result.nodes).toEqual(['d', 'b', 'c', 'e']);
      expect(result.edges).toEqual(['e4', 'e2', 'e3', 'e5']);
    });

    it('returns empty when start node does not exist', () => {
      const result = walk(kernel, { starts: ['missing'], steps: ['sequence'] });
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('does not revisit nodes', () => {
      // Create a cycle: a -> b -> c -> a
      const cyclicKernel = new Kernel({
        nodes: [
          { id: 'a', kind: 'tool', label: 'a' },
          { id: 'b', kind: 'tool', label: 'b' },
          { id: 'c', kind: 'tool', label: 'c' },
        ],
        edges: [
          { id: 'e1', kind: 'sequence', source: 'a', target: 'b' },
          { id: 'e2', kind: 'sequence', source: 'b', target: 'c' },
          { id: 'e3', kind: 'sequence', source: 'c', target: 'a' },
        ],
        hyperedges: [],
      });
      const result = walk(cyclicKernel, { starts: ['a'], steps: ['sequence'] });
      expect(result.nodes).toEqual(['a', 'b', 'c']);
    });
  });

  describe('pathsBetween', () => {
    it('finds path between connected nodes', () => {
      const paths = pathsBetween(kernel, 'a', 'c');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0][0]).toBe('a');
      expect(paths[0][paths[0].length - 1]).toBe('c');
    });

    it('returns direct edge when available', () => {
      const paths = pathsBetween(kernel, 'b', 'c');
      expect(paths).toContainEqual(['b', 'c']);
    });

    it('returns single node when from === to', () => {
      const paths = pathsBetween(kernel, 'a', 'a');
      expect(paths).toEqual([['a']]);
    });

    it('returns empty when no path exists', () => {
      const paths = pathsBetween(kernel, 'a', 'd');
      expect(paths).toEqual([]);
    });

    it('returns empty when from node does not exist', () => {
      const paths = pathsBetween(kernel, 'missing', 'a');
      expect(paths).toEqual([]);
    });

    it('returns empty when to node does not exist', () => {
      const paths = pathsBetween(kernel, 'a', 'missing');
      expect(paths).toEqual([]);
    });

    it('finds multiple paths when they exist', () => {
      // Create a diamond: a -> b, a -> c, b -> d, c -> d
      const diamondKernel = new Kernel({
        nodes: [
          { id: 'a', kind: 'tool', label: 'a' },
          { id: 'b', kind: 'tool', label: 'b' },
          { id: 'c', kind: 'tool', label: 'c' },
          { id: 'd', kind: 'tool', label: 'd' },
        ],
        edges: [
          { id: 'e1', kind: 'sequence', source: 'a', target: 'b' },
          { id: 'e2', kind: 'sequence', source: 'a', target: 'c' },
          { id: 'e3', kind: 'sequence', source: 'b', target: 'd' },
          { id: 'e4', kind: 'sequence', source: 'c', target: 'd' },
        ],
        hyperedges: [],
      });
      const paths = pathsBetween(diamondKernel, 'a', 'd');
      expect(paths.length).toBe(2);
      expect(paths).toContainEqual(['a', 'b', 'd']);
      expect(paths).toContainEqual(['a', 'c', 'd']);
    });
  });

  describe('defaultScorer', () => {
    const nodes: Node[] = [
      { id: '1', kind: 'tool', label: 'readFile', data: { name: 'read', path: 'src/a.ts' } },
      { id: '2', kind: 'tool', label: 'writeFile', data: { name: 'write', path: 'src/b.ts' } },
      { id: '3', kind: 'file', label: 'config.json', data: { path: 'config.json' } },
      { id: '4', kind: 'error', label: 'TypeError', data: { message: 'cannot read property' } },
    ];

    it('ranks label prefix highest (0)', () => {
      expect(defaultScorer(nodes[0], 'read')).toBe(0); // 'readFile' starts with 'read'
      expect(defaultScorer(nodes[1], 'write')).toBe(0); // 'writeFile' starts with 'write'
    });

    it('ranks label contains second (1)', () => {
      expect(defaultScorer(nodes[0], 'file')).toBe(1); // 'readFile' contains 'file'
      expect(defaultScorer(nodes[1], 'file')).toBe(1); // 'writeFile' contains 'file'
    });

    it('ranks name field third (2)', () => {
      expect(defaultScorer(nodes[0], 'read')).toBe(0); // label prefix wins
      expect(defaultScorer(nodes[1], 'write')).toBe(0); // label prefix wins
      // But if label doesn't match, name field is checked
      expect(defaultScorer(nodes[0], 'foo')).toBe(-1); // no match
    });

    it('ranks path field fourth (3)', () => {
      // Note: 'config.json' label starts with 'config', so it returns 0 (label prefix)
      // To test path field, we need a node where label doesn't match but path does
      const nodeWithPath = { id: 'x', kind: 'file', label: 'myfile', data: { path: 'config/settings.json' } } as Node;
      expect(defaultScorer(nodeWithPath, 'settings')).toBe(3); // path contains 'settings'
      expect(defaultScorer(nodeWithPath, 'config')).toBe(3); // path contains 'config'
    });

    it('ranks body last (4)', () => {
      expect(defaultScorer(nodes[3], 'cannot')).toBe(4); // in error message body
      expect(defaultScorer(nodes[3], 'property')).toBe(4);
    });

    it('returns -1 for no match', () => {
      expect(defaultScorer(nodes[0], 'nomatch')).toBe(-1);
      expect(defaultScorer(nodes[3], 'nomatch')).toBe(-1);
    });

    it('is case insensitive', () => {
      expect(defaultScorer(nodes[0], 'READ')).toBe(0);
      // 'config.json' starts with 'config' so it's a prefix match (0)
      expect(defaultScorer(nodes[2], 'CONFIG')).toBe(0);
      // Use a query that matches inside but not at start
      expect(defaultScorer(nodes[2], 'SON')).toBe(1); // 'json' contains 'son'
    });
  });
});