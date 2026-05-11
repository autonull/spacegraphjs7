import * as THREE from 'three';
import { Node } from './Node';
import type { NodeSpec, BaseNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

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

    get object(): THREE.Object3D {
        return this.group;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec, data: WidgetNodeData) {
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

    protected abstract getBaseColor(data: WidgetNodeData | undefined): number;
    protected abstract getHoverColor(): number;
    protected abstract getPressedColor(): number;
    protected abstract createLabelContent(ctx: CanvasRenderingContext2D, text: string): void;
    protected abstract getLabelText(): string;

    protected initLabel(_data: WidgetNodeData | undefined): void {
        const text = this.getLabelText();
        if (!text) return;

        const canvas = document.createElement('canvas');
        canvas.width = this._width * 2;
        canvas.height = this._height * 2;
        const ctx = canvas.getContext('2d')!;
        this.createLabelContent(ctx, text);

        const texture = new THREE.CanvasTexture(canvas);
        const labelWidth = this._width * 0.8;
        const labelHeight = this._height * 0.5;
        this.labelMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });
        this.labelMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(labelWidth, labelHeight),
            this.labelMaterial,
        );
        this.labelMesh.position.z = this._depth / 2 + 0.1;
        this.group.add(this.labelMesh);
    }

    protected updateLabel(): void {
        if (!this.labelMaterial?.map) return;

        const canvas = document.createElement('canvas');
        canvas.width = this._width * 2;
        canvas.height = this._height * 2;
        const ctx = canvas.getContext('2d')!;
        this.createLabelContent(ctx, this.getLabelText());

        (this.labelMaterial.map as THREE.CanvasTexture).dispose();
        this.labelMaterial.map = new THREE.CanvasTexture(canvas);
    }

    isDraggable(_localPos: THREE.Vector3): boolean {
        return false;
    }

    hitTest(raycaster: THREE.Raycaster): import('../core/Surface').HitResult | null {
        const intersects = raycaster.intersectObject(this.mesh, false);
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

    protected onPointerUpCore(): void {
        this._isPressed = false;
        this.mesh.position.z = 0;
        this.baseMaterial.color.setHex(
            this._isHovered ? this.getHoverColor() : this.getBaseColor((this.data as WidgetNodeData) ?? undefined),
        );
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

    dispose(): void {
        this.baseMaterial.dispose();
        this.boxGeometry.dispose();
        this.labelMesh?.geometry.dispose();
        this.labelMaterial?.dispose();
        (this.labelMaterial?.map as THREE.Texture)?.dispose();
        super.dispose();
    }
}