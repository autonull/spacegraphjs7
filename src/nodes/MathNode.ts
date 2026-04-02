import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MathNode');

let katexPromise: Promise<any> | null = null;
let katexCssLoaded = false;

// Async load KaTeX to avoid hard dependency bundled
async function loadKatex() {
    if (!katexCssLoaded && typeof document !== 'undefined') {
        const link = DOMUtils.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/pnpm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);
        katexCssLoaded = true;
    }

    if (katexPromise) return katexPromise;

    katexPromise = import('katex').then(m => m.default || m);
    return katexPromise;
}

export class MathNode extends DOMNode {
    private mathContent: string = '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const div = DOMUtils.createElement('div');

        const w = spec.data?.width || 300;
        const h = spec.data?.height || 100;

        // Pass div into DOMNode correctly and specify base size
        super(sg, spec, div, w, h, { opacity: 0.0 });

        if (spec.data?.math) {
            this.mathContent = spec.data.math;
        }

        this.domElement.className = 'spacegraph-math-node';

        this.setupContainerStyles(w, h, 'dark', {
            backgroundColor: spec.data?.color || 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #555',
            padding: '15px',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: spec.data?.fontSize ? `${spec.data.fontSize}px` : '24px',
        });

        this.domElement.textContent = 'Loading Math...';

        this.renderMath();

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private async renderMath() {
        try {
            const katex = await loadKatex();
            katex.render(this.mathContent, this.domElement, {
                throwOnError: false,
                displayMode: true,
                output: 'html'
            });
        } catch (e) {
            logger.error('Failed to render LaTeX:', e);
            this.domElement.textContent = this.mathContent;
        }
    }

    updateSpec(updates: Partial<NodeSpec>) {
        super.updateSpec(updates);

        let needsRender = false;

        if (updates.data) {
            if (updates.data.color) {
                this.domElement.style.backgroundColor = updates.data.color;
            }
            if (updates.data.fontSize) {
                this.domElement.style.fontSize = `${updates.data.fontSize}px`;
            }
            if (updates.data.math && updates.data.math !== this.mathContent) {
                this.mathContent = updates.data.math;
                needsRender = true;
            }
        }

        if (needsRender) {
            this.renderMath();
        }
    }


}
