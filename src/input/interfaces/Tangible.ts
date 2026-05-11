import type * as THREE from 'three';
import type { Node } from '../../nodes/Node';

export interface PickResult {
    node: Node | null;
    point: THREE.Vector3;
    distance: number;
}

export interface Tangible { isTangible(): boolean; }
export interface Draggable {
    onDragStart?(ray: THREE.Ray): void;
    onDragging?(ray: THREE.Ray): void;
    onDragStop?(ray: THREE.Ray): void;
}
export interface Pressable {
    onPressStart?(pick: PickResult): void;
    onPressStop?(pick: PickResult): void;
}
export interface Touchable {
    onTouchStart?(pick: PickResult): void;
    onTouching?(pick: PickResult): void;
    onTouchStop?(): void;
}
export interface Zoomable {
    isZoomable(): boolean;
    onZoomStart?(): void;
    onZoomStop?(): void;
}