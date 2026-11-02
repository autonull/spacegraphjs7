/**
 * Popover abstraction for SpaceGraphJS components.
 * Hosts provide their own popover implementation; this package defines the contract and a default.
 */

import type { JSX } from 'solid-js';

/** Props for a popover component. */
export type PopoverProps = {
    /** Unique slot identifier for testing. */
    slot: string;
    /** Label for accessibility. */
    label: string;
    /** Icon name for the trigger button. */
    icon: string;
    /** Current value to display (optional). */
    value?: string;
    /** Slot for the value display (optional). */
    valueSlot?: string;
    /** Alignment of the popover content. */
    align?: 'start' | 'end';
    /** Children content. */
    children: JSX.Element;
    /** Whether the popover is open (controlled). */
    open?: boolean;
    /** Callback when open state changes (controlled). */
    onOpenChange?: (open: boolean) => void;
};

/** Popover component type. */
export type PopoverComponent = (props: PopoverProps) => JSX.Element;

/** Default popover implementation using native <details>/<summary>. */
export const DefaultPopover: PopoverComponent = (props: PopoverProps) => {
    const slot = props.slot;
    const label = props.label;
    const icon = props.icon;
    const value = props.value;
    const valueSlot = props.valueSlot;
    const align = props.align ?? 'start';
    const children = props.children;

    return (
        <details class="relative" data-slot={slot}>
            <summary
                class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
                aria-label={label}
                title={label}
            >
                {/* Icon would be rendered by host's Icon component */}
                <span data-testid="popover-icon">{icon}</span>
                {value ? <span data-slot={valueSlot ?? `${slot}-value`}>{value}</span> : null}
                {value ? <span data-testid="popover-chevron">▾</span> : null}
            </summary>
            <div
                class="absolute z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md"
                classList={{ 'start-0': align === 'start', 'end-0': align !== 'start' }}
            >
                {children}
            </div>
        </details>
    );
};

/**
 * Creates a popover renderer that uses the host's Popover component or falls back to the default.
 * @param hostPopover - Host's Popover component (optional)
 * @returns Function that renders a popover
 */
export function createPopoverRenderer(hostPopover?: PopoverComponent): PopoverComponent {
    if (hostPopover) return hostPopover;
    return DefaultPopover;
}
