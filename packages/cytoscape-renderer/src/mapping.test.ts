import { describe, expect, test } from 'bun:test';
import type { RenderEdge, RenderNode, RenderTheme } from '@spacegraphjs/renderer';
import { cytoscapeStyle, edgeElement, nodeElement, normalizeTheme, statusColor } from './mapping';

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

describe('statusColor', () => {
  test('maps statuses to themed CSS colors', () => {
    expect(statusColor('success', theme)).toBe('#22c55e');
    expect(statusColor('error', theme)).toBe('#ef4444');
    expect(statusColor('warning', theme)).toBe('#f59e0b');
    expect(statusColor('running', theme)).toBe('#3b82f6');
    expect(statusColor(undefined, theme)).toBe('#2a2a33');
  });
});

describe('nodeElement', () => {
  test('maps a card to a capped, non-interpreting node with host markup kept in data', () => {
    const element = nodeElement(node({ html: '<b>hi</b>', shape: 'card', size: [200, 80] }), theme);
    expect(element.group).toBe('nodes');
    expect(element.classes).toBe('card');
    expect(element.position).toEqual({ x: 10, y: 20 });
    expect(element.data).toMatchObject({ id: 'n1', label: 'read', width: 200, height: 80 });
  });

  test('maps a dot to a circle class and honors interactivity', () => {
    const element = nodeElement(node({ shape: 'dot', status: 'error', interactive: false }), theme);
    expect(element.classes).toBe('dot');
    expect(element.selectable).toBe(false);
    expect(element.data).toMatchObject({ color: '#ef4444', width: 16, height: 16 });
  });

  test('maps a group to a compound parent with its members', () => {
    const group = nodeElement(node({ id: 'group', shape: 'group', size: [320, 200], label: 'Turn 1' }), theme);
    expect(group.classes).toBe('group');
    expect(group.data).toMatchObject({ id: 'group', width: 320, height: 200 });

    const child = nodeElement(node({ id: 'child', parent: 'group' }), theme);
    expect(child.data.parent).toBe('group');
  });
});

describe('edgeElement', () => {
  test('uses the explicit color and a solid class by default', () => {
    const element = edgeElement(edge(), theme);
    expect(element.group).toBe('edges');
    expect(element.classes).toEqual(['explicit', 'undirected', 'solid']);
    expect(element.data).toMatchObject({ source: 'a', target: 'b', color: '#6b7280', width: 2 });
  });

  test('mutes, dashes, and directs inferred edges', () => {
    const element = edgeElement(edge({ confidence: 'inferred', directed: true, label: 'reads' }), theme);
    expect(element.classes).toEqual(['inferred', 'directed', 'solid']);
    expect(element.data).toMatchObject({ color: '#4b5563', width: 1, label: 'reads' });
  });
});

describe('cytoscapeStyle', () => {
  test('styles from the theme and drives enum props through classes', () => {
    const sheet = cytoscapeStyle(theme);
    const base = sheet.find((block) => block.selector === 'node');
    expect(base?.style).toMatchObject({ 'background-color': 'data(color)', 'border-color': '#3a3a44' });
    const edgeBase = sheet.find((block) => block.selector === 'edge');
    expect(edgeBase?.style).toMatchObject({ 'line-color': 'data(color)', 'target-arrow-shape': 'none' });
    expect(sheet.some((block) => block.selector === 'edge.inferred, edge.dashed')).toBe(true);
    expect(sheet.some((block) => block.selector === 'node:selected')).toBe(true);
  });
});

describe('normalizeTheme', () => {
  test('drops alpha from 8-digit hex that Cytoscape rejects', () => {
    const normalized = normalizeTheme({ ...theme, background: '#f2f2f2ff', edgeMuted: '#80808080' });
    expect(normalized.background).toBe('#f2f2f2');
    expect(normalized.edgeMuted).toBe('#808080');
    expect(normalized.text).toBe('#f5f5f7');
  });

  test('expands 3-digit hex and leaves non-hex colors untouched', () => {
    const normalized = normalizeTheme({ ...theme, accent: '#abc', edge: 'rgb(1, 2, 3)' });
    expect(normalized.accent).toBe('#aabbcc');
    expect(normalized.edge).toBe('rgb(1, 2, 3)');
  });
});
