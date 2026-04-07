import { EventEmitter } from '../EventEmitter';

export interface SpaceGraphEvents {
    'node:added': { node: import('../../nodes/Node').Node; timestamp: number };
    'node:removed': { id: string; timestamp: number };
    'node:updated': {
        node: import('../../nodes/Node').Node;
        changes: Record<string, unknown>;
        timestamp: number;
    };
    'edge:added': { edge: import('../../edges/Edge').Edge; timestamp: number };
    'edge:removed': { id: string; timestamp: number };
    'edge:updated': {
        edge: import('../../edges/Edge').Edge;
        changes: Record<string, unknown>;
        timestamp: number;
    };
    'interaction:dragstart': { node: import('../../nodes/Node').Node; event?: PointerEvent };
    'interaction:dragend': { node: import('../../nodes/Node').Node; event?: PointerEvent };
    'interaction:drag': {
        node: import('../../nodes/Node').Node;
        position: [number, number, number];
        event?: PointerEvent;
    };
    'camera:move': { position: [number, number, number]; target: [number, number, number] };
    'selection:changed': { nodes: string[]; edges: string[]; timestamp: number };
    'node:click': { node: import('../../nodes/Node').Node; event: MouseEvent };
    'graph:click': { event: MouseEvent };
    'node:contextmenu': { node: import('../../nodes/Node').Node; event: MouseEvent };
    'graph:contextmenu': { event: MouseEvent };
    'vision:report': { report: import('../../vision/types').VisionReport; timestamp: number };
    'vision:overlap:detected': {
        overlaps: Array<{ nodeA: string; nodeB: string }>;
        timestamp: number;
    };
    'layout:applied': { layout: string; duration: number; timestamp: number };
    'plugin:ready': { pluginId: string; timestamp: number };
    'plugin:error': { pluginId: string; error: Error; timestamp: number };
    'interaction:selection': { nodes: any[]; edges: any[] };
    'interaction:edgecreate': { source: any; target: any };
    'node:dblclick': { node: any };
    'edge:dblclick': { edge: any };
    'edge:click': { edge: any };
    'node:pointerenter': { node: any; event?: any };
    'node:pointerleave': { node: any };
    'edge:pointerenter': { edge: any; event?: any };
    'edge:pointerleave': { edge: any };
    [key: string]: unknown;
    [key: symbol]: unknown;
}

export class EventSystem extends EventEmitter<SpaceGraphEvents> {
    emit<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
        super.emit(type, event);
    }

    emitBatched<K extends keyof SpaceGraphEvents>(type: K, event: SpaceGraphEvents[K]): void {
        super.emitBatched(type, event);
    }

    on<K extends keyof SpaceGraphEvents>(
        type: K,
        handler: (event: SpaceGraphEvents[K]) => void,
    ): { dispose(): void } {
        return super.on(type, handler);
    }

    off<K extends keyof SpaceGraphEvents>(
        type: K,
        handler?: (event: SpaceGraphEvents[K]) => void,
    ): void {
        super.off(type, handler);
    }
}
