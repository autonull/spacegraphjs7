import * as THREE from 'three';
import type { HitResult } from '../core/Surface';
import type { SpaceGraph } from '../SpaceGraph';
import type { BaseNodeData, NodeSpec } from '../types';
import { Node } from './Node';

export interface WidgetNodeData extends BaseNodeData {
  width?: number;
  height?: number;
  depth?: number;
  disabled?: boolean;
  tabIndex?: number;
  role?: 'button' | 'checkbox' | 'slider' | 'radiogroup';
  ariaLabel?: string;
  ariaValueNow?: number;
  ariaValueMin?: number;
  ariaValueMax?: number;
}

export abstract class WidgetNode extends Node {
  protected group: THREE.Group;
  protected mesh: THREE.Mesh;
  protected boxGeometry: THREE.BoxGeometry;
  protected baseMaterial: THREE.MeshStandardMaterial;
  protected labelMesh?: THREE.Mesh;
  protected labelMaterial?: THREE.MeshBasicMaterial;

  protected _width = 100;
  protected _height = 40;
  protected _depth = 10;
  protected _disabled = false;
  protected _isHovered = false;
  protected _isPressed = false;

  protected constructor(sg: SpaceGraph | undefined, spec: NodeSpec, data: WidgetNodeData) {
    super(sg, spec);

    this._width = data?.width ?? this._width;
    this._height = data?.height ?? this._height;
    this._depth = data?.depth ?? this._depth;
    this._disabled = data?.disabled ?? false;

    this.baseMaterial = new THREE.MeshStandardMaterial({ color: this.getBaseColor(data) });
    this.boxGeometry = new THREE.BoxGeometry(this._width, this._height, this._depth);
    this.mesh = new THREE.Mesh(this.boxGeometry, this.baseMaterial);

    this.group = new THREE.Group();
    this.group.add(this.mesh);

    this.isTouchable = true;
    this.focusable = true;

    this.initLabel(data);
    this.updatePosition(this.position.x, this.position.y, this.position.z);
  }

  get object(): THREE.Object3D {
    return this.group;
  }

  isDraggable(_localPos: THREE.Vector3): boolean {
    return false;
  }

  hitTest(raycaster: THREE.Raycaster): HitResult | null {
    return this.hitTestObject(raycaster, this.mesh, { recursive: false, normal: false });
  }

  onPointerEnter(): void {
    if (this._disabled) return;
    this._isHovered = true;
    if (!this._isPressed) {
      this.baseMaterial.color.setHex(this.getHoverColor());
    }
  }

  onPointerLeave(): void {
    this._isHovered = false;
    if (!this._isPressed) {
      this.baseMaterial.color.setHex(this.getBaseColor((this.data as WidgetNodeData) ?? undefined));
    }
  }

  onPointerDown(): void {
    if (this._disabled) return;
    this._isPressed = true;
    this.baseMaterial.color.setHex(this.getPressedColor());
    this.mesh.position.z = -2;
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);
    if (updates.data) {
      const data = updates.data as WidgetNodeData;
      if (data.width !== undefined || data.height !== undefined || data.depth !== undefined) {
        this._width = data.width ?? this._width;
        this._height = data.height ?? this._height;
        this._depth = data.depth ?? this._depth;
        this.boxGeometry.dispose();
        this.boxGeometry = new THREE.BoxGeometry(this._width, this._height, this._depth);
        this.mesh.geometry = this.boxGeometry;
      }
      if (data.disabled !== undefined) {
        this._disabled = data.disabled;
        this.baseMaterial.opacity = this._disabled ? 0.5 : 1;
        this.baseMaterial.transparent = this._disabled;
      }
    }
    return this;
  }

  protected abstract getBaseColor(data: WidgetNodeData | undefined): number;

  protected abstract getHoverColor(): number;

  protected abstract getPressedColor(): number;

  protected abstract createLabelContent(ctx: CanvasRenderingContext2D, text: string): void;

  protected abstract getLabelText(): string;

  protected initLabel(_data: WidgetNodeData | undefined): void {
    const text = this.getLabelText();
    if (!text) return;

    const texture = new THREE.CanvasTexture(this.drawLabel(text));
    const labelWidth = this._width * 0.8;
    const labelHeight = this._height * 0.5;
    this.labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    this.labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(labelWidth, labelHeight),
      this.labelMaterial
    );
    this.labelMesh.position.z = this._depth / 2 + 0.1;
    this.group.add(this.labelMesh);
  }

  protected updateLabel(): void {
    if (!this.labelMaterial?.map) return;

    (this.labelMaterial.map as THREE.CanvasTexture).dispose();
    this.labelMaterial.map = new THREE.CanvasTexture(this.drawLabel(this.getLabelText()));
  }

  /** The canvas the label text is drawn on, at twice the widget's size. */
  private drawLabel(text: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this._width * 2;
    canvas.height = this._height * 2;
    this.createLabelContent(canvas.getContext('2d')!, text);
    return canvas;
  }

  protected onPointerUpCore(): void {
    this._isPressed = false;
    this.mesh.position.z = 0;
    this.baseMaterial.color.setHex(
      this._isHovered
        ? this.getHoverColor()
        : this.getBaseColor((this.data as WidgetNodeData) ?? undefined)
    );
  }
}
