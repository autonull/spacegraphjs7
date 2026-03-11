import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';


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
        contentDiv.innerHTML = 'Loading markdown...';
        import('marked').then(({ marked }) => {
            contentDiv.innerHTML = marked.parse(md) as string;
        }).catch(err => {
            contentDiv.innerHTML = 'Failed to load markdown renderer';
            console.error(err);
        });
        const h = Math.max(100, md.split('\n').length * 20 + 32);

        // Call DOMNode constructor
        super(sg, spec, div, w, h, { visible: false });

        // Setup ResizeObserver to properly resize backing plane when content changes bounds
        // This is much safer than heuristic setTimeouts.
        if (typeof ResizeObserver !== 'undefined') {
             const ro = new ResizeObserver(entries => {
                 for (const entry of entries) {
                     const rect = entry.contentRect;
                     if (rect.height > 0 && rect.width > 0) {
                         // Ensure min width
                         const w = Math.max(rect.width, this.data?.width ?? 300);
                         this.updateBackingGeometry(w, rect.height);
                     }
                 }
             });
             ro.observe(this.domElement);
             // Store ref so we can disconnect if needed in dispose, though DOM removal often handles it
             (this as any)._ro = ro;
        } else {
             // Fallback for environments without ResizeObserver
             setTimeout(() => {
                 const actualHeight = this.domElement.offsetHeight || h;
                 if (actualHeight !== h && actualHeight > 0) {
                     this.updateBackingGeometry(w, actualHeight);
                 }
             }, 50);
        }
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);

        if (updates.data) {
             if (updates.data.width !== undefined) {
                 this.domElement.style.width = `${updates.data.width}px`;
             }
             if (updates.data.color !== undefined) {
                 this.domElement.style.background = updates.data.color;
             }
             if (updates.data.textColor !== undefined) {
                 this.domElement.style.color = updates.data.textColor;
             }
        }

        if (updates.data?.markdown !== undefined || updates.label !== undefined) {
            const md = updates.data?.markdown ?? updates.label ?? '';
            // Get the inner div without the style tag
            const contentDiv = Array.from(this.domElement.children).find(el => el.tagName.toLowerCase() === 'div');
            if (contentDiv) {
                import('marked').then(({ marked }) => {
                    contentDiv.innerHTML = marked.parse(md) as string;

                    // If no resize observer, fallback readjustment
                    if (typeof ResizeObserver === 'undefined') {
                        setTimeout(() => {
                            const actualHeight = this.domElement.offsetHeight;
                            if (actualHeight > 0) {
                                const w = this.data?.width ?? 300;
                                this.updateBackingGeometry(w, actualHeight);
                            }
                        }, 50);
                    }
                }).catch(err => {
                    contentDiv.innerHTML = 'Failed to load markdown renderer';
                    console.error(err);
                });
            }
        }
    }

    dispose(): void {
         if ((this as any)._ro) {
             (this as any)._ro.disconnect();
         }
         super.dispose();
    }

    // dispose() is handled entirely by DOMNode!
}
