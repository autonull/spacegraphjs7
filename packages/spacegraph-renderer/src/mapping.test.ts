import { describe, expect, test } from 'bun:test';
import type { RenderEdge, RenderNode, RenderTheme } from '@spacegraphjs/renderer';
import { edgeSpec, nodeSpec, parseColor, spaceGraphTheme, statusColor } from './mapping';

const theme: RenderTheme = {
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

const node = (over: Partial<RenderNode> = {}): RenderNode => ({
  id: 'n1',
  kind: 'tool',
  label: 'read',
  position: [10, 20, 30],
  ...over,
});

const edge = (over: Partial<RenderEdge> = {}): RenderEdge => ({
  id: 'e1',
  source: 'a',
  target: 'b',
  kind: 'reads',
  ...over,
});

describe('parseColor', () => {
  test('reads 3, 6, and 8 digit hex', () => {
    expect(parseColor('#f00')).toBe(0xff0000);
    expect(parseColor('#ef4444')).toBe(0xef4444);
    expect(parseColor('#22c55eaa')).toBe(0x22c55e);
  });

  test('reads rgb() and falls back for unknown shapes', () => {
    expect(parseColor('rgb(59, 130, 246)')).toBe(0x3b82f6);
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toBe(0);
    expect(parseColor('not-a-color')).toBe(0x888888);
    expect(parseColor(undefined)).toBe(0x888888);
  });
});

describe('statusColor', () => {
  test('maps statuses to themed colors', () => {
    expect(statusColor('success', theme)).toBe(0x22c55e);
    expect(statusColor('error', theme)).toBe(0xef4444);
    expect(statusColor('warning', theme)).toBe(0xf59e0b);
    expect(statusColor('running', theme)).toBe(0x3b82f6);
    expect(statusColor(undefined, theme)).toBe(0x2a2a33);
  });
});

describe('nodeSpec', () => {
  test('renders html cards as HtmlNode with the host markup and no evaluation', () => {
    const spec = nodeSpec(node({ html: '<b>hi</b>', shape: 'card', size: [200, 80] }), theme);
    expect(spec.type).toBe('HtmlNode');
    expect(spec.position).toEqual([10, 20, 30]);
    expect(spec.data).toMatchObject({ html: '<b>hi</b>', width: 200, height: 80, pointerEvents: 'auto' });
  });

  test('wraps host markup in a directional container for RTL (P8.9)', () => {
    const spec = nodeSpec(node({ html: '<b>مرحبا</b>', shape: 'card' }), { ...theme, direction: 'rtl' });
    expect(spec.data.html).toContain('dir="rtl"');
    expect(spec.data.html).toContain('<b>مرحبا</b>');
  });

  test('renders other shapes as ShapeNode with a status color', () => {
    const spec = nodeSpec(node({ status: 'error', shape: 'dot', size: [2, 2, 2] }), theme);
    expect(spec.type).toBe('ShapeNode');
    expect(spec.data).toMatchObject({ shape: 'circle', size: 2, color: 0xef4444 });
  });

  test('lets the core choose a shape size when the host omits one', () => {
    const spec = nodeSpec(node({ shape: 'panel' }), theme);
    expect(spec.data).not.toHaveProperty('size');
  });
});

describe('edgeSpec', () => {
  test('uses LabeledEdge when a label is present and curves otherwise', () => {
    expect(edgeSpec(edge({ label: 'reads' }), theme).type).toBe('LabeledEdge');
    expect(edgeSpec(edge(), theme).type).toBe('CurvedEdge');
  });

  test('mutes and dashes inferred edges and marks directed ones', () => {
    const spec = edgeSpec(edge({ confidence: 'inferred', directed: true }), theme);
    expect(spec.data).toMatchObject({ dashed: true, thickness: 1, arrowhead: 'target', color: 0x4b5563 });
  });
});

describe('spaceGraphTheme (RF.6)', () => {
  test('maps the host theme onto the core theme surface', () => {
    expect(spaceGraphTheme(theme)).toEqual({
      background: '#101014',
      node: { stroke: 0x3a3a44 },
      edge: { color: 0x6b7280, labelColor: '#a0a0aa', labelBackground: '#1b1b22' },
      label: { color: '#f5f5f7', fontFamily: 'ui-sans-serif', fontSize: 13 },
      selection: 0x60a5fa,
      hover: 0x93c5fd,
      focus: 0x93c5fd,
    });
  });
});
