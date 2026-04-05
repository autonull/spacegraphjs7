import type { Plugin } from '../core/PluginManager';
import type { SpaceGraph } from '../SpaceGraph';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import type { Node } from '../nodes/Node';
import type { Edge } from '../edges/Edge';

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
    protected events!: EventSystem;

    private subscriptions: SubscriptionHandle[] = [];

    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void | Promise<void> {
        Object.assign(this, { sg, graph, events });
    }

    protected subscribe(handle: SubscriptionHandle): void {
        this.subscriptions.push(handle);
    }

    protected isPinned(node: Node): boolean {
        return node.data?.pinned === true;
    }

    protected isStatic(node: Node): boolean {
        return node.data?.pinned === true || node.data?.physicsStatic === true;
    }

    protected hasPluginMethod<T>(plugin: unknown, method: keyof T): boolean {
        return hasMethod(plugin, method as string);
    }

    protected disposeSubscriptions(): void {
        this.subscriptions.forEach((sub) => sub.dispose());
        this.subscriptions = [];
    }

    onPreRender?(_delta: number): void {}
    onPostRender?(_delta: number): void {}
    onNodeAdded?(_node: Node): void {}
    onNodeRemoved?(_node: Node): void {}
    onEdgeAdded?(_edge: Edge): void {}
    onEdgeRemoved?(_edge: Edge): void {}
    dispose?(): void {
        this.disposeSubscriptions();
    }
    export?(): unknown {
        return undefined;
    }
    import?(_data: unknown): void {}
}
