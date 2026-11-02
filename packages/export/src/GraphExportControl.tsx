import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import type { RenderModel } from '@spacegraphjs/renderer';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import { createPopoverRenderer, type PopoverComponent } from '@spacegraphjs/shared/popover';
import type { I18n } from '@spacegraphjs/shared/i18n';

export interface GraphExportControlProps {
    onExport?: (format: 'svg' | 'json' | 'html', model: RenderModel) => void;
    renderModel?: RenderModel;
    onCopyView?: () => void;
    t: I18n['t'];
    plural: I18n['plural'];
    Icon?: IconComponent;
    Popover?: PopoverComponent;
}

const ToolbarMenu = (props: {
    slot: string;
    label: string;
    icon: string;
    value?: string;
    valueSlot?: string;
    align?: 'start' | 'end';
    children: JSX.Element;
    Popover?: PopoverComponent;
    Icon?: IconComponent;
}) => {
    const PopoverComponent = props.Popover ?? createPopoverRenderer();
    const IconComponent = props.Icon ?? createIconRenderer();

    return (
        <PopoverComponent
            slot={props.slot}
            label={props.label}
            icon={props.icon}
            value={props.value}
            valueSlot={props.valueSlot}
            align={props.align}
        >
            {props.children}
        </PopoverComponent>
    );
};

const option = (input: {
    label: string;
    onClick: () => void;
    slot?: string;
    value?: string;
    Icon: IconComponent;
}) => (
    <button
        type="button"
        data-slot={input.slot}
        data-value={input.value}
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
        onClick={(event) => {
            const menu = event.currentTarget.closest('details');
            if (menu) menu.removeAttribute('open');
            input.onClick();
        }}
    >
        {input.label}
    </button>
);

export const GraphExportControl = (props: GraphExportControlProps): JSX.Element => {
    const { onExport, renderModel, onCopyView, t, plural, Icon, Popover } = props;
    const renderIcon = Icon ?? createIconRenderer();
    const PopoverComponent = Popover ?? createPopoverRenderer();

    return (
        <>
            <Show when={onCopyView}>
                <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:text-text-strong hover:bg-surface-base-hover"
                    aria-label={t('ui.toolbar.copyView')}
                    onClick={() => onCopyView?.()}
                >
                    {renderIcon({ name: 'outline-copy', size: 'small' })}
                </button>
            </Show>
            <Show when={onExport && renderModel}>
                <ToolbarMenu
                    slot="graph-toolbar-export"
                    label={t('ui.toolbar.export')}
                    icon="outline-share"
                    Popover={PopoverComponent}
                    Icon={renderIcon}
                >
                    {option({
                        label: t('ui.toolbar.exportSvg'),
                        onClick: () => onExport?.('svg', renderModel!),
                        slot: 'graph-export-option',
                        value: 'svg',
                        Icon: renderIcon,
                    })}
                    {option({
                        label: t('ui.toolbar.exportJson'),
                        onClick: () => onExport?.('json', renderModel!),
                        slot: 'graph-export-option',
                        value: 'json',
                        Icon: renderIcon,
                    })}
                    {option({
                        label: t('ui.toolbar.exportHtml'),
                        onClick: () => onExport?.('html', renderModel!),
                        slot: 'graph-export-option',
                        value: 'html',
                        Icon: renderIcon,
                    })}
                </ToolbarMenu>
            </Show>
        </>
    );
};
