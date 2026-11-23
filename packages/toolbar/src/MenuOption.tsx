import type { JSX } from 'solid-js';

export interface MenuOptionProps {
    label: string;
    onClick: () => void;
    pressed?: boolean;
    disabled?: boolean;
    slot?: string;
    value?: string;
    title?: string;
    ariaLabel?: string;
    keepOpen?: boolean;
    class?: string;
}

const BASE_CLASS =
    'flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover';

/** A toolbar menu row. Closes the containing details menu unless it must stay open. */
export function MenuOption(props: MenuOptionProps): JSX.Element {
    return (
        <button
            type="button"
            data-slot={props.slot}
            data-value={props.value}
            class={props.class ?? BASE_CLASS}
            aria-pressed={props.pressed}
            aria-label={props.ariaLabel}
            disabled={props.disabled}
            title={props.title}
            onClick={(event) => {
                if (!props.keepOpen) {
                    const menu = event.currentTarget.closest('details');
                    if (menu) menu.open = false;
                }
                props.onClick();
            }}
        >
            {props.label}
        </button>
    );
}

/** A menu row whose accessible name falls back to its label. */
export const menuOption = (input: MenuOptionProps, className?: string): JSX.Element =>
    MenuOption({
        ...input,
        class: className ?? input.class,
        ariaLabel: input.ariaLabel ?? input.label,
    });
