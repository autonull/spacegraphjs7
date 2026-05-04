import * as THREE from 'three';
import { WidgetNode, type WidgetNodeData } from './WidgetNode';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface SliderNodeData extends WidgetNodeData {
    min?: number;
    max?: number;
    value?: number;
    color?: number;
    trackColor?: number;
    thumbColor?: number;
    showValue?: boolean;
    onChange?: (value: number) => void;
}

export class SliderNode extends WidgetNode {
    private _value = 0.5;
    private _min = 0;
    private _max = 1;
    private _thumbSize = 20;
    private _showValue = true;

    private track!: THREE.Mesh;
    private thumb!: THREE.Mesh;
    private trackMaterial!: THREE.MeshStandardMaterial;
    private thumbMaterial!: THREE.MeshStandardMaterial;
    private _onChange?: (value: number) => void;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const data = spec.data as SliderNodeData;
        super(sg, spec, data);

        this._min = data?.min ?? this._min;
        this._max = data?.max ?? this._max;
        this._value = data?.value ?? this._value;
        this._showValue = data?.showValue ?? this._showValue;
        this._onChange = data?.onChange;
        this._thumbSize = this._height * 1.5;

        const trackColor = data?.trackColor ?? 0x333333;
        const thumbColor = data?.color ?? 0x4488ff;

        this.trackMaterial = new THREE.MeshStandardMaterial({ color: trackColor });
        this.thumbMaterial = new THREE.MeshStandardMaterial({ color: thumbColor });

        const trackGeom = new THREE.BoxGeometry(this._width, this._height, 4);
        this.track = new THREE.Mesh(trackGeom, this.trackMaterial);
        this.track.position.z = 0;

        const thumbGeom = new THREE.BoxGeometry(this._thumbSize, this._height, 6);
        this.thumb = new THREE.Mesh(thumbGeom, this.thumbMaterial);
        this.thumb.position.z = 1;
        this.updateThumbPosition();

        this.group.add(this.track);
        this.group.add(this.thumb);

        this.baseMaterial.visible = false;
    }

    protected getBaseColor(_data: WidgetNodeData | undefined): number {
        return 0x333333;
    }

    protected getHoverColor(): number {
        return 0x333333;
    }

    protected getPressedColor(): number {
        return 0x333333;
    }

    protected createLabelContent(ctx: CanvasRenderingContext2D, _text: string): void {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.formatValue(this.value), this._width / 2, this._height / 2);
    }

    protected getLabelText(): string {
        return this._showValue ? this.formatValue(this.value) : '';
    }

    protected formatValue(v: number): string {
        if (Number.isInteger(this._min) && Number.isInteger(this._max)) {
            return Math.round(v).toString();
        }
        return v.toFixed(2);
    }

    protected updateThumbPosition(): void {
        const range = this._width - this._thumbSize;
        const x = -range / 2 + this._value * range;
        this.thumb.position.x = x;
    }

    protected valueFromX(x: number): number {
        const range = this._width - this._thumbSize;
        const normalized = (x + this._width / 2 - this._thumbSize / 2) / range;
        return Math.max(0, Math.min(1, normalized));
    }

    get value(): number {
        return this._min + this._value * (this._max - this._min);
    }

    set value(v: number) {
        this._value = (v - this._min) / (this._max - this._min);
        this.updateThumbPosition();
        this.updateLabel();
    }

    isDraggable(_localPos: THREE.Vector3): boolean {
        return false;
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
        if (this._disabled) return;
        this._isPressed = true;
    }

    onPointerUp(): void {
        this._isPressed = false;
    }

    onPointerMove(localX: number): void {
        if (this._isPressed) {
            this._value = this.valueFromX(localX);
            this.updateThumbPosition();
            this.updateLabel();

            if (this._onChange) {
                this._onChange(this.value);
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
            if (data.min !== undefined) this._min = data.min;
            if (data.max !== undefined) this._max = data.max;
            if (data.width !== undefined || data.height !== undefined) {
                this._width = data.width ?? this._width;
                this._height = data.height ?? this._height;
                this._thumbSize = this._height * 1.5;
                this.track.geometry.dispose();
                this.track.geometry = new THREE.BoxGeometry(this._width, this._height, 4);
                this.thumb.geometry.dispose();
                this.thumb.geometry = new THREE.BoxGeometry(this._thumbSize, this._height, 6);
                this.updateThumbPosition();
            }
            if (data.showValue !== undefined) {
                this._showValue = data.showValue;
                this.labelMesh!.visible = this._showValue;
            }
            if (data.trackColor !== undefined) this.trackMaterial.color.setHex(data.trackColor);
            if (data.color !== undefined) this.thumbMaterial.color.setHex(data.color);
            if (data.onChange !== undefined) this._onChange = data.onChange;
        }
        return this;
    }

    dispose(): void {
        this.trackMaterial.dispose();
        this.thumbMaterial.dispose();
        this.track.geometry.dispose();
        this.thumb.geometry.dispose();
        super.dispose();
    }
}