import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

import { BaseContentNode } from './BaseContentNode';

export class AudioNode extends BaseContentNode {
    public audioElement: HTMLAudioElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec, {
            defaultWidth: 300,
            defaultHeight: 100,
            materialParams: { opacity: 0.0 },
            className: 'spacegraph-audio-node',
            customStyles: {
                backgroundColor: (spec.data?.color as string) ?? 'rgba(30, 30, 30, 0.9)',
                border: '1px solid #444',
                borderRadius: '12px',
                padding: '15px',
                alignItems: 'center',
                gap: '10px',
            },
            updatePositionOnInit: true,
        });

        const titleEl = DOMUtils.createElement('h4');
        titleEl.style.margin = '0';
        titleEl.style.fontFamily = 'system-ui, sans-serif';
        titleEl.style.fontSize = '14px';
        titleEl.className = 'audio-node-title sg-node-title';
        titleEl.textContent = spec.label ?? 'Audio Player';

        this.audioElement = DOMUtils.createElement('audio');
        this.audioElement.controls = true;
        this.audioElement.style.width = '100%';
        if (spec.data?.src) this.audioElement.src = spec.data.src as string;
        if (spec.data?.autoplay !== undefined)
            this.audioElement.autoplay = spec.data.autoplay as boolean;
        if (spec.data?.loop !== undefined) this.audioElement.loop = spec.data.loop as boolean;

        this.domElement.appendChild(titleEl);
        this.domElement.appendChild(this.audioElement);
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);

        if (updates.label !== undefined) {
            const titleEl = this.domElement.querySelector('.audio-node-title');
            if (titleEl) titleEl.textContent = updates.label ?? 'Audio Player';
        }

        if (updates.data) {
            if (updates.data.color)
                this.domElement.style.backgroundColor = updates.data.color as string;
            if (updates.data.src && updates.data.src !== this.audioElement.src) {
                this.audioElement.src = updates.data.src as string;
            }
            if (updates.data.autoplay !== undefined)
                this.audioElement.autoplay = updates.data.autoplay as boolean;
            if (updates.data.loop !== undefined)
                this.audioElement.loop = updates.data.loop as boolean;
        }

        return this;
    }

    dispose(): void {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
        this.audioElement.load();
        super.dispose();
    }
}
