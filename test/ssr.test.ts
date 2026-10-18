// @vitest-environment node
import { describe, expect, it } from 'vitest';

// L1.31: importing the entries must not touch the DOM. This file runs under `node`, so any
// top-level `window`/`document`/`navigator` access in the import graph would throw here.
describe('SSR-safe imports', () => {
  it('runs without a DOM', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('imports the full entry without a DOM', async () => {
    const entry = await import('../src/index');

    expect(entry.SpaceGraph).toBeTypeOf('function');
    expect(entry.Graph).toBeTypeOf('function');
  });

  it('imports the lean activity entry without a DOM', async () => {
    const activity = await import('../src/activity');

    expect(activity.SpaceGraph).toBeTypeOf('function');
  });

  it('imports the contract and every adapter without a DOM', async () => {
    const [contract, spacegraphRenderer, cytoscapeRenderer, svgRenderer] = await Promise.all([
      import('@spacegraphjs/renderer'),
      import('@spacegraphjs/spacegraph-renderer'),
      import('@spacegraphjs/cytoscape-renderer'),
      import('@spacegraphjs/svg-renderer'),
    ]);

    expect(contract.CONTRACT_VERSION).toBeTypeOf('number');
    expect(spacegraphRenderer.SpaceGraphRenderer).toBeTypeOf('function');
    expect(cytoscapeRenderer.CytoscapeRenderer).toBeTypeOf('function');
    expect(svgRenderer.renderToSVG).toBeTypeOf('function');
  });
});
