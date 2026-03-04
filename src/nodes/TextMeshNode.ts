import * as THREE from 'three';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

/**
 * TextMeshNode — Billboard sprite-based large text node.
 *
 * Note: THREE.TextGeometry requires a font loader. This node uses a high-res
 * canvas sprite as a pragmatic cross-env alternative, giving the same visual
 * effect (prominent 3-D style text) without requiring font file loading.
 * If you need true 3-D extruded text, swap in TextGeometry + FontLoader here.
 *
 * data options:
 *   text       : string to display (falls back to spec.label)
 *   fontSize   : px for the canvas text (default 72)
 *   color      : CSS color (default '#ffffff')
 *   background : CSS background (default 'transparent')
 *   scale      : world-space scale multiplier (default 1)
 */
export class TextMeshNode extends Node {
    private sprite: THREE.Sprite;
    private spriteMat: THREE.SpriteMaterial;
    private currentText: string;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        this.currentText = spec.data?.text ?? spec.label ?? '';
        this.sprite = this._buildSprite(spec);
        this.spriteMat = this.sprite.material as THREE.SpriteMaterial;
        this.object.add(this.sprite);

        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    private _buildSprite(spec: Partial<NodeSpec>): THREE.Sprite {
        const text = spec.data?.text ?? spec.label ?? '';
        const fontSize = spec.data?.fontSize ?? 72;
        const color = spec.data?.color ?? '#ffffff';
        const background = spec.data?.background ?? 'transparent';
        const scale = spec.data?.scale ?? 1;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const padding = 20;

        if (ctx) {
            ctx.font = `bold ${fontSize}px sans-serif`;
            const measured = ctx.measureText(text);
            canvas.width = measured.width + padding * 2;
            canvas.height = fontSize * 1.4 + padding * 2;

            if (background !== 'transparent') {
                ctx.fillStyle = background;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        } else {
            // Fallback dimensions for jsdom / SSR environments
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

    updateSpec(updates: Partial<NodeSpec>): void {
        super.updateSpec(updates);
        const newText = updates.data?.text ?? updates.label ?? null;
        if (newText !== null && newText !== this.currentText) {
            this.currentText = newText;
            // Rebuild sprite
            this.object.remove(this.sprite);
            if (this.spriteMat.map) this.spriteMat.map.dispose();
            this.spriteMat.dispose();
            // Merge previous data with updates
            const merged = {
                data: { ...this.data, ...updates.data },
                label: updates.label ?? this.label,
            };
            this.sprite = this._buildSprite(merged);
            this.spriteMat = this.sprite.material as THREE.SpriteMaterial;
            this.object.add(this.sprite);
        }
    }

    dispose(): void {
        if (this.spriteMat.map) this.spriteMat.map.dispose();
        this.spriteMat.dispose();
        super.dispose();
    }
}
