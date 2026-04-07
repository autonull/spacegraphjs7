import * as THREE from 'three';

import { Node } from './Node';
import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export class TextMeshNode extends Node {
    private _object = new THREE.Object3D();
    get object() {
        return this._object;
    }

    private sprite: THREE.Sprite;
    private spriteMat: THREE.SpriteMaterial;
    private currentText: string;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this.currentText = (spec.data?.text as string) ?? spec.label ?? '';
        this.sprite = this._buildSprite(spec);
        this.spriteMat = this.sprite.material as THREE.SpriteMaterial;
        this._object.add(this.sprite);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private _buildSprite(spec: Partial<NodeSpec>): THREE.Sprite {
        const text = (spec.data?.text as string) ?? spec.label ?? '';
        const fontSize = (spec.data?.fontSize as number) ?? 72;
        const color = (spec.data?.color as string) ?? '#ffffff';
        const background = (spec.data?.background as string) ?? 'transparent';
        const scale = (spec.data?.scale as number) ?? 1;

        const canvas = DOMUtils.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const padding = 20;

        if (ctx) {
            ctx.font = `bold ${fontSize}px sans-serif`;
            const measured = ctx.measureText(text);
            canvas.width = measured.width + padding * 2;
            canvas.height = fontSize * 1.4 + padding * 2;

            if (background !== 'transparent') {
                ctx.fillStyle = background as string | CanvasGradient | CanvasPattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = color as string | CanvasGradient | CanvasPattern;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        } else {
            canvas.width = Math.max(64, text.length * fontSize * 0.6 + padding * 2);
            canvas.height = fontSize * 1.4 + padding * 2;
        }

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
        const spr = new THREE.Sprite(mat);
        const aspect = canvas.width / canvas.height || 1;
        spr.scale.set(aspect * fontSize * scale * 0.8, fontSize * scale * 0.8, 1);
        return spr;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        const newText = (updates.data?.text as string) ?? updates.label ?? null;
        if (newText !== null && newText !== this.currentText) {
            this.currentText = newText;
            this._object.remove(this.sprite);
            this.spriteMat.map?.dispose();
            this.spriteMat.dispose();
            const merged = {
                data: { ...this.data, ...updates.data },
                label: updates.label ?? this.label,
            };
            this.sprite = this._buildSprite(merged);
            this.spriteMat = this.sprite.material as THREE.SpriteMaterial;
            this._object.add(this.sprite);
        }
        return this;
    }

    dispose(): void {
        this.spriteMat.map?.dispose();
        this.spriteMat.dispose();
        super.dispose();
    }
}
