// @vitest-environment node
import { describe, expect, test } from 'vitest';
import {
  CONTRACT_VERSION,
  negotiateContract,
  supports,
  supportsDepth,
  type DepthMode,
  type GraphRenderer,
} from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { renderToSVG } from '@spacegraphjs/svg-renderer';
import { activityHostFixture } from '../demo/activity-host';

// L1.22 — headless half of the shared conformance suite. It proves the structural and capability
// contract for every interactive adapter without a browser. Mount/click/resize/dispose/HTML-card
// assertions live in the browser half (the session-graph Storybook harness mounts both adapters).

const METHOD_NAMES = [
  'mount',
  'setModel',
  'setTheme',
  'setProjection',
  'setDepth',
  'setSelection',
  'setViewport',
  'fit',
  'focus',
  'resize',
  'on',
  'dispose',
] as const;

const adapters: ReadonlyArray<{ name: string; create: () => GraphRenderer }> = [
  { name: 'spacegraph', create: () => new SpaceGraphRenderer() },
  { name: 'cytoscape', create: () => new CytoscapeRenderer() },
];

describe.each(adapters)('renderer contract: $name', ({ create }) => {
  test('implements the full GraphRenderer method surface', () => {
    const renderer = create();
    for (const name of METHOD_NAMES) expect(typeof renderer[name]).toBe('function');
    expect(renderer.capabilities).toBeTypeOf('object');
  });

  test('declares the current contract version', () => {
    expect(create().capabilities.contractVersion).toBe(CONTRACT_VERSION);
  });

  test('capability flags drive supports() truthfully', () => {
    const capabilities = create().capabilities;
    expect(supports(capabilities, '2d')).toBe(true);
    for (const projection of capabilities.projections) expect(['2d', '3d']).toContain(projection);
    expect(supports(capabilities, '3d')).toBe(capabilities.projections.includes('3d'));
    expect(typeof capabilities.domNodes).toBe('boolean');
    expect(supports(capabilities, 'domNodes')).toBe(capabilities.domNodes);
    expect(capabilities.maxDomNodes).toBeGreaterThan(0);
    expect(capabilities.maxRecommendedNodes).toBeGreaterThan(0);
  });

  test('declares the depth treatments it can honour', () => {
    const capabilities = create().capabilities;
    expect(capabilities.depths.length).toBeGreaterThan(0);
    expect(supportsDepth(capabilities, 'flat')).toBe(true);
    for (const depth of capabilities.depths) {
      expect(['flat', 'layered', 'depth-stack', 'orbit'] as DepthMode[]).toContain(depth);
      expect(supportsDepth(capabilities, depth)).toBe(true);
    }
  });

  test('calls before mount are no-ops and never throw', () => {
    const renderer = create();
    expect(() => {
      renderer.setModel({ nodes: [], edges: [] });
      renderer.setTheme({ ...theme });
      renderer.setProjection('2d');
      renderer.setDepth('depth-stack');
      renderer.setSelection(['a']);
      renderer.setViewport({ zoom: 0.5, center: [0, 0, 0] });
      renderer.fit(['a']);
      renderer.focus('a');
      renderer.resize();
    }).not.toThrow();
  });

  test('on() returns a working unsubscribe before mount', () => {
    const renderer = create();
    const seen: string[] = [];
    const off = renderer.on('ready', () => seen.push('ready'));
    expect(typeof off).toBe('function');
    off();
    expect(seen).toEqual([]);
  });

  test('reports the camera frame, so a host can place the camera exactly', () => {
    const renderer = create();
    expect(typeof renderer.getViewport).toBe('function');
    const viewport = renderer.getViewport!();
    expect(viewport.zoom).toBeTypeOf('number');
    expect(viewport.center).toHaveLength(3);
    for (const value of viewport.center) expect(value).toBeTypeOf('number');
  });

  test('dispose is idempotent, and calls after dispose are no-ops', () => {
    const renderer = create();
    expect(() => {
      renderer.dispose();
      renderer.dispose();
      renderer.setModel({ nodes: [], edges: [] });
      renderer.setSelection(['a']);
      renderer.resize();
    }).not.toThrow();
  });
});

describe('capability differences are declared, not assumed', () => {
  test('only SpaceGraph offers 3D; both offer DOM cards, edge labels, and clusters', () => {
    const spacegraph = new SpaceGraphRenderer().capabilities;
    const cytoscape = new CytoscapeRenderer().capabilities;
    expect(supports(spacegraph, '3d')).toBe(true);
    expect(supports(cytoscape, '3d')).toBe(false);
    for (const capabilities of [spacegraph, cytoscape]) {
      expect(supports(capabilities, '2d')).toBe(true);
      expect(supports(capabilities, 'domNodes')).toBe(true);
      expect(supports(capabilities, 'edgeLabels')).toBe(true);
      expect(supports(capabilities, 'clusterNodes')).toBe(true);
    }
    // Neither adapter lies about a minimap it cannot yet provide (L1.27).
    expect(supports(spacegraph, 'minimap')).toBe(false);
    expect(supports(cytoscape, 'minimap')).toBe(false);
  });

  test('the depth spectrum is declared honestly: SpaceGraph has every mode, Cytoscape only flat', () => {
    const spacegraph = new SpaceGraphRenderer().capabilities;
    const cytoscape = new CytoscapeRenderer().capabilities;
    for (const depth of ['flat', 'layered', 'depth-stack', 'orbit'] as DepthMode[]) {
      expect(supportsDepth(spacegraph, depth)).toBe(true);
    }
    expect(supportsDepth(cytoscape, 'flat')).toBe(true);
    for (const depth of ['layered', 'depth-stack', 'orbit'] as DepthMode[]) {
      expect(supportsDepth(cytoscape, depth)).toBe(false);
    }
  });
});

const theme = {
  background: '#101014',
  surface: '#1b1b22',
  surfaceMuted: '#2a2a33',
  text: '#f5f5f7',
  textMuted: '#a0a0aa',
  border: '#3a3a44',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  edge: '#6b7280',
  edgeMuted: '#4b5563',
  selection: '#60a5fa',
  focus: '#93c5fd',
  fontFamily: 'ui-sans-serif',
  fontSize: 13,
};

describe('second-host fixture (P8.6)', () => {
  const model = activityHostFixture();

  test('every adapter accepts a host-neutral model without throwing', () => {
    for (const { create } of adapters) {
      const renderer = create();
      expect(() => {
        renderer.setModel(model);
        renderer.setSelection(['tool:edit']);
      }).not.toThrow();
    }
  });

  test('renders the fixture to static SVG with its content', () => {
    const svg = renderToSVG(model);
    expect(svg).toContain('src/billing/invoice.ts');
    expect(svg).toContain('retry #1');
    expect(svg).toContain('expected 2 to equal 3');
  });
});

describe('contract version negotiation (P8.7)', () => {
  test('every adapter negotiates the current contract version', () => {
    for (const { create } of adapters) {
      expect(negotiateContract(create().capabilities.contractVersion)).toEqual({ ok: true });
    }
  });

  test('a future version is rejected with a clear message, not a crash', () => {
    const result = negotiateContract(CONTRACT_VERSION + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(String(CONTRACT_VERSION + 1));
  });
});
