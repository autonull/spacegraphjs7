import type { Plugin } from '../core';
import type { SpaceGraphEvents } from '../types';
import type { Graph } from '../core/Graph';
import type { Edge } from '../edges/Edge';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EventEmitter } from '../core/EventEmitter';

export interface SubscriptionHandle {
    dispose(): void;
}

export function hasMethod<T>(
    obj: T,
    method: string,
): obj is T & Record<string, (...args: unknown[]) => unknown> {
    return (
        !!obj &&
        method in (obj as object) &&
        typeof (obj as Record<string, unknown>)[method] === 'function'
    );
}

export function createLoggerPrefix(name: string): string {
    return name.replace(/\s+/g, '').toLowerCase();
}

export abstract class BaseSystemPlugin implements Plugin {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly version: string;

    protected sg!: SpaceGraph;
    protected graph!: Graph;
    protected events!: EventEmitter<SpaceGraphEvents>;

    private subscriptions: SubscriptionHandle[] = [];

    init(sg: SpaceGraph, graph: Graph, events: EventEmitter<SpaceGraphEvents>): void {
        this.sg = sg;
        this.graph = graph;
        this.events = events;
    }

    onPreRender?(_delta: number): void {}

    onPostRender?(_delta: number): void {}

    onNodeAdded?(_node: Node): void {}

    onNodeRemoved?(_node: Node): void {}

    onEdgeAdded?(_edge: Edge): void {}

    onEdgeRemoved?(_edge: Edge): void {}

    dispose(): void {
        this.disposeSubscriptions();
    }

    export?(): unknown {
        return undefined;
    }

    import?(_data: unknown): void {}

    protected subscribe(handle: SubscriptionHandle): void {
        this.subscriptions.push(handle);
    }

    protected isPinned(node: Node): boolean {
        return node.isPinned?.() ?? node.data?.pinned === true;
    }

    protected isStatic(node: Node): boolean {
        return (
            (node.isPinned?.() ?? node.data?.pinned === true) || node.data?.physicsStatic === true
        );
    }

    protected hasPluginMethod<T>(plugin: unknown, method: keyof T): boolean {
        return hasMethod(plugin, method as string);
    }

    protected on(eventName: string, callback: (...args: any[]) => void): void {
        const sub = this.events.on(eventName as any, callback);
        this.subscriptions.push(sub);
    }

    protected emit(eventName: string, data?: any): void {
        this.events.emit(eventName as any, data);
    }

    protected disposeSubscriptions(): void {
        this.subscriptions.forEach((sub) => sub.dispose());
        this.subscriptions = [];
    }
}
