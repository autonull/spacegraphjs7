import { describe, expect, test } from 'bun:test';
import { RENDER_THEME, node, edge } from '../../renderer/test/fixtures';
import { edgeSpec, nodeSpec, parseColor, spaceGraphTheme, statusColor } from './mapping';

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
        expect(statusColor('success', RENDER_THEME)).toBe(0x22c55e);
        expect(statusColor('error', RENDER_THEME)).toBe(0xef4444);
        expect(statusColor('warning', RENDER_THEME)).toBe(0xf59e0b);
        expect(statusColor('running', RENDER_THEME)).toBe(0x3b82f6);
        expect(statusColor(undefined, RENDER_THEME)).toBe(0x2a2a33);
    });
});

describe('nodeSpec', () => {
    test('renders html cards as HtmlNode with the host markup and no evaluation', () => {
        const spec = nodeSpec(node({ html: '<b>hi</b>', shape: 'card', size: [200, 80] }), RENDER_THEME);
        expect(spec.type).toBe('HtmlNode');
        expect(spec.position).toEqual([10, 20, 30]);
        expect(spec.data).toMatchObject({
            html: '<b>hi</b>',
            width: 200,
            height: 80,
            pointerEvents: 'auto',
        });
    });

    test('wraps host markup in a directional container for RTL (P8.9)', () => {
        const spec = nodeSpec(node({ html: '<b>مرحبا</b>', shape: 'card' }), {
            ...RENDER_THEME,
            direction: 'rtl',
        });
        expect(spec.data.html).toContain('dir="rtl"');
        expect(spec.data.html).toContain('<b>مرحبا</b>');
    });

    test('renders other shapes as ShapeNode with a status color', () => {
        const spec = nodeSpec(node({ status: 'error', shape: 'dot', size: [2, 2, 2] }), RENDER_THEME);
        expect(spec.type).toBe('ShapeNode');
        expect(spec.data).toMatchObject({ shape: 'circle', size: 2, color: 0xef4444 });
    });

    test('lets the core choose a shape size when the host omits one', () => {
        const spec = nodeSpec(node({ shape: 'panel' }), RENDER_THEME);
        expect(spec.data).not.toHaveProperty('size');
    });

    test('renders a group as an interactive DOM node with its members in the scene', () => {
        const spec = nodeSpec(
            node({
                shape: 'group',
                html: '<section>turn</section>',
                size: [320, 220],
                interactive: true,
            }),
            RENDER_THEME,
        );
        expect(spec.type).toBe('HtmlNode');
        expect(spec.data).toMatchObject({
            html: '<section>turn</section>',
            width: 320,
            height: 220,
            pointerEvents: 'auto',
            group: true,
            useRawHtml: true,
            interactive: true,
        });
    });

    test('passes a node parent through to the core for group dragging', () => {
        const spec = nodeSpec(node({ html: '<b>child</b>', parent: 'group:turn' }), RENDER_THEME);
        expect(spec.data.parent).toBe('group:turn');
    });
});

describe('edgeSpec', () => {
    test('uses LabeledEdge when a label is present and curves otherwise', () => {
        expect(edgeSpec(edge({ label: 'reads' }), RENDER_THEME).type).toBe('LabeledEdge');
        expect(edgeSpec(edge(), RENDER_THEME).type).toBe('CurvedEdge');
    });

    test('mutes and dashes inferred edges with correct opacity', () => {
        const spec = edgeSpec(edge({ confidence: 'inferred', directed: true }), RENDER_THEME);
        expect(spec.data).toMatchObject({
            dashed: true,
            thickness: 1,
            arrowhead: false,
            opacity: 0.7,
            color: 0x4b5563,
        });
    });

    test('widens emphasized edges into causal ribbons', () => {
        const plain = edgeSpec(edge({ confidence: 'explicit' }), RENDER_THEME);
        const loud = edgeSpec(
            edge({
                confidence: 'explicit',
                emphasis: 0.8,
                data: { ribbon: { weight: 0.8, minRadius: 1, maxRadius: 8, segments: 3 } },
            }),
            RENDER_THEME,
        );
        expect(loud.type).toBe('TaperedEdge');
        expect(loud.data.thickness).toBeCloseTo(plain.data.thickness * 1.8);
        expect(loud.data.color).toBe(plain.data.color);
    });
    test('a fluid ribbon selects the flux edge with curve and halo data', () => {
        const spec = edgeSpec(
            edge({ data: { ribbon: { fluid: true, curve: 0.2, inset: 0.12, halo: 0.6 } } }),
            RENDER_THEME,
        );
        expect(spec.type).toBe('FluxEdge');
        expect(spec.data).toMatchObject({ curve: 0.2, inset: 0.12, halo: 0.6 });
    });

    test('a flux ribbon carries collar and sheath as opaque geometry data', () => {
        const spec = edgeSpec(
            edge({ data: { ribbon: { fluid: true, collar: 0.9, sheath: 0.6 } } }),
            RENDER_THEME,
        );
        expect(spec.type).toBe('FluxEdge');
        expect(spec.data).toMatchObject({ collar: 0.9, sheath: 0.6 });
    });

    test('a ribbon color overrides the edge style color', () => {
        const spec = edgeSpec(edge({ data: { ribbon: { color: '#8ff0d0' } } }), RENDER_THEME);
        expect(spec.data.color).toBe(parseColor('#8ff0d0'));
    });

    test('adds arrowhead only on evidence/delegates edges', () => {
        const evidenceSpec = edgeSpec(edge({ kind: 'evidence', confidence: 'explicit' }), RENDER_THEME);
        expect(evidenceSpec.data.arrowhead).toBe('target');
        const delegateSpec = edgeSpec(edge({ kind: 'delegates', confidence: 'explicit' }), RENDER_THEME);
        expect(delegateSpec.data.arrowhead).toBe('target');
        const explicitSpec = edgeSpec(edge({ kind: 'sequence', confidence: 'explicit' }), RENDER_THEME);
        expect(explicitSpec.data.arrowhead).toBe(false);
    });
});

describe('spaceGraphTheme (RF.6)', () => {
    test('maps the host RENDER_THEME onto the core RENDER_THEME surface', () => {
        expect(spaceGraphTheme(RENDER_THEME)).toEqual({
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
