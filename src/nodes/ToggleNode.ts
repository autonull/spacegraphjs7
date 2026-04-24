import * as THREE from 'three';
import { Node } from './Node';
import type { NodeSpec, NodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface ToggleNodeData extends NodeData {
    value?: boolean;
    onColor?: number;
    offColor?: number;
    width?: number;
    height?: number;
    depth?: number;
    onToggle?: (value: boolean) => void;
}

export class ToggleNode extends Node {
    private readonly group: THREE.Group;
    private readonly mesh: THREE.Mesh;
    private readonly label: THREE.Mesh;
    private onMaterial: THREE.MeshStandardMaterial;
    private offMaterial: THREE.MeshStandardMaterial;
    private labelMaterial: THREE.MeshBasicMaterial;
    private _value = false;
    private _isHovered = false;
    private width = 60;
    private height = 30;
    private depth = 10;

    get object(): THREE.Object3D {
        return this.group;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const data = spec.data as ToggleNodeData;
        this.width = data?.width ?? 60;
        this.height = data?.height ?? 30;
        this.depth = data?.depth ?? 10;
        this._value = data?.value ?? false;
        const onColor = data?.onColor ?? 0x44ff88;
        const offColor = data?.offColor ?? 0x666666;

        this.onMaterial = new THREE.MeshStandardMaterial({ color: onColor });
        this.offMaterial = new THREE.MeshStandardMaterial({ color: offColor });
        this.labelMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });

        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh(geometry, this._value ? this.onMaterial : this.offMaterial);

        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 64;
        labelCanvas.height = 32;
        const ctx = labelCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._value ? 'ON' : 'OFF', 32, 16);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        this.labelMaterial.map = labelTexture;
        const labelGeom = new THREE.PlaneGeometry(this.width * 0.7, this.height * 0.6);
        this.label = new THREE.Mesh(labelGeom, this.labelMaterial);
        this.label.position.z = this.depth / 2 + 0.1;

        this.group = new THREE.Group();
        this.group.add(this.mesh);
        this.group.add(this.label);

this.isTouchable = true;
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    isDraggable(_localPos: THREE.Vector3): boolean {
        return false;
    }

    private updateLabel(): void {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this._value ? 'ON' : 'OFF', 32, 16);
        (this.labelMaterial.map as THREE.CanvasTexture).dispose();
        this.labelMaterial.map = new THREE.CanvasTexture(canvas);
    }

    get value(): boolean {
        return this._value;
    }

    set value(v: boolean) {
        this._value = v;
        this.mesh.material = v ? this.onMaterial : this.offMaterial;
        this.updateLabel();
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
        this._isHovered = true;
    }

    onPointerLeave(): void {
        this._isHovered = false;
    }

    onPointerDown(): void {}

    onPointerUp(): void {
        this._value = !this._value;
        this.mesh.material = this._value ? this.onMaterial : this.offMaterial;
        this.updateLabel();

        const data = this.data as ToggleNodeData;
        if (data?.onToggle) {
            data.onToggle(this._value);
        }
        this.sg?.events.emit('node:click', { node: this, value: this._value });
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data) {
            const data = updates.data as ToggleNodeData;
            if (data.value !== undefined) {
                this.value = data.value;
            }
            if (data.width !== undefined || data.height !== undefined || data.depth !== undefined) {
                this.width = data.width ?? this.width;
                this.height = data.height ?? this.height;
                this.depth = data.depth ?? this.depth;
                this.mesh.geometry.dispose();
                this.mesh.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
            }
            if (data.onColor !== undefined) this.onMaterial.color.setHex(data.onColor);
            if (data.offColor !== undefined) this.offMaterial.color.setHex(data.offColor);
        }
        return this;
    }

    dispose(): void {
        this.onMaterial.dispose();
        this.offMaterial.dispose();
        this.labelMaterial.dispose();
        this.mesh.geometry.dispose();
        this.label.geometry.dispose();
        (this.labelMaterial.map as THREE.Texture)?.dispose();
        super.dispose();
    }
}
