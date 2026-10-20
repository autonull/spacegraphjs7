// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyEdgeTheme, applyNodeTheme, resolveTheme } from '../src/core/theme';

describe('L1.4 theme resolution', () => {
  it('falls back to interaction colours and leaves colour/label unset', () => {
    const theme = resolveTheme();
    expect(theme.nodeFill).toBeUndefined();
    expect(theme.nodeStroke).toBeUndefined();
    expect(theme.edgeColor).toBeUndefined();
    expect(theme.label).toBeUndefined();
    expect(theme.selection).toBe(0x00ff88);
    expect(theme.hover).toBe(0x66aaff);
    expect(theme.focus).toBe(0x8b5cf6);
  });

  it('resolves provided colours, labels, and interaction states', () => {
    const theme = resolveTheme({
      node: { fill: '#111', stroke: '#222' },
      edge: { color: 0x333, labelColor: '#abc' },
      label: { color: '#fff', fontFamily: 'Inter', fontSize: 14 },
      selection: '#0f0',
      hover: '#ff0',
      focus: '#00f',
    });
    expect(theme.nodeFill).toBe('#111');
    expect(theme.nodeStroke).toBe('#222');
    expect(theme.edgeColor).toBe(0x333);
    expect(theme.edgeLabelColor).toBe('#abc');
    expect(theme.label).toEqual({ color: '#fff', fontFamily: 'Inter', fontSize: 14 });
    expect(theme.selection).toBe('#0f0');
    expect(theme.hover).toBe('#ff0');
    expect(theme.focus).toBe('#00f');
  });

  it('applies node fill/stroke only when the node sets none', () => {
    const theme = { node: { fill: 0x123456, stroke: '#abc' } };
    expect(applyNodeTheme({ color: 0xabcdef }, theme).color).toBe(0xabcdef);
    expect(applyNodeTheme({}, theme).color).toBe(0x123456);
    expect((applyNodeTheme({}, theme) as Record<string, unknown>).stroke).toBe('#abc');
  });

  it('applies edge colour/label only when the edge sets none', () => {
    const theme = { edge: { color: 0x654321, labelColor: '#fed' } };
    expect(applyEdgeTheme({ color: 0x111111 }, theme).color).toBe(0x111111);
    expect(applyEdgeTheme({}, theme).color).toBe(0x654321);
    expect(applyEdgeTheme({}, theme).labelColor).toBe('#fed');
  });

  it('returns the data unchanged when no theme is provided', () => {
    const data = { color: 0x1 };
    expect(applyNodeTheme(data, undefined)).toBe(data);
    expect(applyEdgeTheme(data, undefined)).toBe(data);
  });
});
