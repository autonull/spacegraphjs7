import * as THREE from 'three';
import { Node } from './Node';
import type { NodeSpec, BaseNodeData } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface ButtonNodeData extends BaseNodeData {
    label?: string;
    color?: number;
    hoverColor?: number;
    pressedColor?: number;
    width?: number;
    height?: number;
    depth?: number;
    onClick?: () => void;
}

export class ButtonNode extends Node {
    private readonly group: THREE.Group;
    private readonly mesh: THREE.Mesh;
    private baseMaterial: THREE.MeshStandardMaterial;
    private hoverMaterial: THREE.MeshStandardMaterial;
    private pressedMaterial: THREE.MeshStandardMaterial;
    private labelMesh?: THREE.Mesh;
    private _isHovered = false;
    private _isPressed = false;
    private width = 120;
    private height = 40;
    private depth = 10;

    get object(): THREE.Object3D {
        return this.group;
    }

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);

        const data = spec.data as ButtonNodeData;
        this.width = data?.width ?? 120;
        this.height = data?.height ?? 40;
        this.depth = data?.depth ?? 10;
        const color = data?.color ?? 0x4488ff;
        const hoverColor = data?.hoverColor ?? 0x66aaff;
        const pressedColor = data?.pressedColor ?? 0x2266dd;

        this.baseMaterial = new THREE.MeshStandardMaterial({ color });
        this.hoverMaterial = new THREE.MeshStandardMaterial({ color: hoverColor });
        this.pressedMaterial = new THREE.MeshStandardMaterial({ color: pressedColor });

        const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.mesh = new THREE.Mesh(geometry, this.baseMaterial);
        this.group = new THREE.Group();
        this.group.add(this.mesh);

        if (data?.label) {
            this.createLabel(data.label);
        }

        this.isTouchable = true;
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    isDraggable(_localPos: THREE.Vector3): boolean {
        return false;
    }

    private createLabel(text: string): void {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;

        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const labelGeom = new THREE.PlaneGeometry(this.width * 0.8, this.height * 0.5);
        const labelMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });

        this.labelMesh = new THREE.Mesh(labelGeom, labelMat);
        this.labelMesh.position.z = this.depth / 2 + 0.1;
        this.group.add(this.labelMesh);
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
        if (!this._isPressed) {
            this._isHovered = true;
            this.mesh.material = this.hoverMaterial;
        }
    }

    onPointerLeave(): void {
        this._isHovered = false;
        if (!this._isPressed) {
            this.mesh.material = this.baseMaterial;
        }
    }

    onPointerDown(): void {
        this._isPressed = true;
        this.mesh.material = this.pressedMaterial;
        this.mesh.position.z = -2;
    }

    onPointerUp(): void {
        if (this._isPressed) {
            this._isPressed = false;
            this.mesh.position.z = 0;
            this.mesh.material = this._isHovered ? this.hoverMaterial : this.baseMaterial;

            const data = this.data as ButtonNodeData;
            if (data?.onClick) {
                data.onClick();
            }
            this.sg?.events.emit('node:click', { node: this });
        }
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        super.updateSpec(updates);
        if (updates.data) {
            const data = updates.data as ButtonNodeData;
            if (data.color) {
                this.baseMaterial.color.setHex(data.color);
            }
            if (data.width !== undefined || data.height !== undefined || data.depth !== undefined) {
                this.width = data.width ?? this.width;
                this.height = data.height ?? this.height;
                this.depth = data.depth ?? this.depth;
                this.mesh.geometry.dispose();
                this.mesh.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
            }
            if (data.label !== undefined) {
                this.labelMesh?.geometry.dispose();
                (this.labelMesh?.material as THREE.Material)?.dispose();
                this.labelMesh = undefined;
                if (data.label) {
                    this.createLabel(data.label);
                }
            }
        }
        return this;
    }

    dispose(): void {
        this.baseMaterial.dispose();
        this.hoverMaterial.dispose();
        this.pressedMaterial.dispose();
        this.mesh.geometry.dispose();
        this.labelMesh?.geometry.dispose();
        (this.labelMesh?.material as THREE.Material)?.dispose();
        super.dispose();
    }
}
