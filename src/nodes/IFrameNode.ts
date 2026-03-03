import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * IFrameNode — Embeds a web page inside a CSS3D iframe.
 *
 * Important: Cross-origin pages will be blocked by browsers unless they allow
 * embedding via X-Frame-Options / CSP. Best used with same-origin content or
 * sandboxed local pages.
 *
 * data options:
 *   src    : URL to embed (required)
 *   width  : pixel width  (default 480)
 *   height : pixel height (default 320)
 *   allow  : iframe allow attribute (default '')
 */
export class IFrameNode extends Node {
    public iframeEl: HTMLIFrameElement;
    public cssObject: CSS3DObject;
    private backing: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const src = spec.data?.src ?? 'about:blank';
        const w = spec.data?.width ?? 480;
        const h = spec.data?.height ?? 320;
        const allow = spec.data?.allow ?? '';

        this.iframeEl = document.createElement('iframe');
        this.iframeEl.src = src;
        this.iframeEl.allow = allow;
        this.iframeEl.sandbox?.add?.('allow-scripts', 'allow-same-origin', 'allow-forms');
        Object.assign(this.iframeEl.style, {
            width: `${w}px`,
            height: `${h}px`,
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            background: '#0a0a0a',
            display: 'block',
        });

        this.cssObject = new CSS3DObject(this.iframeEl);
        this.object.add(this.cssObject);

        // Backing plane for raycasting / pointer events
        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
        this.backing = new THREE.Mesh(geo, mat);
        this.object.add(this.backing);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    /** Load a new URL. */
    navigate(url: string): void {
        this.iframeEl.src = url;
    }

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.src) this.navigate(updates.data.src);
    }

    dispose(): void {
        this.iframeEl.src = 'about:blank';
        this.iframeEl.parentNode?.removeChild(this.iframeEl);
        this.backing.geometry.dispose();
        (this.backing.material as THREE.Material).dispose();
        super.dispose();
    }
}
