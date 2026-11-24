/**
 * ToolbarMenu - A dropdown menu for the toolbar.
 * Uses native <details>/<summary> for accessibility.
 */

import type { JSX } from 'solid-js';
import {
    DefaultPopover,
    type PopoverComponent,
    type PopoverProps,
} from '@spacegraphjs/shared/popover';

export interface ToolbarMenuProps extends Omit<PopoverProps, 'open' | 'onOpenChange'> {
    /** Custom popover component (optional). */
    Popover?: PopoverComponent;
}

/**
 * Default toolbar menu using native details/summary.
 * Hosts can provide their own Popover and Icon components via props.
 */
export function ToolbarMenu(props: ToolbarMenuProps): JSX.Element {
    const { slot, label, icon, value, valueSlot, align = 'start', children, Popover } = props;

    const PopoverComponent = Popover ?? DefaultPopover;

    return (
        <PopoverComponent
            slot={slot}
            label={label}
            icon={icon}
            value={value}
            valueSlot={valueSlot}
            align={align}
        >
            {children}
        </PopoverComponent>
    );
}
