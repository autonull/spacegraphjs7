/**
 * GraphLayoutControl - Layout selector for the toolbar.
 */

import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
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
    const { layout, onLayoutChange, i18n, Icon, Popover } = props;
    const renderIcon = Icon ?? createIconRenderer();
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
                {LAYOUTS.map((layout) => (
                    <button
                        type="button"
                        data-slot="graph-layout-option"
                        data-value={layout}
                        class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
                        aria-pressed={props.layout === layout}
                        onClick={(event) => {
                            const menu = event.currentTarget.closest('details');
                            if (menu) menu.open = false;
                            onLayoutChange?.(layout);
                        }}
                    >
                        {i18n.t(VOCABULARY_KEYS.layout[layout])}
                    </button>
                ))}
            </ToolbarMenu>
        </Show>
    );
}
