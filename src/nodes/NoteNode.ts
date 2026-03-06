import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * NoteNode — Sticky-note style editable text node.
 *
 * data options:
 *   color      : CSS background color (default '#fef08a')
 *   text       : note body text
 *   width      : pixel width  (default 200)
 *   height     : pixel height (default 160)
 *   editable   : boolean — whether text is directly editable (default true)
 */
export class NoteNode extends Node {
    public domElement: HTMLElement;
    public cssObject: CSS3DObject;
    private backing: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const color = spec.data?.color ?? '#fef08a';
        const text = spec.data?.text ?? spec.label ?? '';
        const w = spec.data?.width ?? 200;
        const h = spec.data?.height ?? 160;
        const editable = spec.data?.editable !== false;

        // --- DOM side ---
        this.domElement = document.createElement('div');
        this.domElement.className = 'sg-note-node';
        Object.assign(this.domElement.style, {
            width: `${w}px`,
            height: `${h}px`,
            background: color,
            borderRadius: '4px',
            boxShadow: '2px 4px 12px rgba(0,0,0,0.25)',
            padding: '10px',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            boxSizing: 'border-box',
            userSelect: 'text',
            overflow: 'hidden',
            cursor: editable ? 'text' : 'default',
        } as CSSStyleDeclaration);

        const titleEl = document.createElement('div');
        titleEl.className = 'sg-note-title';
        titleEl.style.fontWeight = 'bold';
        titleEl.style.marginBottom = '6px';
        titleEl.style.fontSize = '13px';
        titleEl.style.color = '#555';
        titleEl.textContent = spec.label ?? 'Note';

        const bodyEl = document.createElement('div');
        bodyEl.className = 'sg-note-body';
        bodyEl.style.whiteSpace = 'pre-wrap';
        bodyEl.style.wordBreak = 'break-word';
        bodyEl.textContent = text;
        if (editable) {
            bodyEl.contentEditable = 'true';
            bodyEl.style.outline = 'none';
        }

        this.domElement.appendChild(titleEl);
        this.domElement.appendChild(bodyEl);

        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        // Transparent backing plane for raycasting
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        this.backing = new THREE.Mesh(geo, mat);
        this.object.add(this.backing);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.label !== undefined) {
            const el = this.domElement.querySelector('.sg-note-title');
            if (el) el.textContent = updates.label ?? '';
        }
        if (updates.data?.text !== undefined) {
            const el = this.domElement.querySelector('.sg-note-body');
            if (el) el.textContent = updates.data.text;
        }
        if (updates.data?.color) {
            this.domElement.style.background = updates.data.color;
        }
    }

    /** Programmatically read the current note body text (may have been edited inline). */
    getText(): string {
        return (this.domElement.querySelector('.sg-note-body') as HTMLElement)?.innerText ?? '';
    }

    dispose(): void {
        this.domElement.parentNode?.removeChild(this.domElement);
        this.backing.geometry.dispose();
        (this.backing.material as THREE.Material).dispose();
        super.dispose();
    }
}
