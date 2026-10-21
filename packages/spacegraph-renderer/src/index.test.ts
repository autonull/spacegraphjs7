import { describe, expect, test } from 'bun:test';
import { CONTRACT_VERSION, supports } from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from './index';

describe('@spacegraphjs/spacegraph-renderer', () => {
  test('declares its capabilities without lying about minimap support', () => {
    const capabilities = new SpaceGraphRenderer().capabilities;
    expect(capabilities.contractVersion).toBe(CONTRACT_VERSION);
    expect(supports(capabilities, '2d')).toBe(true);
    expect(supports(capabilities, '3d')).toBe(true);
    expect(supports(capabilities, 'domNodes')).toBe(true);
    expect(supports(capabilities, 'edgeLabels')).toBe(true);
    expect(supports(capabilities, 'minimap')).toBe(false);
    expect(capabilities.maxDomNodes).toBe(40);
  });

  test('declares the zoom range its normalized zoom cannot leave', () => {
    // The core's zoom is normalized over the fitted band: 0 is the farthest and 1 the closest. A
    // host that zooms past 1 asks for a zoom the renderer cannot deliver (T6.20).
    const capabilities = new SpaceGraphRenderer().capabilities;
    expect(capabilities.zoomRange).toEqual({ min: 0, max: 1 });
  });

  test('selection and model calls are no-ops before mount', () => {
    const renderer = new SpaceGraphRenderer();
    expect(() => {
      renderer.setSelection(['a']);
      renderer.setProjection('2d');
      renderer.setViewport({ zoom: 0.5, center: [0, 0, 0] });
      renderer.fit();
      renderer.focus('a');
      renderer.resize();
      renderer.dispose();
    }).not.toThrow();
  });

  test('reports no screen position before mount', () => {
    // A host that anchors a surface to a node reads undefined, never a guess.
    const renderer = new SpaceGraphRenderer();
    expect(renderer.getNodeScreenPosition?.('a')).toBeUndefined();
  });

  test('on() returns a working unsubscribe before mount', () => {
    const renderer = new SpaceGraphRenderer();
    const seen: string[] = [];
    const off = renderer.on('ready', () => seen.push('ready'));
    expect(typeof off).toBe('function');
    off();
    expect(seen).toEqual([]);
  });
});
