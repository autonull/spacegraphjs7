import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { DOMNode } from './DOMNode';
import { createLogger } from '../utils/logger';

const logger = createLogger('MarkdownNode');

export class MarkdownNode extends DOMNode {
    private _ro?: ResizeObserver;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = (spec.data?.width as number) ?? 300;
        const color = (spec.data?.color as string) ?? '#1e293b';
        const txtColor = (spec.data?.textColor as string) ?? '#f1f5f9';
        const md = (spec.data?.markdown as string) ?? spec.label ?? '';

        const div = DOMUtils.createElement('div', {
            className: 'sg-markdown-node sg-node',
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
        div.appendChild(style);

        const contentDiv = DOMUtils.createElement('div');
        div.appendChild(contentDiv);

        contentDiv.innerHTML = 'Loading markdown...';
        import('marked')
            .then(({ marked }) => {
                contentDiv.innerHTML = marked.parse(md as string) as string;
            })
            .catch((err) => {
                contentDiv.innerHTML = 'Failed to load markdown renderer';
                logger.error('Failed to load marked:', err);
            });
        const h = Math.max(100, (md as string).split('\n').length * 20 + 32);

        super(sg, spec, div, w, h, { visible: false });

        this.setupContainerStyles(w, h, 'dark', {
            background: color,
            color: txtColor,
            padding: '16px',
            fontSize: '14px',
            lineHeight: '1.5',
            overflow: 'auto',
            border: '1px solid rgba(255,255,255,0.2)',
        });

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
            setTimeout(() => {
                const actualHeight = this.domElement.offsetHeight ?? h;
                if (actualHeight !== h && actualHeight > 0) {
                    this.updateBackingGeometry(w, actualHeight);
                }
            }, 50);
        }
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
            const contentDiv = Array.from(this.domElement.children).find(
                (el) => el.tagName.toLowerCase() === 'div',
            );
            if (contentDiv) {
                import('marked')
                    .then(({ marked }) => {
                        contentDiv.innerHTML = marked.parse(md as string) as string;

                        if (typeof ResizeObserver === 'undefined') {
                            setTimeout(() => {
                                const actualHeight = this.domElement.offsetHeight;
                                if (actualHeight > 0) {
                                    const w = (this.data?.width as number) ?? 300;
                                    this.updateBackingGeometry(w, actualHeight);
                                }
                            }, 50);
                        }
                    })
                    .catch((err) => {
                        contentDiv.innerHTML = 'Failed to load markdown renderer';
                        logger.error('Failed to load marked:', err);
                    });
            }
        }
        return this;
    }

    dispose(): void {
        this._ro?.disconnect();
        super.dispose();
    }
}
