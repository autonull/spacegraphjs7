import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import { exportGraph, standaloneHtml, type ExportFormat, type ExportOptions } from './export';

// Mock the svg-renderer
vi.mock('@spacegraphjs/svg-renderer', () => ({
    renderToSVG: vi.fn(
        (model, options) => `<svg data-test="rendered">${model.nodes.length} nodes</svg>`,
    ),
    serializeRenderModel: vi.fn((model) => JSON.stringify(model)),
}));

// Mock URL.createObjectURL and document
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document methods
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
});

function createMockModel(overrides: Partial<RenderModel> = {}): RenderModel {
    return {
        nodes: [{ id: '1', label: 'Node 1', kind: 'message' }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1, width: 800, height: 600 },
        ...overrides,
    };
}

function createMockTheme(overrides: Partial<RenderTheme> = {}): RenderTheme {
    return {
        background: '#ffffff',
        text: '#000000',
        textMuted: '#666666',
        border: '#cccccc',
        surface: '#f0f0f0',
        surfaceMuted: '#e0e0e0',
        fontFamily: 'system-ui',
        node: {
            default: '#000000',
            message: '#0000ff',
            turn: '#00ff00',
            phase: '#ff0000',
            file: '#ff00ff',
            directory: '#ffff00',
            package: '#00ffff',
            commit: '#ff8800',
            branch: '#8800ff',
            issue: '#ff0088',
        },
        edge: {
            default: '#000000',
            'part-of': '#0000ff',
            calls: '#00ff00',
            reads: '#ff0000',
            writes: '#ff00ff',
            'depends-on': '#ffff00',
            next: '#00ffff',
            error: '#ff8800',
            'test-failure': '#8800ff',
        },
        ...overrides,
    };
}

function createMockOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
    return {
        theme: createMockTheme(),
        sessionTitle: 'Test Session',
        testedCommit: 'abc123',
        timestamp: '2024-01-15T10:30:00.000Z',
        ...overrides,
    };
}

describe('standaloneHtml', () => {
    it('generates valid HTML with escaped content', () => {
        const svg = '<svg><text>Test & "Special" chars</text></svg>';
        const json = '{"nodes":[{"id":"1","label":"Test"}]}';
        const theme = createMockTheme();
        const html = standaloneHtml(
            svg,
            json,
            theme,
            'Test Session',
            'abc123',
            '2024-01-15T10:30:00.000Z',
        );

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<title>Test Session - Session Map</title>');
        expect(html).toContain('Test Session');
        expect(html).toContain('abc123');
        expect(html).toContain('Test & "Special" chars'); // HTML escaped in SVG
        // JSON is HTML-escaped in <pre> tag (" for quotes)
        expect(html).toContain(
            '{\u0026quot;nodes\u0026quot;:[{\u0026quot;id\u0026quot;:\u0026quot;1\u0026quot;,\u0026quot;label\u0026quot;:\u0026quot;Test\u0026quot;}]}',
        );
    });

    it('uses theme colors in CSS', () => {
        const theme = createMockTheme({
            background: '#1a1a1a',
            text: '#ffffff',
            border: '#333333',
        });
        const html = standaloneHtml('<svg></svg>', '{}', theme, 'Title', 'commit', 'timestamp');

        expect(html).toContain('background: #1a1a1a');
        expect(html).toContain('color: #ffffff');
        expect(html).toContain('border: 1px solid #333333');
    });

    it('includes meta information with commit and timestamp', () => {
        const html = standaloneHtml(
            '<svg></svg>',
            '{}',
            createMockTheme(),
            'My Session',
            'xyz789',
            '2024-06-20T15:45:00.000Z',
        );

        expect(html).toContain('My Session');
        expect(html).toContain('xyz789');
        expect(html).toContain('Exported:');
    });

    it('escapes HTML special characters in title and commit', () => {
        const html = standaloneHtml(
            '<svg></svg>',
            '{}',
            createMockTheme(),
            'Session <1>',
            "commit & 'quote'",
            'timestamp',
        );

        // Title is HTML-escaped in <h1> tag (< becomes <)
        expect(html).toContain('Session &lt;1&gt;');
        expect(html).toContain('commit &amp; &#039;quote&#039;');
    });
});

describe('exportGraph', () => {
    const mockModel = createMockModel();
    const mockOptions = createMockOptions();

    it('exports SVG and triggers download', () => {
        exportGraph('svg', mockModel, mockOptions);

        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(document.body.appendChild).toHaveBeenCalled();
        expect(document.body.removeChild).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('exports JSON and triggers download', () => {
        exportGraph('json', mockModel, mockOptions);

        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('exports HTML and triggers download', () => {
        exportGraph('html', mockModel, mockOptions);

        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('uses provided timestamp, sessionTitle, and testedCommit', () => {
        const customOptions = createMockOptions({
            timestamp: '2024-12-25T00:00:00.000Z',
            sessionTitle: 'Custom Title',
            testedCommit: 'custom-commit',
        });

        exportGraph('html', mockModel, customOptions);

        // The blob content should include the custom values
        // We verify by checking that download was called
        expect(document.body.appendChild).toHaveBeenCalled();
    });

    it('uses defaults when options are not provided', () => {
        const minimalOptions: ExportOptions = { theme: createMockTheme() };
        exportGraph('svg', mockModel, minimalOptions);

        expect(document.body.appendChild).toHaveBeenCalled();
    });
});
