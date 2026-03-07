import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { marked } from 'marked';

/**
 * MarkdownNode — Renders Markdown text as HTML within a CSS3D panel.
 *
 * data options:
 *   markdown : markdown string to render
 *   width    : pixel width (default 300)
 *   color    : background colour (default '#1e293b')
 *   textColor: CSS text colour (default '#f1f5f9')
 */
export class MarkdownNode extends DOMNode { // Changed base class to DOMNode
    // domElement, cssObject, and backing are now handled by DOMNode
    // public domElement: HTMLDivElement;
    // public cssObject: CSS3DObject;
    // private backing: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 300;
        const color = spec.data?.color ?? '#1e293b';
        const txtColor = spec.data?.textColor ?? '#f1f5f9';
        const md = spec.data?.markdown ?? spec.label ?? '';

        // Create the div element and apply initial styles
        const div = document.createElement('div');
        div.className = 'sg-markdown-node sg-node';
        Object.assign(div.style, {
            width: `${w}px`,
            padding: '16px',
            background: color,
            color: txtColor,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            lineHeight: '1.5',
            boxSizing: 'border-box',
            overflow: 'auto',
            pointerEvents: 'auto',
        });

        // Add some basic styling for markdown elements
        const style = document.createElement('style');
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

        const contentDiv = document.createElement('div');
        div.appendChild(contentDiv);

        // Approximate height based on content for initial backing plane
        contentDiv.innerHTML = marked.parse(md) as string;
        const h = Math.max(100, md.split('\n').length * 20 + 32);

        // Call DOMNode constructor
        super(sg, spec, div, w, h, { visible: false });

        // After DOM mounts, we could measure and adjust the backing plane,
        // but for now we rely on a rough heuristic.
        setTimeout(() => {
            const actualHeight = this.domElement.offsetHeight || h;
            if (actualHeight !== h && actualHeight > 0) {
                this.updateBackingGeometry(w, actualHeight);
            }
        }, 50);
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.markdown !== undefined || updates.label !== undefined) {
            const md = updates.data?.markdown ?? updates.label ?? '';
            const contentDiv = this.domElement.querySelector('div');
            if (contentDiv) {
                contentDiv.innerHTML = marked.parse(md) as string;

                // Readjust backing plane height
                setTimeout(() => {
                    const actualHeight = this.domElement.offsetHeight;
                    if (actualHeight > 0) {
                        const w = this.data?.width ?? 300;
                        this.updateBackingGeometry(w, actualHeight);
                    }
                }, 50);
            }
        }
    }

    // dispose() is handled entirely by DOMNode!
}
