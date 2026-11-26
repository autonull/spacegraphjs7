/**
 * GraphLayoutControl - Layout selector for the toolbar.
 */

import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { menuOption } from '@spacegraphjs/shared/menu';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import { createPopoverRenderer, type PopoverComponent } from '@spacegraphjs/shared/popover';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { Layout } from '@spacegraphjs/shared/types';
import { ToolbarMenu } from './ToolbarMenu';
import { LAYOUTS, VOCABULARY_KEYS } from '@spacegraphjs/shared/types';

export interface GraphLayoutControlProps {
    layout?: Layout;
    onLayoutChange?: (layout: Layout) => void;
    i18n: I18n;
    Icon?: IconComponent;
    Popover?: PopoverComponent;
}

export function GraphLayoutControl(props: GraphLayoutControlProps): JSX.Element {
    const { layout, onLayoutChange, i18n, Popover } = props;
    const PopoverComponent = Popover ?? createPopoverRenderer();

    return (
        <Show when={onLayoutChange}>
            <ToolbarMenu
                slot="graph-toolbar-layout"
                label={i18n.t('ui.toolbar.layout')}
                icon="workspace-isolated"
                value={i18n.t(VOCABULARY_KEYS.layout[layout ?? 'lanes'])}
                valueSlot="graph-layout-name"
                Popover={PopoverComponent}
            >
                {LAYOUTS.map((layout) =>
                    menuOption({
                        label: i18n.t(VOCABULARY_KEYS.layout[layout]),
                        slot: 'graph-layout-option',
                        value: layout,
                        pressed: props.layout === layout,
                        onClick: () => onLayoutChange?.(layout),
                    }),
                )}
            </ToolbarMenu>
        </Show>
    );
}
