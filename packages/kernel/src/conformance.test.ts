import { describe, expect, test } from 'bun:test';
import {
  defaultConformanceRules,
  duplicateIDsRule,
  hyperedgeNodesRule,
  runConformance,
} from './conformance';
import { buildExampleKernel } from './example/fixture';
import { Kernel } from './kernel';

describe('conformance', () => {
  test('the example fixture satisfies the default rules', () => {
    const result = runConformance(buildExampleKernel());

    expect(result).toEqual({ ok: true, issues: [] });
    expect(defaultConformanceRules.length).toBe(3);
  });

  test('reports a dangling edge', () => {
    const kernel = new Kernel({
      nodes: [{ id: 'a', kind: 'node', label: 'A' }],
      edges: [{ id: 'e1', kind: 'edge', source: 'a', target: 'missing' }],
      hyperedges: [],
    });
    const result = runConformance(kernel);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.invariant)).toEqual(['no-dangling-edges']);
    expect(result.issues[0]?.id).toBe('e1');
  });

  test('reports duplicate ids', () => {
    const kernel = new Kernel({
      nodes: [
        { id: 'a', kind: 'node', label: 'A' },
        { id: 'a', kind: 'node', label: 'A again' },
      ],
      edges: [],
      hyperedges: [],
    });

    expect(duplicateIDsRule(kernel).map((issue) => issue.invariant)).toEqual(['unique-node-ids']);
  });

  test('reports a hyperedge that references a missing node', () => {
    const kernel = new Kernel({
      nodes: [{ id: 'a', kind: 'node', label: 'A' }],
      edges: [],
      hyperedges: [{ id: 'h1', kind: 'hyperedge', nodes: ['a', 'missing'] }],
    });

    expect(hyperedgeNodesRule(kernel).map((issue) => issue.id)).toEqual(['h1']);
  });

  test('accepts a custom rule', () => {
    const result = runConformance(new Kernel(), [
      () => [{ invariant: 'always', message: 'custom failure' }],
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues[0]?.invariant).toBe('always');
  });
});
