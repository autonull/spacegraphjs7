import { DOMNode } from './DOMNode';
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
export class IFrameNode extends DOMNode {
    public iframeEl: HTMLIFrameElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = spec.data?.width ?? 480;
        const h = spec.data?.height ?? 320;
        const iframe = document.createElement('iframe');
        super(sg, spec, iframe, w, h, { visible: false });

        const src = spec.data?.src ?? 'about:blank';
        const allow = spec.data?.allow ?? '';

        this.iframeEl = iframe;
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
        super.dispose();
    }
}
