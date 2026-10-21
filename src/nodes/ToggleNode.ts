import type * as THREE from 'three';
import type { HitResult } from '../core/Surface';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
import { WidgetNode, type WidgetNodeData } from './WidgetNode';

export interface ToggleNodeData extends WidgetNodeData {
  value?: boolean;
  onColor?: number;
  offColor?: number;
  onToggle?: (value: boolean) => void;
}

export class ToggleNode extends WidgetNode {
  static readonly typeName: string = 'ToggleNode';
  private _onColor = 0x44ff88;
  private _offColor = 0x666666;
  private _onToggle?: (value: boolean) => void;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    const data = spec.data as ToggleNodeData;
    super(sg, spec, data);

    this._value = data?.value ?? false;
    this._onColor = data?.onColor ?? this._onColor;
    this._offColor = data?.offColor ?? this._offColor;
    this._onToggle = data?.onToggle;

    this.baseMaterial.color.setHex(this._value ? this._onColor : this._offColor);
  }

  private _value = false;

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

  hitTest(raycaster: THREE.Raycaster): HitResult | null {
    return this.hitTestObject(raycaster, this.mesh, { recursive: false, normal: false });
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
}
