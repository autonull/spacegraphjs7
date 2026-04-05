import { DOMUtils } from '../utils/DOMUtils';
import { createLogger } from '../utils/logger';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { BaseContentNode } from './BaseContentNode';

const logger = createLogger('MathNode');

let katexPromise: Promise<unknown> | null = null;
let katexCssLoaded = false;

async function loadKatex() {
    if (!katexCssLoaded && typeof document !== 'undefined') {
        const link = DOMUtils.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/pnpm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(link);
        katexCssLoaded = true;
    }

    if (katexPromise) return katexPromise;

    katexPromise = import('katex').then((m) => m.default ?? m);
    return katexPromise;
}

export class MathNode extends BaseContentNode {
    private mathContent: string = '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec, {
            defaultWidth: 300,
            defaultHeight: 100,
            materialParams: { opacity: 0.0 },
            className: 'spacegraph-math-node',
            customStyles: {
                backgroundColor: (spec.data?.color as string) ?? 'rgba(0, 0, 0, 0.8)',
                border: '2px solid #555',
                padding: '15px',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: spec.data?.fontSize ? `${spec.data.fontSize}px` : '24px',
            },
            updatePositionOnInit: true,
        });

        if (spec.data?.math) {
            this.mathContent = spec.data.math as string;
        }

        this.domElement.textContent = 'Loading Math...';
        this.renderMath();
    }

    private async renderMath() {
        try {
            const katex = await loadKatex();
            (
                katex as {
                    render: (math: string, el: HTMLElement, opts: Record<string, unknown>) => void;
                }
            ).render(this.mathContent, this.domElement, {
                throwOnError: false,
                displayMode: true,
                output: 'html',
            });
        } catch (e) {
            logger.error('Failed to render LaTeX:', e);
            this.domElement.textContent = this.mathContent;
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        let needsRender = false;

        if (updates.data) {
            if (updates.data.color) {
                this.domElement.style.backgroundColor = updates.data.color as string;
            }
            if (updates.data.fontSize) {
                this.domElement.style.fontSize = `${updates.data.fontSize as number}px`;
            }
            if (updates.data.math && updates.data.math !== this.mathContent) {
                this.mathContent = updates.data.math as string;
                needsRender = true;
            }
        }

        if (needsRender) {
            this.renderMath();
        }
        return this;
    }
}
