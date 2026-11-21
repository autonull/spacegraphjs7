// P3.2–P3.4. One layer drives widget lifecycle, desired-size feedback, interactive routing and DOM
// fog. The host maps handle callbacks onto its own DOM; the library never touches an element.

import { depthFade } from '../depth/DepthCues';
import type { RenderNode } from '@spacegraphjs/renderer';
import {
    WidgetRegistry,
    type WidgetDescriptor,
    type WidgetHandle,
    type WidgetMountContext,
    type WidgetSize,
    type WidgetSlot,
} from './registry';
import { resolveWidgetSize, type ResolvedWidgetSize, type WidgetSizingPolicy } from './sizing';

export interface MountedWidget {
    readonly key: string;
    readonly nodeId: string;
    readonly slot: WidgetSlot;
    readonly descriptorId: string;
    readonly handle: WidgetHandle;
    readonly size: ResolvedWidgetSize;
    opacity: number;
}

export interface WidgetLayerOptions {
    readonly registry: WidgetRegistry;
    readonly slots: readonly WidgetSlot[];
    readonly sizing?: WidgetSizingPolicy;
    /** The host's representation rung for a node; drives attach/detach on representation changes. */
    readonly representationOf: (nodeId: string) => string;
    /** Prefer a live measurement over the descriptor's initial size. */
    readonly measure?: (handle: WidgetHandle) => WidgetSize | undefined;
    readonly onSize?: (nodeId: string, size: ResolvedWidgetSize) => void;
}

const sizeArea = (size: WidgetSize) => size.width * size.height;

/** Drives widget lifecycle, desired-size feedback and DOM fog without touching host elements. */
export class WidgetLayer {
    readonly #mounted = new Map<string, MountedWidget>();

    constructor(readonly options: WidgetLayerOptions) {}

    /** Mount newly eligible widgets and unmount the rest; unchanged keys keep their live instance. */
    sync(nodes: readonly RenderNode[]): void {
        const wanted = new Set<string>();
        for (const node of nodes) {
            const representation = this.options.representationOf(node.id);
            for (const descriptor of this.options.registry.resolve(
                node,
                representation,
                this.options.slots,
            )) {
                for (const slot of descriptor.slots.filter((candidate) =>
                    this.options.slots.includes(candidate),
                )) {
                    const key = `${node.id}:${slot}:${descriptor.id}`;
                    wanted.add(key);
                    if (this.#mounted.has(key)) continue;
                    this.#mount(key, node, slot, descriptor);
                }
            }
        }
        for (const [key, mounted] of this.#mounted) {
            if (wanted.has(key)) continue;
            mounted.handle.unmount?.();
            this.#mounted.delete(key);
        }
    }

    #mount(key: string, node: RenderNode, slot: WidgetSlot, descriptor: WidgetDescriptor): void {
        const context: WidgetMountContext = { node, slot };
        const handle = descriptor.mount(context);
        const measured = this.options.measure?.(handle) ??
            handle.measure?.() ??
            descriptor.initialSize ?? { width: 220, height: 72 };
        const size = resolveWidgetSize(measured, this.options.sizing);
        this.#mounted.set(key, {
            key,
            nodeId: node.id,
            slot,
            descriptorId: descriptor.id,
            handle,
            size,
            opacity: 1,
        });
        handle.setInteractive?.(descriptor.capabilities?.includes('interactive') ?? true);
        this.options.onSize?.(node.id, size);
    }

    /** Project scene fog onto mounted DOM widgets; handles without `setOpacity` are untouched. */
    setDepthFade(distance: number, density: number): void {
        const opacity = depthFade(distance, density);
        for (const mounted of this.#mounted.values()) {
            mounted.opacity = opacity;
            mounted.handle.setOpacity?.(opacity);
        }
    }

    /** One desired size per node — the largest mounted widget — only when layout feedback is allowed. */
    desiredSizes(): ReadonlyMap<string, ResolvedWidgetSize> {
        const result = new Map<string, ResolvedWidgetSize>();
        for (const mounted of this.#mounted.values()) {
            if (!mounted.size.feedLayout) continue;
            const current = result.get(mounted.nodeId);
            if (!current || sizeArea(mounted.size.size) > sizeArea(current.size)) {
                result.set(mounted.nodeId, mounted.size);
            }
        }
        return result;
    }

    mounted(): readonly MountedWidget[] {
        return [...this.#mounted.values()];
    }

    destroy(): void {
        for (const mounted of this.#mounted.values()) mounted.handle.unmount?.();
        this.#mounted.clear();
    }
}
