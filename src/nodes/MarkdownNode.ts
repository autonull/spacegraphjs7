import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import { Node } from './Node';
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
export class MarkdownNode extends Node {
    public domElement: HTMLDivElement;
    public cssObject: CSS3DObject;
    private backing: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const w = spec.data?.width ?? 300;
        const color = spec.data?.color ?? '#1e293b';
        const txtColor = spec.data?.textColor ?? '#f1f5f9';
        const md = spec.data?.markdown ?? spec.label ?? '';

        this.domElement = document.createElement('div');
        this.domElement.className = 'sg-markdown-node sg-node';
        Object.assign(this.domElement.style, {
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
        this.domElement.appendChild(style);

        const contentDiv = document.createElement('div');
        this.domElement.appendChild(contentDiv);

        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        // Approximate height based on content
        contentDiv.innerHTML = marked.parse(md) as string;

        // Note: In CSS3D we need a backing plane for raycasting
        const h = Math.max(100, md.split('\n').length * 20 + 32);
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        this.backing = new THREE.Mesh(geo, mat);
        this.object.add(this.backing);

        this.updatePosition(this.position.x, this.position.y, this.position.z);

        // After DOM mounts, we could measure and adjust the backing plane,
        // but for now we rely on a rough heuristic.
        setTimeout(() => {
            const actualHeight = this.domElement.offsetHeight || h;
            if (actualHeight !== h && actualHeight > 0) {
                this.backing.geometry.dispose();
                this.backing.geometry = new THREE.PlaneGeometry(w, actualHeight);
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
                        this.backing.geometry.dispose();
                        this.backing.geometry = new THREE.PlaneGeometry(w, actualHeight);
                    }
                }, 50);
            }
        }
    }

    dispose(): void {
        this.backing.geometry.dispose();
        (this.backing.material as THREE.Material).dispose();
        super.dispose();
    }
}
