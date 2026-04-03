import * as THREE from 'three';

import { Node } from './Node';
import { DOMUtils } from '../utils/DOMUtils';
import { createLogger } from '../utils/logger';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

const logger = createLogger('VideoNode');

export class VideoNode extends Node {
    private _object = new THREE.Object3D();
    get object(): THREE.Object3D { return this._object; }

    public videoEl: HTMLVideoElement;
    private texture: THREE.VideoTexture;
    private plane: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const src = (spec.data?.src as string) ?? '';
        const w = (spec.data?.width as number) ?? 320;
        const h = (spec.data?.height as number) ?? 180;
        const autoplay = spec.data?.autoplay !== false;
        const loop = spec.data?.loop !== false;
        const muted = spec.data?.muted !== false;

        this.videoEl = DOMUtils.createElement('video');
        this.videoEl.src = src;
        this.videoEl.loop = loop;
        this.videoEl.muted = muted;
        this.videoEl.crossOrigin = 'anonymous';
        this.videoEl.playsInline = true;
        if (autoplay) this.videoEl.autoplay = true;

        this.texture = new THREE.VideoTexture(this.videoEl);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        const geo = new THREE.PlaneGeometry(w, h);
        const mat = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
        this.plane = new THREE.Mesh(geo, mat);
        this._object.add(this.plane);

        if (autoplay) {
            this.videoEl.play().catch(() => {
                logger.warn('Autoplay blocked for node "%s". User interaction required.', spec.id);
            });
        }

        this.updatePosition(this.position.x, this.position.y, this.position.z);
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
        this.texture.dispose();
        this.plane.geometry.dispose();
        (this.plane.material as THREE.Material).dispose();
        super.dispose();
    }
}
