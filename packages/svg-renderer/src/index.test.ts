import { describe, expect, test } from 'bun:test';
import type { RenderModel } from '@spacegraphjs/renderer';
import { renderToSVG, statusColor, DEFAULT_SVG_THEME } from './index';

const model: RenderModel = {
  nodes: [
    { id: 'a', kind: 'tool', label: 'read session.ts', shape: 'card', position: [0, 0, 0] },
    { id: 'b', kind: 'error', label: 'assertion <failed>', status: 'error', shape: 'dot', position: [240, 0, 0] },
    { id: 'c', kind: 'hidden', label: 'gone', visible: false, position: [999, 999, 0] },
  ],
  edges: [
    { id: 'e1', source: 'a', target: 'b', kind: 'produces', label: 'reads', directed: true },
    { id: 'e2', source: 'a', target: 'b', kind: 'evidence', confidence: 'inferred' },
  ],
};

describe('renderToSVG', () => {
  test('emits a self-contained svg with nodes, edges, and labels', () => {
    const svg = renderToSVG(model);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('<circle');
    expect(svg).toContain('<rect');
    expect(svg).toContain('read session.ts');
    expect(svg).toContain('marker-end="url(#sgs-arrow)"');
  });

  test('escapes host text and drops hidden nodes', () => {
    const svg = renderToSVG(model);
    expect(svg).toContain('assertion &lt;failed&gt;');
    expect(svg).not.toContain('<failed>');
    expect(svg).not.toContain('gone');
  });

  test('mutes inferred edges and applies theme colors', () => {
    const svg = renderToSVG(model, { theme: { error: '#ff0000', edgeMuted: '#111111' } });
    expect(svg).toContain('#ff0000');
    expect(svg).toContain('#111111');
    expect(svg).toContain('stroke-dasharray="5 4"');
  });

  test('honours explicit width and height', () => {
    const svg = renderToSVG(model, { width: 800, height: 400 });
    expect(svg).toContain('width="800" height="400"');
  });

  test('is deterministic across runs', () => {
    expect(renderToSVG(model)).toBe(renderToSVG(model));
  });
});

describe('statusColor', () => {
  test('maps statuses to theme colors', () => {
    expect(statusColor('error', DEFAULT_SVG_THEME)).toBe('#ef4444');
    expect(statusColor(undefined, DEFAULT_SVG_THEME)).toBe('#2a2a33');
  });
});
