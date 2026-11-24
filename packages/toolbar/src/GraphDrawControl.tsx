/**
 * GraphDrawControl - Drawing options for the toolbar (billboard, frame, files, equalizer, arrangement).
 */

import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import type { PopoverComponent } from '@spacegraphjs/shared/popover';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { RendererCapabilities, GraphArrangement, GraphSide } from '@spacegraphjs/shared/types';
import { menuOption } from './MenuOption';
import { GRAPH_ARRANGEMENTS, VOCABULARY_KEYS } from '@spacegraphjs/shared/types';

export interface GraphDrawControlProps {
    capabilities?: RendererCapabilities;
    billboard?: boolean;
    onToggleBillboard?: () => void;
    detailFraming?: 'off' | 'card';
    onDetailFramingChange?: (framing: 'off' | 'card') => void;
    files?: boolean;
    onToggleFiles?: () => void;
    onOpenEqualizer?: () => void;
    arrangement?: GraphArrangement;
    onArrangementChange?: (arrangement: GraphArrangement) => void;
    arrangementSide?: GraphSide;
    onArrangementSideChange?: (side: GraphSide) => void;
    i18n: I18n;
    Icon?: IconComponent;
    Popover?: PopoverComponent;
}

export function GraphDrawControl(props: GraphDrawControlProps): JSX.Element {
    const { i18n, ...rest } = props;

    return (
        <>
            <Show when={rest.capabilities?.cardFacing && rest.onToggleBillboard}>
                {menuOption({
                    label: i18n.t(
                        rest.billboard ? 'ui.toolbar.billboard' : 'ui.toolbar.billboardOff',
                    ),
                    onClick: () => rest.onToggleBillboard?.(),
                    pressed: rest.billboard,
                    slot: 'graph-billboard-option',
                    ariaLabel: i18n.t('ui.toolbar.billboard'),
                    keepOpen: true,
                })}
            </Show>
            <Show when={rest.onDetailFramingChange}>
                {menuOption({
                    label: i18n.t(
                        rest.detailFraming === 'card'
                            ? 'ui.toolbar.frameNode'
                            : 'ui.toolbar.frameNodeOff',
                    ),
                    onClick: () =>
                        rest.onDetailFramingChange?.(
                            rest.detailFraming === 'card' ? 'off' : 'card',
                        ),
                    pressed: rest.detailFraming === 'card',
                    slot: 'graph-frame-node-option',
                    ariaLabel: i18n.t('ui.toolbar.frameNode'),
                    keepOpen: true,
                })}
            </Show>
            <Show when={rest.onToggleFiles}>
                {menuOption({
                    label: i18n.t('ui.toolbar.files'),
                    onClick: () => rest.onToggleFiles?.(),
                    pressed: rest.files,
                    slot: 'graph-files-option',
                    keepOpen: true,
                })}
            </Show>
            <Show when={rest.onOpenEqualizer}>
                {menuOption({
                    label: i18n.t('ui.toolbar.equalizer'),
                    onClick: () => rest.onOpenEqualizer?.(),
                    slot: 'graph-equalizer-option',
                })}
            </Show>
            <Show when={rest.onArrangementChange}>
                <div data-slot="graph-toolbar-arrangement">
                    <div class="px-2 py-1 text-12-regular text-text-weak">
                        {i18n.t('ui.toolbar.arrangement')}
                    </div>
                    {GRAPH_ARRANGEMENTS.map((arrangement) =>
                        menuOption({
                            label: i18n.t(VOCABULARY_KEYS.arrangement[arrangement]),
                            onClick: () => rest.onArrangementChange?.(arrangement),
                            pressed: rest.arrangement === arrangement,
                            slot: 'graph-arrangement-option',
                            value: arrangement,
                        }),
                    )}
                    <Show when={rest.onArrangementSideChange && rest.arrangement !== 'floating'}>
                        {menuOption({
                            label: i18n.t(VOCABULARY_KEYS.side[rest.arrangementSide ?? 'start']),
                            onClick: () =>
                                rest.onArrangementSideChange?.(
                                    rest.arrangementSide === 'start' ? 'end' : 'start',
                                ),
                            pressed: rest.arrangementSide === 'start',
                            slot: 'graph-arrangement-side-option',
                            ariaLabel: i18n.t('ui.toolbar.arrangementSide'),
                            keepOpen: true,
                        })}
                    </Show>
                </div>
            </Show>
        </>
    );
}
