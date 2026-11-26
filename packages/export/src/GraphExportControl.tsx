import { Show } from 'solid-js';
import type { JSX } from 'solid-js';
import type { RenderModel } from '@spacegraphjs/renderer';
import { menuOption } from '@spacegraphjs/shared/menu';
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

export const GraphExportControl = (props: GraphExportControlProps): JSX.Element => {
    const { onExport, renderModel, onCopyView, t, Icon, Popover } = props;
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
                <PopoverComponent
                    slot="graph-toolbar-export"
                    label={t('ui.toolbar.export')}
                    icon="outline-share"
                >
                    {menuOption({
                        label: t('ui.toolbar.exportSvg'),
                        onClick: () => onExport?.('svg', renderModel!),
                        slot: 'graph-export-option',
                        value: 'svg',
                    })}
                    {menuOption({
                        label: t('ui.toolbar.exportJson'),
                        onClick: () => onExport?.('json', renderModel!),
                        slot: 'graph-export-option',
                        value: 'json',
                    })}
                    {menuOption({
                        label: t('ui.toolbar.exportHtml'),
                        onClick: () => onExport?.('html', renderModel!),
                        slot: 'graph-export-option',
                        value: 'html',
                    })}
                </PopoverComponent>
            </Show>
        </>
    );
};
