import { describe, expect, test } from 'bun:test';
import { CONTRACT_VERSION, supports } from '@spacegraphjs/renderer';
import { CytoscapeRenderer } from './index';

describe('@spacegraphjs/cytoscape-renderer', () => {
  test('declares a 2D-only capability set and never claims 3D or a minimap', () => {
    const capabilities = new CytoscapeRenderer().capabilities;
    expect(capabilities.contractVersion).toBe(CONTRACT_VERSION);
    expect(supports(capabilities, '2d')).toBe(true);
    expect(supports(capabilities, '3d')).toBe(false);
    expect(supports(capabilities, 'domNodes')).toBe(true);
    expect(supports(capabilities, 'edgeLabels')).toBe(true);
    expect(supports(capabilities, 'minimap')).toBe(false);
    expect(capabilities.maxDomNodes).toBe(20);
    expect(capabilities.maxRecommendedNodes).toBe(1000);
  });

  test('declares an unbounded zoom range, so the host policy is the only limit', () => {
    // Cytoscape's zoom is a linear scale factor with no ceiling of its own (T6.20).
    const capabilities = new CytoscapeRenderer().capabilities;
    expect(capabilities.zoomRange?.min).toBe(0);
    expect(capabilities.zoomRange?.max).toBe(Number.POSITIVE_INFINITY);
  });

  test('calls before mount are no-ops, and 3D projection is ignored', () => {
    const renderer = new CytoscapeRenderer();
    expect(() => {
      renderer.setModel({ nodes: [], edges: [] });
      renderer.setSelection(['a']);
      renderer.setProjection('3d');
      renderer.setViewport({ zoom: 0.5, center: [0, 0, 0] });
      renderer.fit();
      renderer.focus('a');
      renderer.resize();
    }).not.toThrow();
  });

  test('reports no screen position before mount', () => {
    // A host that anchors a surface to a node reads undefined, never a guess.
    const renderer = new CytoscapeRenderer();
    expect(renderer.getNodeScreenPosition?.('a')).toBeUndefined();
  });

  test('on() returns a working unsubscribe before mount', () => {
    const renderer = new CytoscapeRenderer();
    const seen: string[] = [];
    const off = renderer.on('ready', () => seen.push('ready'));
    expect(typeof off).toBe('function');
    off();
    expect(seen).toEqual([]);
  });

  test('dispose is idempotent before and after a mount-less lifecycle', () => {
    const renderer = new CytoscapeRenderer();
    expect(() => {
      renderer.dispose();
      renderer.dispose();
    }).not.toThrow();
  });
});
