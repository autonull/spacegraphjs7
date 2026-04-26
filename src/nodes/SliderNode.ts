import * as THREE from 'three';
import { Node } from './Node';
import type { NodeSpec, BaseNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface SliderNodeData extends BaseNodeData {
    min?: number;
    max?: number;
    value?: number;
    color?: number;
    trackColor?: number;
    thumbColor?: number;
    width?: number;
    height?: number;
    showValue?: boolean;
    onChange?: (value: number) => void;
}

export class SliderNode extends Node {
    private readonly group: THREE.Group;
    private readonly track: THREE.Mesh;
    private readonly thumb: THREE.Mesh;
    private readonly valueLabel: THREE.Mesh;
    private trackMaterial: THREE.MeshStandardMaterial;
    private thumbMaterial: THREE.MeshStandardMaterial;
    private labelMaterial: THREE.MeshBasicMaterial;
    private _isDragging = false;
    private _value = 0.5;
    private min = 0;
    private max = 1;
    private width = 200;
    private height = 20;
    private thumbSize = 20;
    private showValue = true;

    get object(): THREE.Object3D {
        return this.group;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const data = spec.data as SliderNodeData;
        this.width = data?.width ?? 200;
        this.height = data?.height ?? 20;
        this.thumbSize = this.height * 1.5;
        this.min = data?.min ?? 0;
        this.max = data?.max ?? 1;
        this._value = data?.value ?? 0.5;
        const trackColor = data?.trackColor ?? 0x333333;
        const thumbColor = data?.thumbColor ?? 0x4488ff;
        this.showValue = data?.showValue ?? true;

        this.trackMaterial = new THREE.MeshStandardMaterial({ color: trackColor });
        this.thumbMaterial = new THREE.MeshStandardMaterial({ color: thumbColor });
        this.labelMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });

        const trackGeom = new THREE.BoxGeometry(this.width, this.height, 4);
        this.track = new THREE.Mesh(trackGeom, this.trackMaterial);
        this.track.position.z = 0;

        const thumbGeom = new THREE.BoxGeometry(this.thumbSize, this.height, 6);
        this.thumb = new THREE.Mesh(thumbGeom, this.thumbMaterial);
        this.thumb.position.z = 1;
        this.updateThumbPosition();

        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 32;
        const ctx = labelCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.formatValue(this.value), 64, 16);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        this.labelMaterial.map = labelTexture;
        const labelGeom = new THREE.PlaneGeometry(60, 20);
        this.valueLabel = new THREE.Mesh(labelGeom, this.labelMaterial);
        this.valueLabel.position.set(this.width / 2 + 40, 0, 2);

        this.group = new THREE.Group();
        this.group.add(this.track);
        this.group.add(this.thumb);
        this.group.add(this.valueLabel);

this.isTouchable = true;
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    isDraggable(_localPos: THREE.Vector3): boolean {
        return false;
    }

    private formatValue(v: number): string {
        if (Number.isInteger(this.min) && Number.isInteger(this.max)) {
            return Math.round(v).toString();
        }
        return v.toFixed(2);
    }

    private updateValueLabel(): void {
        if (!this.showValue) return;
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.formatValue(this.value), 64, 16);
        (this.labelMaterial.map as THREE.CanvasTexture).dispose();
        this.labelMaterial.map = new THREE.CanvasTexture(canvas);
    }

    private updateThumbPosition(): void {
        const range = this.width - this.thumbSize;
        const x = -range / 2 + this._value * range;
        this.thumb.position.x = x;
    }

    private valueFromX(x: number): number {
        const range = this.width - this.thumbSize;
        const normalized = (x + this.width / 2 - this.thumbSize / 2) / range;
        return Math.max(0, Math.min(1, normalized));
    }

    get value(): number {
        return this.min + this._value * (this.max - this.min);
    }

    set value(v: number) {
        this._value = (v - this.min) / (this.max - this.min);
        this.updateThumbPosition();
        this.updateValueLabel();
    }

    hitTest(raycaster: THREE.Raycaster): import('../core/Surface').HitResult | null {
        const intersects = raycaster.intersectObject(this.group, true);
        if (intersects.length > 0) {
            return {
                surface: this,
                point: intersects[0].point,
                localPoint: this.group.worldToLocal(intersects[0].point.clone()),
                distance: intersects[0].distance,
                uv: intersects[0].uv,
                face: intersects[0].face ?? undefined,
            };
        }
        return null;
    }

    onPointerDown(): void {
        this._isDragging = true;
    }

    onPointerUp(): void {
        this._isDragging = false;
    }

    onPointerMove(localX: number): void {
        if (this._isDragging) {
            this._value = this.valueFromX(localX);
            this.updateThumbPosition();
            this.updateValueLabel();

            const data = this.data as SliderNodeData;
            if (data?.onChange) {
                data.onChange(this.value);
            }
            this.sg?.events.emit('slider:change', { node: this, value: this.value });
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data) {
            const data = updates.data as SliderNodeData;
            if (data.value !== undefined) {
                this.value = data.value;
            }
            if (data.min !== undefined) this.min = data.min;
            if (data.max !== undefined) this.max = data.max;
            if (data.width !== undefined || data.height !== undefined) {
                this.width = data.width ?? this.width;
                this.height = data.height ?? this.height;
                this.thumbSize = this.height * 1.5;
                this.track.geometry.dispose();
                this.track.geometry = new THREE.BoxGeometry(this.width, this.height, 4);
                this.thumb.geometry.dispose();
                this.thumb.geometry = new THREE.BoxGeometry(this.thumbSize, this.height, 6);
                this.updateThumbPosition();
            }
            if (data.showValue !== undefined) {
                this.showValue = data.showValue;
                this.valueLabel.visible = this.showValue;
            }
            if (data.trackColor !== undefined) this.trackMaterial.color.setHex(data.trackColor);
            if (data.thumbColor !== undefined) this.thumbMaterial.color.setHex(data.thumbColor);
        }
        return this;
    }

    dispose(): void {
        this.trackMaterial.dispose();
        this.thumbMaterial.dispose();
        this.labelMaterial.dispose();
        this.track.geometry.dispose();
        this.thumb.geometry.dispose();
        this.valueLabel.geometry.dispose();
        (this.labelMaterial.map as THREE.Texture)?.dispose();
        super.dispose();
    }
}
