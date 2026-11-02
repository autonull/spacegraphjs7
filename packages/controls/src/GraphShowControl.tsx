import { DETAIL_MODES, type DetailMode, VOCABULARY_KEYS } from '@spacegraphjs/shared/types';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { Show, type JSX } from 'solid-js';

export type GraphShowControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Manual history length for undo button. */
    manualHistoryLength?: number;
    /** Manual future length for redo button. */
    manualFutureLength?: number;
    /** Callback for undo. */
    onUndoManual?: () => void;
    /** Callback for redo. */
    onRedoManual?: () => void;
    /** Current detail mode. */
    detailMode?: DetailMode;
    /** Callback when detail mode changes. */
    onDetailModeChange?: (mode: DetailMode) => void;
    /** Whether peek is enabled. */
    peek?: boolean;
    /** Callback to toggle peek. */
    onTogglePeek?: () => void;
    /** Whether follow log is enabled. */
    followLog?: boolean;
    /** Callback when follow log changes. */
    onFollowLogChange?: (follow: boolean) => void;
    /** Callback to open a window. */
    onOpenWindow?: (kind: string, nodeID?: string) => void;
    /** The graph model (for filesystem button). */
    model?: { workspaceRoot?: string };
    /** Whether legend is open. */
    legend?: boolean;
    /** Callback to toggle legend. */
    onToggleLegend?: () => void;
    /** Whether gallery is open. */
    gallery?: boolean;
    /** Callback to toggle gallery. */
    onToggleGallery?: () => void;
    /** Callback for turn map. */
    onTurnMap?: () => void;
    /** Callback to expand graph. */
    onExpandGraph?: () => void;
    /** Optional vocabulary keys for custom i18n keys. */
    vocabularyKeys?: Partial<typeof VOCABULARY_KEYS>;
};

const option = (input: {
    label: string;
    onClick: () => void;
    pressed?: boolean;
    slot?: string;
    keepOpen?: boolean;
    ariaLabel?: string;
    value?: string;
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

export const GraphShowControl = (props: GraphShowControlProps) => {
    const { i18n, Icon, vocabularyKeys, ...rest } = props;
    const vocab = vocabularyKeys ?? VOCABULARY_KEYS;
    const renderIcon = createIconRenderer(Icon);

    return (
        <>
            <Show
                when={
                    rest.manualHistoryLength !== undefined || rest.manualFutureLength !== undefined
                }
            >
                <div data-slot="graph-toolbar-manual-history">
                    <GraphIconButton
                        label={i18n.t('ui.sessionGraph.toolbar.undo')}
                        icon="outline-undo"
                        onClick={rest.onUndoManual ?? (() => {})}
                        disabled={(rest.manualHistoryLength ?? 0) === 0}
                        slot="graph-undo-option"
                        Icon={Icon}
                    />
                    <GraphIconButton
                        label={i18n.t('ui.sessionGraph.toolbar.redo')}
                        icon="outline-redo"
                        onClick={rest.onRedoManual ?? (() => {})}
                        disabled={(rest.manualFutureLength ?? 0) === 0}
                        slot="graph-redo-option"
                        Icon={Icon}
                    />
                </div>
            </Show>
            <Show when={rest.onDetailModeChange}>
                <div data-slot="graph-toolbar-detail">
                    <div class="px-2 py-1 text-12-regular text-text-weak">
                        {i18n.t('ui.sessionGraph.toolbar.detailMode')}
                    </div>
                    {DETAIL_MODES.map((mode) =>
                        option({
                            label: i18n.t(
                                vocab.detailMode?.[mode] ?? `ui.sessionGraph.detailMode.${mode}`,
                            ),
                            onClick: () => rest.onDetailModeChange?.(mode),
                            pressed: rest.detailMode === mode,
                            slot: 'graph-detail-mode-option',
                            value: mode,
                            Icon,
                        }),
                    )}
                </div>
            </Show>
            <Show when={rest.onTogglePeek}>
                {option({
                    label: i18n.t('ui.sessionGraph.toolbar.peek'),
                    onClick: () => rest.onTogglePeek?.(),
                    pressed: rest.peek,
                    slot: 'graph-peek-option',
                    keepOpen: true,
                    Icon,
                })}
            </Show>
            <Show when={rest.onFollowLogChange}>
                {option({
                    label: rest.followLog
                        ? i18n.t('ui.sessionGraph.toolbar.followLog')
                        : i18n.t('ui.sessionGraph.toolbar.followLogOff'),
                    onClick: () => rest.onFollowLogChange?.(!rest.followLog),
                    pressed: rest.followLog,
                    slot: 'graph-follow-log-option',
                    keepOpen: true,
                    ariaLabel: i18n.t('ui.sessionGraph.toolbar.followLog'),
                    Icon,
                })}
            </Show>
            <Show when={rest.onOpenWindow}>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.toolbar.minimap')}
                    icon="layout-bottom"
                    onClick={() => rest.onOpenWindow?.('minimap')}
                    Icon={Icon}
                />
            </Show>
            <Show when={rest.onOpenWindow && rest.model?.workspaceRoot}>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.toolbar.filesystem')}
                    icon="folder-tree"
                    onClick={() => rest.onOpenWindow?.('filesystem')}
                    Icon={Icon}
                />
            </Show>
            <Show when={rest.onToggleLegend}>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.toolbar.legend')}
                    icon="outline-sliders"
                    pressed={rest.legend}
                    onClick={() => rest.onToggleLegend?.()}
                    Icon={Icon}
                />
            </Show>
            <Show when={rest.onToggleGallery}>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.toolbar.gallery')}
                    icon="dot-grid"
                    pressed={rest.gallery}
                    onClick={() => rest.onToggleGallery?.()}
                    Icon={Icon}
                />
            </Show>
            <Show when={rest.onTurnMap}>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.toolbar.turnMap')}
                    icon="outline-worktree"
                    onClick={() => rest.onTurnMap?.()}
                    Icon={Icon}
                />
            </Show>
            <Show when={rest.onExpandGraph}>
                <GraphIconButton
                    label={i18n.t('ui.sessionGraph.toolbar.expandGraph')}
                    icon="arrow-up-right"
                    onClick={() => rest.onExpandGraph?.()}
                    Icon={Icon}
                />
            </Show>
        </>
    );
};

const GraphIconButton = (props: {
    label: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
    pressed?: boolean;
    slot?: string;
    Icon?: IconComponent;
}): JSX.Element => {
    const renderIcon = createIconRenderer(props.Icon);
    return (
        <button
            type="button"
            data-slot={props.slot}
            class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
            aria-label={props.label}
            aria-pressed={props.pressed}
            disabled={props.disabled}
            onClick={props.onClick}
        >
            {renderIcon({ name: props.icon, size: 'small' })}
        </button>
    );
};
