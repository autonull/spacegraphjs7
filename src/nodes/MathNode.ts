import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
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

export class MathNode extends Node {
    public domElement: HTMLElement;
    public cssObject: CSS3DObject;
    private mathContent: string = '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}';

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

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

        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        // Optional backing mesh
        const meshGeometry = new THREE.PlaneGeometry(200, 100);
        const meshMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
        this.object.add(mesh);

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

    dispose(): void {
        if (this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
        }
        super.dispose();
    }
}
