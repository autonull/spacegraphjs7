import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpaceGraph } from '../src/SpaceGraph';
import { HtmlNode } from '../src/nodes/HtmlNode';

describe('HtmlNode Unit Tests', () => {
    let sg: any;

    beforeEach(() => {
        // Mock SpaceGraph and its dependencies
        sg = {
            events: { emit: vi.fn() },
            renderer: { camera: { quaternion: { copy: vi.fn() } } },
            graph: { nodes: new Map() }
        };
    });

    it('should correctly initialize with HTML content', () => {
        const spec = {
            id: 'test-node',
            type: 'HtmlNode',
            data: {
                html: '<div id="test-content">Hello World</div>',
                backgroundColor: '#ff0000',
                width: 500,
                height: 300
            }
        };

        const node = new HtmlNode(sg as any, spec as any);

        const content = node.domElement.querySelector('.node-content');
        expect(content).toBeTruthy();
        expect(content?.innerHTML).toContain('id="test-content"');
        expect(content?.innerHTML).toContain('Hello World');

        // Check styles
        expect(node.domElement.style.width).toBe('500px');
        expect(node.domElement.style.height).toBe('300px');

        // Check background color application (variable)
        expect(node.domElement.style.getPropertyValue('--node-bg')).toBe('#ff0000');
    });

    it('should support useRawHtml flag to strip default styles', () => {
        const spec = {
            id: 'raw-node',
            type: 'HtmlNode',
            data: {
                html: '<div>Raw</div>',
                useRawHtml: true
            }
        };

        const node = new HtmlNode(sg as any, spec as any);

        expect(node.domElement.style.backgroundColor).toBe('transparent');
        // JSDOM might return "initial", "medium", or empty for "none" depending on the property
        expect(node.domElement.style.border).toMatch(/none|medium|^$/);
        expect(node.domElement.style.boxShadow).toMatch(/none|^$/);
    });

    it('should update content when updateSpec is called', () => {
        const node = new HtmlNode(sg as any, { id: 'u', type: 'HtmlNode' } as any);
        node.updateSpec({ data: { html: '<span>New Content</span>' } });

        const content = node.domElement.querySelector('.node-content');
        expect(content?.innerHTML).toBe('<span>New Content</span>');
    });

    it('should handle backgroundColor in data updates', () => {
        const node = new HtmlNode(sg as any, { id: 'u', type: 'HtmlNode' } as any);
        node.updateSpec({ data: { backgroundColor: '#00ff00' } });

        expect(node.domElement.style.getPropertyValue('--node-bg')).toBe('#00ff00');
    });
});
