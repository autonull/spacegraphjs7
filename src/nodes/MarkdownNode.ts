import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

import { createLogger } from '../utils/logger';
import { BaseContentNode } from './BaseContentNode';

const logger = createLogger('MarkdownNode');

export class MarkdownNode extends BaseContentNode {
  static readonly typeName: string = 'MarkdownNode';
  private _ro?: ResizeObserver;
  private contentElement: HTMLElement;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    const w = (spec.data?.width as number) ?? 300;
    const color = (spec.data?.color as string) ?? '#1e293b';
    const txtColor = (spec.data?.textColor as string) ?? '#f1f5f9';
    const md = (spec.data?.markdown as string) ?? spec.label ?? '';
    const h = Math.max(100, (md as string).split('\n').length * 20 + 32);

    super(sg, spec, {
      defaultWidth: w,
      defaultHeight: h,
      materialParams: { visible: false },
      className: 'sg-markdown-node sg-node',
      customStyles: {
        background: color,
        color: txtColor,
        padding: '16px',
        fontSize: '14px',
        lineHeight: '1.5',
        overflow: 'auto',
        border: '1px solid rgba(255,255,255,0.2)',
      },
    });

    const style = DOMUtils.createElement('style');
    style.textContent = `
            .sg-markdown-node h1, .sg-markdown-node h2, .sg-markdown-node h3 { margin-top: 0; }
            .sg-markdown-node a { color: #60a5fa; text-decoration: none; }
            .sg-markdown-node a:hover { text-decoration: underline; }
            .sg-markdown-node code { background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
            .sg-markdown-node pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; }
            .sg-markdown-node blockquote { border-left: 4px solid #475569; margin: 0; padding-left: 12px; color: #cbd5e1; }
            .sg-markdown-node img { max-width: 100%; border-radius: 4px; }
        `;
    this.domElement.appendChild(style);

    const contentDiv = DOMUtils.createElement('div');
    this.domElement.appendChild(contentDiv);
    this.contentElement = contentDiv;

    this._renderMarkdown(md);

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const rect = entry.contentRect;
          if (rect.height > 0 && rect.width > 0) {
            const w = Math.max(rect.width, (this.data?.width as number) ?? 300);
            this.updateBackingGeometry(w, rect.height);
          }
        }
      });
      ro.observe(this.domElement);
      this._ro = ro;
    } else {
      this._syncGeometryToContent(h);
    }
  }

  private _renderMarkdown(markdown: string, afterRender?: () => void): void {
    this.contentElement.innerHTML = 'Loading markdown...';
    import('marked')
      .then(({ marked }) => {
        this.contentElement.innerHTML = marked.parse(markdown) as string;
        afterRender?.();
      })
      .catch((err) => {
        this.contentElement.innerHTML = 'Failed to load markdown renderer';
        logger.error('Failed to load marked:', err);
      });
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);

    if (updates.data) {
      if (updates.data.width !== undefined) {
        this.domElement.style.width = `${updates.data.width}px`;
      }
      if (updates.data.color !== undefined) {
        this.domElement.style.background = updates.data.color as string;
      }
      if (updates.data.textColor !== undefined) {
        this.domElement.style.color = updates.data.textColor as string;
      }
    }

    if (updates.data?.markdown !== undefined || updates.label !== undefined) {
      const md = (updates.data?.markdown as string) ?? updates.label ?? '';
      this._renderMarkdown(md, () => this._syncGeometryToContent());
    }
    return this;
  }

  // Always trigger geometry update after markdown content changes
  // This ensures the backing geometry is updated whether or not ResizeObserver is available
  private _syncGeometryToContent(unchangedHeight?: number): void {
    setTimeout(() => {
      const actualHeight = this.domElement.offsetHeight;
      if (actualHeight <= 0) return;
      if (actualHeight === unchangedHeight) return;
      this.updateBackingGeometry((this.data?.width as number) ?? 300, actualHeight);
    }, 50);
  }

  dispose(): void {
    this._ro?.disconnect();
    super.dispose();
  }
}
