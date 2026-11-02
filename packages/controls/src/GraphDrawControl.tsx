import {
    GRAPH_ARRANGEMENTS,
    type GraphArrangement,
    type GraphSide,
    VOCABULARY_KEYS,
    type RendererCapabilities,
} from '@spacegraphjs/shared';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { Show, type JSX } from 'solid-js';

export type GraphDrawControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Renderer capabilities. */
    capabilities?: RendererCapabilities;
    /** Whether billboard mode is enabled. */
    billboard?: boolean;
    /** Callback to toggle billboard. */
    onToggleBillboard?: () => void;
    /** Detail framing mode. */
    detailFraming?: 'off' | 'card';
    /** Callback when detail framing changes. */
    onDetailFramingChange?: (framing: 'off' | 'card') => void;
    /** Whether files are shown. */
    files?: boolean;
    /** Callback to toggle files. */
    onToggleFiles?: () => void;
    /** Callback to open equalizer. */
    onOpenEqualizer?: () => void;
    /** Current arrangement. */
    arrangement?: GraphArrangement;
    /** Callback when arrangement changes. */
    onArrangementChange?: (arrangement: GraphArrangement) => void;
    /** Current arrangement side. */
    arrangementSide?: GraphSide;
    /** Callback when arrangement side changes. */
    onArrangementSideChange?: (side: GraphSide) => void;
    /** Optional vocabulary keys for custom i18n keys. */
    vocabularyKeys?: Partial<typeof VOCABULARY_KEYS>;
};

const option = (input: {
    label: string;
    onClick: () => void;
    pressed?: boolean;
    slot?: string;
    value?: string;
    keepOpen?: boolean;
    ariaLabel?: string;
    Icon?: IconComponent;
}): JSX.Element => {
    const renderIcon = createIconRenderer(input.Icon);
    return (
        <button
            type="button"
            data-slot={input.slot}
            data-value={input.value}
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
            aria-pressed={input.pressed}
            aria-label={input.ariaLabel ?? input.label}
            onClick={(event) => {
                if (!input.keepOpen) {
                    const menu = event.currentTarget.closest('details');
                    if (menu) menu.open = false;
                }
                input.onClick();
            }}
        >
            {input.label}
        </button>
    );
};

export const GraphDrawControl = (props: GraphDrawControlProps) => {
    const { i18n, Icon, vocabularyKeys, ...rest } = props;
    const vocab = vocabularyKeys ?? VOCABULARY_KEYS;
    const renderIcon = createIconRenderer(Icon);

    return (
        <>
            <Show when={rest.capabilities?.cardFacing && rest.onToggleBillboard}>
                {option({
                    label: i18n.t(
                        rest.billboard
                            ? 'ui.sessionGraph.toolbar.billboard'
                            : 'ui.sessionGraph.toolbar.billboardOff',
                    ),
                    onClick: () => rest.onToggleBillboard?.(),
                    pressed: rest.billboard,
                    slot: 'graph-billboard-option',
                    ariaLabel: i18n.t('ui.sessionGraph.toolbar.billboard'),
                    keepOpen: true,
                    Icon,
                })}
            </Show>
            <Show when={rest.onDetailFramingChange}>
                {option({
                    label: i18n.t(
                        rest.detailFraming === 'card'
                            ? 'ui.sessionGraph.toolbar.frameNode'
                            : 'ui.sessionGraph.toolbar.frameNodeOff',
                    ),
                    onClick: () =>
                        rest.onDetailFramingChange?.(
                            rest.detailFraming === 'card' ? 'off' : 'card',
                        ),
                    pressed: rest.detailFraming === 'card',
                    slot: 'graph-frame-node-option',
                    ariaLabel: i18n.t('ui.sessionGraph.toolbar.frameNode'),
                    keepOpen: true,
                    Icon,
                })}
            </Show>
            <Show when={rest.onToggleFiles}>
                {option({
                    label: i18n.t('ui.sessionGraph.toolbar.files'),
                    onClick: () => rest.onToggleFiles?.(),
                    pressed: rest.files,
                    slot: 'graph-files-option',
                    keepOpen: true,
                    Icon,
                })}
            </Show>
            <Show when={rest.onOpenEqualizer}>
                {option({
                    label: i18n.t('ui.sessionGraph.toolbar.equalizer'),
                    onClick: () => rest.onOpenEqualizer?.(),
                    slot: 'graph-equalizer-option',
                    Icon,
                })}
            </Show>
            <Show when={rest.onArrangementChange}>
                <div data-slot="graph-toolbar-arrangement">
                    <div class="px-2 py-1 text-12-regular text-text-weak">
                        {i18n.t('ui.sessionGraph.toolbar.arrangement')}
                    </div>
                    {GRAPH_ARRANGEMENTS.map((arrangement) =>
                        option({
                            label: i18n.t(
                                vocab.arrangement?.[arrangement] ??
                                    `ui.sessionGraph.arrangement.${arrangement}`,
                            ),
                            onClick: () => rest.onArrangementChange?.(arrangement),
                            pressed: rest.arrangement === arrangement,
                            slot: 'graph-arrangement-option',
                            value: arrangement,
                            Icon,
                        }),
                    )}
                    <Show when={rest.onArrangementSideChange && rest.arrangement !== 'floating'}>
                        {option({
                            label: i18n.t(
                                vocab.side?.[rest.arrangementSide ?? 'start'] ??
                                    `ui.sessionGraph.arrangement.side.${rest.arrangementSide ?? 'start'}`,
                            ),
                            onClick: () =>
                                rest.onArrangementSideChange?.(
                                    rest.arrangementSide === 'start' ? 'end' : 'start',
                                ),
                            pressed: rest.arrangementSide === 'start',
                            slot: 'graph-arrangement-side-option',
                            ariaLabel: i18n.t('ui.sessionGraph.toolbar.arrangementSide'),
                            keepOpen: true,
                            Icon,
                        })}
                    </Show>
                </div>
            </Show>
        </>
    );
};
