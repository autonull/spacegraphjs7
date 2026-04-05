import * as THREE from 'three';
import { TexturedMeshNode } from './TexturedMeshNode';
import { createElement } from '../utils/DOMUtils';
import { createLogger } from '../utils/logger';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

const logger = createLogger('VideoNode');

export class VideoNode extends TexturedMeshNode {
    public videoEl: HTMLVideoElement;
    private videoTexture: THREE.VideoTexture;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const w = (spec.data?.width as number) ?? 320;
        const h = (spec.data?.height as number) ?? 180;
        super(sg, spec, w, h);

        const src = (spec.data?.src as string) ?? '';
        const autoplay = spec.data?.autoplay !== false;
        const loop = spec.data?.loop !== false;
        const muted = spec.data?.muted !== false;

        this.videoEl = createElement('video');
        this.videoEl.src = src;
        this.videoEl.loop = loop;
        this.videoEl.muted = muted;
        this.videoEl.crossOrigin = 'anonymous';
        this.videoEl.playsInline = true;
        if (autoplay) this.videoEl.autoplay = true;

        this.videoTexture = new THREE.VideoTexture(this.videoEl);
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
        this.setTexture(this.videoTexture);

        if (autoplay) {
            this.videoEl.play().catch(() => {
                logger.warn('Autoplay blocked for node "%s". User interaction required.', spec.id);
            });
        }
    }

    play() {
        this.videoEl.play();
    }
    pause() {
        this.videoEl.pause();
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data?.src && (updates.data.src as string) !== this.videoEl.src) {
            this.videoEl.src = updates.data.src as string;
            this.videoEl.load();
            if (updates.data?.autoplay !== false) this.videoEl.play();
        }
        return this;
    }

    dispose(): void {
        this.videoEl.pause();
        this.videoEl.src = '';
        this.videoEl.load();
        this.videoTexture.dispose();
        super.dispose();
    }
}
