import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class AudioNode extends Node {
    public domElement: HTMLElement;
    public cssObject: CSS3DObject;
    public audioElement: HTMLAudioElement;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this.domElement = document.createElement('div');
        this.domElement.className = 'spacegraph-audio-node';
        this.domElement.style.width = '300px';
        this.domElement.style.backgroundColor = spec.data?.color || 'rgba(30, 30, 30, 0.9)';
        this.domElement.style.color = '#fff';
        this.domElement.style.border = '1px solid #444';
        this.domElement.style.borderRadius = '12px';
        this.domElement.style.padding = '15px';
        this.domElement.style.boxShadow = '0 8px 16px rgba(0,0,0,0.5)';
        this.domElement.style.display = 'flex';
        this.domElement.style.flexDirection = 'column';
        this.domElement.style.alignItems = 'center';
        this.domElement.style.gap = '10px';

        const titleEl = document.createElement('h4');
        titleEl.style.margin = '0';
        titleEl.style.fontFamily = 'system-ui, sans-serif';
        titleEl.style.fontSize = '14px';
        titleEl.className = 'audio-node-title';
        titleEl.textContent = spec.label || 'Audio Player';

        this.audioElement = document.createElement('audio');
        this.audioElement.controls = true;
        this.audioElement.style.width = '100%';
        if (spec.data?.src) {
            this.audioElement.src = spec.data.src;
        }

        this.domElement.appendChild(titleEl);
        this.domElement.appendChild(this.audioElement);

        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        // Optional backing mesh for WebGL raycasting
        const meshGeometry = new THREE.PlaneGeometry(300, 100);
        const meshMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
        this.object.add(mesh);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    updateSpec(updates: Partial<NodeSpec>) {
        super.updateSpec(updates);

        if (updates.label !== undefined) {
            const titleEl = this.domElement.querySelector('.audio-node-title');
            if (titleEl) {
                titleEl.textContent = updates.label || 'Audio Player';
            }
        }

        if (updates.data) {
            if (updates.data.color) {
                this.domElement.style.backgroundColor = updates.data.color;
            }
            if (updates.data.src && updates.data.src !== this.audioElement.src) {
                this.audioElement.src = updates.data.src;
            }
            if (updates.data.autoplay !== undefined) {
                this.audioElement.autoplay = updates.data.autoplay;
            }
            if (updates.data.loop !== undefined) {
                this.audioElement.loop = updates.data.loop;
            }
        }
    }

    dispose(): void {
        this.audioElement.pause();
        this.audioElement.removeAttribute('src');
        this.audioElement.load();

        if (this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
        }
        super.dispose();
    }
}
