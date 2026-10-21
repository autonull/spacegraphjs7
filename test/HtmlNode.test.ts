import { HtmlNode } from 'spacegraphjs/nodes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('HtmlNode Unit Tests', () => {
  let sg: any;

  beforeEach(() => {
    // Mock SpaceGraph and its dependencies
    sg = {
      events: { emit: vi.fn() },
      renderer: { camera: { quaternion: { copy: vi.fn() } } },
      graph: { nodes: new Map() },
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
        height: 300,
      },
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
        useRawHtml: true,
      },
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

  it('should keep the host markup when the model updates the label', () => {
    const markup = '<div style="color: rgb(255, 0, 0)">Styled</div>';
    const node = new HtmlNode(sg as any, {
      id: 'u',
      type: 'HtmlNode',
      label: 'Label',
      data: { html: markup },
    } as any);

    node.updateSpec({ label: 'Another label', data: { html: markup } });

    const content = node.domElement.querySelector('.node-content');
    expect(content?.innerHTML).toBe(markup);
  });

  it('should keep the host markup when the model updates the label alone', () => {
    const markup = '<div style="color: rgb(255, 0, 0)">Styled</div>';
    const node = new HtmlNode(sg as any, {
      id: 'u',
      type: 'HtmlNode',
      label: 'Label',
      data: { html: markup },
    } as any);

    node.updateSpec({ label: 'Another label' });

    const content = node.domElement.querySelector('.node-content');
    expect(content?.innerHTML).toBe(markup);
  });

  it('should fall back to the label when the node carries no markup', () => {
    const node = new HtmlNode(sg as any, { id: 'u', type: 'HtmlNode', label: 'Label' } as any);

    node.updateSpec({ label: 'Another label' });

    const content = node.domElement.querySelector('.node-content');
    expect(content?.textContent).toBe('Another label');
  });
});
