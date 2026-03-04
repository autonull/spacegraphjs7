import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * VideoNode — Displays an HTML5 video as a Three.js texture on a plane.
 *
 * data options:
 *   src      : video URL (required)
 *   width    : world-space width  (default 320)
 *   height   : world-space height (default 180)
 *   autoplay : boolean (default true)
 *   loop     : boolean (default true)
 *   muted    : boolean (default true — required for autoplay in most browsers)
 */
export class VideoNode extends Node {
    public videoEl: HTMLVideoElement;
    private texture: THREE.VideoTexture;
    private plane: THREE.Mesh;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const src = spec.data?.src ?? '';
        const w = spec.data?.width ?? 320;
        const h = spec.data?.height ?? 180;
        const autoplay = spec.data?.autoplay !== false;
        const loop = spec.data?.loop !== false;
        const muted = spec.data?.muted !== false;

        this.videoEl = document.createElement('video');
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
        this.object.add(this.plane);

        if (autoplay) {
            this.videoEl.play().catch(() => {
                console.warn(
                    `[VideoNode] Autoplay blocked for node "${spec.id}". User interaction required.`,
                );
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

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        if (updates.data?.src && updates.data.src !== this.videoEl.src) {
            this.videoEl.src = updates.data.src;
            this.videoEl.load();
            if (updates.data?.autoplay !== false) this.videoEl.play();
        }
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
