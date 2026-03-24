import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export class HtmlNode extends DOMNode {
    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const width = spec.data?.width || 200;
        const height = spec.data?.height || 100;
        const div = DOMUtils.createElement('div');
        super(sg, spec, div, width, height, { visible: false });

        this.domElement.className = `spacegraph-html-node ${spec.data?.className || ''}`;

        this.setupContainerStyles(width, height, 'dark', {
            backgroundColor: spec.data?.color || 'rgba(51, 102, 255, 0.8)',
            color: 'white',
            border: '2px solid white',
            padding: '10px',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: spec.data?.pointerEvents || 'auto',
            ...(spec.data?.style || {})
        });

        // Ensure subclasses don't get the default title/desc if they provide custom HTML logic
        if (this.constructor.name === 'HtmlNode') {
            if (spec.data?.html) {
                // Render custom HTML directly
                this.domElement.innerHTML = spec.data.html;
                // Since innerHTML is replaced, we ensure styling supports it
                Object.assign(this.domElement.style, {
                    display: 'block', // Block is usually better for custom HTML content
                    padding: '0',     // Remove padding if injecting raw HTML
                    border: 'none',
                    backgroundColor: 'transparent'
                });
            } else {
                // Render default label & description
                const titleEl = DOMUtils.createElement('h3');
                Object.assign(titleEl.style, {
                    margin: '0',
                    fontFamily: 'sans-serif',
                    fontSize: '16px'
                });
                titleEl.className = 'html-node-title sg-node-title';
                titleEl.textContent = spec.label || 'HTML Node';

                const descEl = DOMUtils.createElement('p');
                Object.assign(descEl.style, {
                    margin: '5px 0 0',
                    fontFamily: 'sans-serif',
                    fontSize: '12px'
                });
                descEl.className = 'html-node-desc';
                descEl.textContent = spec.data?.description || '';

                this.domElement.appendChild(titleEl);
                this.domElement.appendChild(descEl);
            }
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>) {
        super.updateSpec(updates);

        if (updates.data) {
            if (updates.data.color) {
                this.domElement.style.backgroundColor = updates.data.color;
            }
            if (updates.data.className !== undefined) {
                this.domElement.className = `spacegraph-html-node ${updates.data.className}`;
            }
            if (updates.data.pointerEvents) {
                this.domElement.style.pointerEvents = updates.data.pointerEvents;
            }
            if (updates.data.width || updates.data.height) {
                const w = updates.data.width || this.data.width || 200;
                const h = updates.data.height || this.data.height || 100;
                this.domElement.style.width = `${w}px`;
                this.domElement.style.height = `${h}px`;
                this.updateBackingGeometry(w, h);
            }

            if (this.constructor.name === 'HtmlNode') {
                if (updates.data.html !== undefined) {
                    this.domElement.innerHTML = updates.data.html;
                } else if (updates.data.description !== undefined) {
                    const descEl = this.domElement.querySelector('.html-node-desc');
                    if (descEl) {
                        descEl.textContent = updates.data.description;
                    }
                }
            }
        }

        if (updates.label !== undefined && this.constructor.name === 'HtmlNode' && !this.data.html) {
            const titleEl = this.domElement.querySelector('.html-node-title');
            if (titleEl) {
                titleEl.textContent = updates.label;
            }
        }
    }


}
