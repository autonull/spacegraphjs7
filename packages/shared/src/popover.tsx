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

/** Popover shell with a host-supplied icon renderer. */
export function createIconPopover(renderIcon: (name: string) => JSX.Element): PopoverComponent {
    return (props) => {
        const align = props.align ?? 'start';
        return (
            <details class="relative" data-slot={props.slot}>
                <summary
                    class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
                    aria-label={props.label}
                    title={props.label}
                >
                    {renderIcon(props.icon)}
                    {props.value ? (
                        <span data-slot={props.valueSlot ?? `${props.slot}-value`}>{props.value}</span>
                    ) : null}
                    {props.value ? renderIcon('outline-chevron-down') : null}
                </summary>
                <div
                    class="absolute z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md"
                    classList={{ 'start-0': align === 'start', 'end-0': align !== 'start' }}
                >
                    {props.children}
                </div>
            </details>
        );
    };
}

/** Default popover implementation using native <details>/<summary>. */
export const DefaultPopover: PopoverComponent = createIconPopover((name) =>
    name === 'outline-chevron-down' ? (
        <span data-testid="popover-chevron">▾</span>
    ) : (
        <span data-testid="popover-icon">{name}</span>
    ),
);

/**
 * Creates a popover renderer that uses the host's Popover component or falls back to the default.
 * @param hostPopover - Host's Popover component (optional)
 * @returns Function that renders a popover
 */
export function createPopoverRenderer(hostPopover?: PopoverComponent): PopoverComponent {
    if (hostPopover) return hostPopover;
    return DefaultPopover;
}
