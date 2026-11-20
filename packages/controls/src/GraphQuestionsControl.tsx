import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { PopoverComponent } from '@spacegraphjs/shared/popover';
import type { JSX } from 'solid-js';
import { GraphQuestionsControl as ToolbarQuestionsControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphQuestionsControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Callback to dispatch a command. */
    dispatchCommand?: (command: string) => void;
};
const legacyPopover = (Icon?: IconComponent): PopoverComponent => (props) => {
    const renderIcon = createIconRenderer(Icon);
    return (
        <details class="relative" data-slot={props.slot}>
            <summary
                class="flex h-6 cursor-pointer list-none items-center gap-1 rounded-sm px-1 text-12-regular text-text-base hover:bg-surface-base-hover [&::-webkit-details-marker]:hidden"
                aria-label={props.label}
                title={props.label}
            >
                {renderIcon({ name: props.icon, size: 'small' })}
                {props.value ? (
                    <span data-slot={props.valueSlot ?? `${props.slot}-value`}>{props.value}</span>
                ) : null}
                {props.value ? renderIcon({ name: 'outline-chevron-down', size: 'small' }) : null}
            </summary>
            <div
                class="absolute z-30 mt-1 flex min-w-[180px] flex-col items-start gap-2 rounded-sm border border-border-weaker-base bg-surface-base p-2 shadow-md"
                classList={{ 'start-0': props.align === 'start', 'end-0': props.align !== 'start' }}
            >
                {props.children}
            </div>
        </details>
    );
};

export const GraphQuestionsControl = (props: GraphQuestionsControlProps): JSX.Element => {
    const { i18n, Icon, ...rest } = props;
    return (
        <ToolbarQuestionsControl
            {...rest}
            i18n={legacyI18n(i18n)}
            Icon={Icon}
            Popover={legacyPopover(Icon)}
        />
    );
};