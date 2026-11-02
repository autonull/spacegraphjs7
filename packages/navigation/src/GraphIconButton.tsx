import type { IconProps, IconComponent } from '@spacegraphjs/shared';
import { createIconRenderer } from '@spacegraphjs/shared';

export type GraphIconButtonProps = {
    label: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
    /** Custom icon renderer. */
    Icon?: IconComponent;
};

export const GraphIconButton = (props: GraphIconButtonProps) => {
    const Icon = props.Icon ?? createIconRenderer();
    return (
        <button
            type="button"
            disabled={props.disabled}
            class="shrink-0 rounded-sm p-1 text-text-weak hover:text-text-strong hover:bg-surface-base-hover disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={props.label}
            onClick={props.onClick}
        >
            <Icon name={props.icon} size="small" class="h-4 w-4" />
        </button>
    );
};
