import { describe, expect, test } from 'bun:test';
import { RENDER_THEME, node, edge } from '../../renderer/test/fixtures';
import { cytoscapeStyle, edgeElement, nodeElement, normalizeTheme, statusColor } from './mapping';

describe('statusColor', () => {
    test('maps statuses to themed CSS colors', () => {
        expect(statusColor('success', RENDER_THEME)).toBe('#22c55e');
        expect(statusColor('error', RENDER_THEME)).toBe('#ef4444');
        expect(statusColor('warning', RENDER_THEME)).toBe('#f59e0b');
        expect(statusColor('running', RENDER_THEME)).toBe('#3b82f6');
        expect(statusColor(undefined, RENDER_THEME)).toBe('#2a2a33');
    });
});

describe('nodeElement', () => {
    test('maps a card to a capped, non-interpreting node with host markup kept in data', () => {
        const element = nodeElement(
            node({ html: '<b>hi</b>', shape: 'card', size: [200, 80] }),
            RENDER_THEME,
        );
        expect(element.group).toBe('nodes');
        expect(element.classes).toBe('card');
        expect(element.position).toEqual({ x: 10, y: 20 });
        expect(element.data).toMatchObject({ id: 'n1', label: 'read', width: 200, height: 80 });
    });

    test('maps a dot to a circle class and honors interactivity', () => {
        const element = nodeElement(
            node({ shape: 'dot', status: 'error', interactive: false }),
            RENDER_THEME,
        );
        expect(element.classes).toBe('dot');
        expect(element.selectable).toBe(false);
        expect(element.data).toMatchObject({ color: '#ef4444', width: 16, height: 16 });
    });

    test('maps a group to a compound parent with its members', () => {
        const group = nodeElement(
            node({ id: 'group', shape: 'group', size: [320, 200], label: 'Turn 1' }),
            RENDER_THEME,
        );
        expect(group.classes).toBe('group');
        expect(group.data).toMatchObject({ id: 'group', width: 320, height: 200 });

        const child = nodeElement(node({ id: 'child', parent: 'group' }), RENDER_THEME);
        expect(child.data.parent).toBe('group');
    });
});

describe('edgeElement', () => {
    test('uses the explicit color and a solid class by default', () => {
        const element = edgeElement(edge(), RENDER_THEME);
        expect(element.group).toBe('edges');
        expect(element.classes).toEqual(['explicit', 'undirected', 'solid']);
        expect(element.data).toMatchObject({
            source: 'a',
            target: 'b',
            color: '#6b7280',
            width: 2,
        });
    });

    test('mutes, dashes, and directs inferred edges', () => {
        const element = edgeElement(
            edge({ confidence: 'inferred', directed: true, label: 'reads' }),
            RENDER_THEME,
        );
        expect(element.classes).toEqual(['inferred', 'directed', 'solid']);
        expect(element.data).toMatchObject({ color: '#4b5563', width: 1, label: 'reads' });
    });
});

describe('cytoscapeStyle', () => {
    test('styles from the RENDER_THEME and drives enum props through classes', () => {
        const sheet = cytoscapeStyle(RENDER_THEME);
        const base = sheet.find((block) => block.selector === 'node');
        expect(base?.style).toMatchObject({
            'background-color': 'data(color)',
            'border-color': '#3a3a44',
        });
        const edgeBase = sheet.find((block) => block.selector === 'edge');
        expect(edgeBase?.style).toMatchObject({
            'line-color': 'data(color)',
            'target-arrow-shape': 'none',
        });
        expect(sheet.some((block) => block.selector === 'edge.inferred, edge.dashed')).toBe(true);
        expect(sheet.some((block) => block.selector === 'node:selected')).toBe(true);
    });
});

describe('normalizeTheme', () => {
    test('drops alpha from 8-digit hex that Cytoscape rejects', () => {
        const normalized = normalizeTheme({
            ...RENDER_THEME,
            background: '#f2f2f2ff',
            edgeMuted: '#80808080',
        });
        expect(normalized.background).toBe('#f2f2f2');
        expect(normalized.edgeMuted).toBe('#808080');
        expect(normalized.text).toBe('#f5f5f7');
    });

    test('expands 3-digit hex and leaves non-hex colors untouched', () => {
        const normalized = normalizeTheme({ ...RENDER_THEME, accent: '#abc', edge: 'rgb(1, 2, 3)' });
        expect(normalized.accent).toBe('#aabbcc');
        expect(normalized.edge).toBe('rgb(1, 2, 3)');
    });
});
