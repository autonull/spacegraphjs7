import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { BaseContentNode } from './BaseContentNode';

export class IFrameNode extends BaseContentNode {
    public iframeEl: HTMLIFrameElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec, {
            tag: 'iframe',
            defaultWidth: 480,
            defaultHeight: 320,
            materialParams: { visible: false },
            customStyles: {
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                background: '#0a0a0a',
                display: 'block',
            },
            updatePositionOnInit: true,
        });

        const src = (spec.data?.src as string) ?? 'about:blank';
        const allow = (spec.data?.allow as string) ?? '';

        this.iframeEl = this.domElement as HTMLIFrameElement;
        this.iframeEl.src = src;
        this.iframeEl.allow = allow;
        this.iframeEl.sandbox?.add?.('allow-scripts', 'allow-same-origin', 'allow-forms');
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
