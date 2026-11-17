// P3.1. A widget is a host-owned mount/unmount pair registered under a stable id. The library owns
// registration, resolution and lifecycle; no widget implementation is hardcoded here.

import type { RenderNode } from '@spacegraphjs/renderer';

export const WIDGET_SLOTS = ['header', 'body', 'footer', 'attached', 'pinned'] as const;
export type WidgetSlot = (typeof WIDGET_SLOTS)[number];

export const WIDGET_CAPABILITIES = ['interactive', 'focus', 'resize', 'depth-fade'] as const;
export type WidgetCapability = (typeof WIDGET_CAPABILITIES)[number];

export interface WidgetSize {
    readonly width: number;
    readonly height: number;
}

export interface WidgetMountContext {
    readonly node: RenderNode;
    readonly slot: WidgetSlot;
}

/**
 * The host-owned view behind a descriptor. Every member is optional so the registry stays DOM-free.
 * Handles map the library's lifecycle, measurement, interactive routing and fog onto host elements.
 */
export interface WidgetHandle {
    readonly element?: unknown;
    readonly measure?: () => WidgetSize;
    update?(context: WidgetMountContext): void;
    setOpacity?(opacity: number): void;
    setInteractive?(interactive: boolean): void;
    unmount?(): void;
}

/** A host registration. The library stores and resolves descriptors; the host owns every mount. */
export interface WidgetDescriptor {
    readonly id: string;
    readonly label: string;
    readonly slots: readonly WidgetSlot[];
    /** Preferred representation rung ids; empty means any representation. */
    readonly representations?: readonly string[];
    readonly capabilities?: readonly WidgetCapability[];
    readonly initialSize?: WidgetSize;
    mount(context: WidgetMountContext): WidgetHandle;
}

/**
 * Host-owned descriptors keyed by stable id. Resolution is deterministic: registration order,
 * filtered by node request, representation rung and enabled slot.
 */
export class WidgetRegistry {
    readonly #descriptors = new Map<string, WidgetDescriptor>();

    register(descriptor: WidgetDescriptor): this {
        this.#descriptors.set(descriptor.id, descriptor);
        return this;
    }

    unregister(id: string): boolean {
        return this.#descriptors.delete(id);
    }

    get(id: string): WidgetDescriptor | undefined {
        return this.#descriptors.get(id);
    }

    list(): readonly WidgetDescriptor[] {
        return [...this.#descriptors.values()];
    }

    resolve(
        node: RenderNode,
        representation: string,
        enabledSlots: readonly WidgetSlot[],
    ): readonly WidgetDescriptor[] {
        const requested = node.widgets?.length ? new Set(node.widgets) : undefined;
        const slots = new Set(enabledSlots);
        return this.list().filter(
            (descriptor) =>
                (!requested || requested.has(descriptor.id)) &&
                descriptor.slots.some((slot) => slots.has(slot)) &&
                (!descriptor.representations?.length ||
                    descriptor.representations.includes(representation)),
        );
    }
}
