import { DOMNode } from './DOMNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

let katexPromise: Promise<any> | null = null;
let katexCssLoaded = false;

// Async load KaTeX to avoid hard dependency bundled
async function loadKatex() {
    if (!katexCssLoaded && typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
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
        const div = document.createElement('div');
        super(sg, spec, div, 200, 100, { opacity: 0.0 });

        if (spec.data?.math) {
            this.mathContent = spec.data.math;
        }

        this.domElement = document.createElement('div');
        this.domElement.className = 'spacegraph-math-node';
        this.domElement.style.backgroundColor = spec.data?.color || 'rgba(0, 0, 0, 0.8)';
        this.domElement.style.color = '#fff';
        this.domElement.style.border = '2px solid #555';
        this.domElement.style.borderRadius = '8px';
        this.domElement.style.padding = '15px';
        this.domElement.style.display = 'flex';
        this.domElement.style.justifyContent = 'center';
        this.domElement.style.alignItems = 'center';
        this.domElement.style.fontSize = spec.data?.fontSize ? `${spec.data.fontSize}px` : '24px';
        this.domElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';

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
            console.error('[MathNode] Failed to render LaTeX', e);
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
