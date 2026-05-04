import * as THREE from 'three';
import { WidgetNode, type WidgetNodeData } from './WidgetNode';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface ToggleNodeData extends WidgetNodeData {
    value?: boolean;
    onColor?: number;
    offColor?: number;
    onToggle?: (value: boolean) => void;
}

export class ToggleNode extends WidgetNode {
    private _value = false;
    private _onColor = 0x44ff88;
    private _offColor = 0x666666;
    private _onToggle?: (value: boolean) => void;

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        const data = spec.data as ToggleNodeData;
        super(sg, spec, data);

        this._value = data?.value ?? false;
        this._onColor = data?.onColor ?? this._onColor;
        this._offColor = data?.offColor ?? this._offColor;
        this._onToggle = data?.onToggle;

        this.baseMaterial.color.setHex(this._value ? this._onColor : this._offColor);
    }

    protected getBaseColor(_data: WidgetNodeData | undefined): number {
        return this._value ? this._onColor : this._offColor;
    }

    protected getHoverColor(): number {
        return this._value ? this._offColor : this._onColor;
    }

    protected getPressedColor(): number {
        return this.getHoverColor();
    }

    protected createLabelContent(ctx: CanvasRenderingContext2D, _text: string): void {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._value ? 'ON' : 'OFF', this._width / 2, this._height / 2);
    }

    protected getLabelText(): string {
        return this._value ? 'ON' : 'OFF';
    }

    get value(): boolean {
        return this._value;
    }

    set value(v: boolean) {
        this._value = v;
        this.baseMaterial.color.setHex(this._value ? this._onColor : this._offColor);
        this.updateLabel();
    }

    onPointerDown(): void {
        if (this._disabled) return;
        this._value = !this._value;
        this.baseMaterial.color.setHex(this._value ? this._onColor : this._offColor);
        this.updateLabel();

        if (this._onToggle) {
            this._onToggle(this._value);
        }
        this.sg?.events.emit('node:click', { node: this });
    }

    onPointerUp(): void {}

    hitTest(raycaster: THREE.Raycaster): import('../core/Surface').HitResult | null {
        const intersects = raycaster.intersectObject(this.mesh, false);
        if (intersects.length > 0) {
            return {
                surface: this,
                point: intersects[0].point,
                localPoint: this.worldToLocal(intersects[0].point.clone()),
                distance: intersects[0].distance,
            };
        }
        return null;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data) {
            const data = updates.data as ToggleNodeData;
            if (data.value !== undefined) {
                this.value = data.value;
            }
            if (data.onColor !== undefined) {
                this._onColor = data.onColor;
                if (this._value) this.baseMaterial.color.setHex(this._onColor);
            }
            if (data.offColor !== undefined) {
                this._offColor = data.offColor;
                if (!this._value) this.baseMaterial.color.setHex(this._offColor);
            }
            if (data.onToggle !== undefined) {
                this._onToggle = data.onToggle;
            }
        }
        return this;
    }

    dispose(): void {
        super.dispose();
    }
}