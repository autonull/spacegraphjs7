import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { DOMNode } from './DOMNode';

export class IFrameNode extends DOMNode {
    public iframeEl: HTMLIFrameElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = (spec.data?.width as number) ?? 480;
        const h = (spec.data?.height as number) ?? 320;
        const iframe = DOMUtils.createElement('iframe');
        super(sg, spec, iframe, w, h, { visible: false });

        const src = (spec.data?.src as string) ?? 'about:blank';
        const allow = (spec.data?.allow as string) ?? '';

        this.iframeEl = iframe;
        this.iframeEl.src = src;
        this.iframeEl.allow = allow;
        this.iframeEl.sandbox?.add?.('allow-scripts', 'allow-same-origin', 'allow-forms');
        this.setupContainerStyles(w, h, 'dark', {
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            background: '#0a0a0a',
            display: 'block',
        });

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    navigate(url: string): void {
        this.iframeEl.src = url;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.src) this.navigate(updates.data.src as string);

        if (updates.data?.width || updates.data?.height) {
            const w = (updates.data.width as number) ?? (this.data?.width as number) ?? 480;
            const h = (updates.data.height as number) ?? (this.data?.height as number) ?? 320;
            this.iframeEl.style.width = `${w}px`;
            this.iframeEl.style.height = `${h}px`;
            this.updateBackingGeometry(w, h);
        }
        return this;
    }

    dispose(): void {
        this.iframeEl.src = 'about:blank';
        super.dispose();
    }
}
