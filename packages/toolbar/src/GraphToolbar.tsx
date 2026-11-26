/**
 * GraphToolbar - Main toolbar component for graph views.
 * Composes all sub-controls: layers, layout, time, draw, show, zoom, export, questions.
 */

import type { JSX } from 'solid-js';
import {
    createIconRenderer,
    GraphIconButton,
    type IconComponent,
    type I18n,
} from '@spacegraphjs/shared';
import { ToolbarMenu } from './ToolbarMenu';
import { GraphLayersControl, type GraphLayersControlProps } from './GraphLayersControl';
import { GraphLayoutControl } from './GraphLayoutControl';
import { GraphTimeControl } from './GraphTimeControl';
import { GraphDrawControl, type GraphDrawControlProps } from './GraphDrawControl';
import { GraphShowControl, type GraphShowControlProps } from './GraphShowControl';
import { GraphZoomControl } from './GraphZoomControl';
import { GraphExportControl } from '@spacegraphjs/export';
import { GraphQuestionsControl } from './GraphQuestionsControl';
import type { RenderModel } from '@spacegraphjs/renderer';
import type {
    GraphViewData,
    Layout,
    GraphSide,
    GraphArrangement,
    DetailMode,
    DetailFraming,
} from '@spacegraphjs/shared/types';

export interface GraphToolbarProps
    extends Omit<GraphLayersControlProps, 'model' | 'i18n' | 'Icon' | 'Popover'> {
    /** Current checkpoint/turn index. */
    checkpoint?: number;
    /** Total turn count. */
    turnCount?: number;
    /** Callback when checkpoint changes. */
    onCheckpoint?: (index: number) => void;
    /** Fit to content callback. */
    onFit: () => void;
    /** Camera zoom percentage. */
    zoomPercent?: number;
    /** Zoom out callback. */
    onZoomOut?: () => void;
    /** Zoom in callback. */
    onZoomIn?: () => void;
    /** Whether zoom out is disabled. */
    zoomOutDisabled?: boolean;
    /** Whether zoom in is disabled. */
    zoomInDisabled?: boolean;
    /** Search callback. */
    onSearch: () => void;
    /** Copy view as permalink callback. */
    onCopyView?: () => void;
    /** Dispatch command callback. */
    dispatchCommand?: (command: string) => void;
    /** Current layout. */
    layout?: Layout;
    /** Layout change callback. */
    onLayoutChange?: (layout: Layout) => void;
    /** Files lens toggle. */
    files?: boolean;
    /** Toggle files callback. */
    onToggleFiles?: () => void;
    /** Hybrid arrangement. */
    arrangement?: GraphArrangement;
    /** Arrangement change callback. */
    onArrangementChange?: (arrangement: GraphArrangement) => void;
    /** Arrangement side. */
    arrangementSide?: GraphSide;
    /** Arrangement side change callback. */
    onArrangementSideChange?: (side: GraphSide) => void;
    /** Open equalizer callback. */
    onOpenEqualizer?: () => void;
    /** Detail mode. */
    detailMode?: DetailMode;
    /** Detail mode change callback. */
    onDetailModeChange?: (mode: DetailMode) => void;
    /** Detail framing. */
    detailFraming?: DetailFraming;
    /** Detail framing change callback. */
    onDetailFramingChange?: (framing: DetailFraming) => void;
    /** Peek toggle. */
    peek?: boolean;
    /** Toggle peek callback. */
    onTogglePeek?: () => void;
    /** Turn map callback. */
    onTurnMap?: () => void;
    /** Expand graph callback. */
    onExpandGraph?: () => void;
    /** Export callback. */
    onExport?: (format: 'svg' | 'json' | 'html', model: RenderModel) => void;
    /** Current render model for export. */
    renderModel?: RenderModel;
    /** Back navigation callback. */
    onBack?: () => void;
    /** Split view callback. */
    onSplitView?: () => void;
    /** Whether search is active. */
    searching?: boolean;
    /** Compact mode for narrow widths. */
    compact?: boolean;
    /** Legend toggle. */
    legend?: boolean;
    /** Toggle legend callback. */
    onToggleLegend?: () => void;
    /** Gallery toggle. */
    gallery?: boolean;
    /** Toggle gallery callback. */
    onToggleGallery?: () => void;
    /** Billboard toggle. */
    billboard?: boolean;
    /** Toggle billboard callback. */
    onToggleBillboard?: () => void;
    /** Open window callback. */
    onOpenWindow?: (kind: string, nodeID?: string) => void;
    /** Follow log toggle. */
    followLog?: boolean;
    /** Follow log change callback. */
    onFollowLogChange?: (follow: boolean) => void;
    /** P1.3: Neighborhood focus mode toggle. */
    focus?: boolean;
    /** Focus mode change callback. */
    onToggleFocus?: () => void;
    /** Manual position history length. */
    manualHistoryLength?: number;
    /** Manual position future length. */
    manualFutureLength?: number;
    /** Undo manual callback. */
    onUndoManual?: () => void;
    /** Redo manual callback. */
    onRedoManual?: () => void;
    /** End inset for floating chrome. */
    endInset?: string;
    /** Graph model for domain presence. */
    model?: GraphViewData;
    /** Internationalization functions. */
    i18n: I18n;
    /** Custom icon renderer. */
    Icon?: IconComponent;
    /** Custom popover component. */
    Popover?: (props: {
        slot: string;
        label: string;
        icon: string;
        value?: string;
        valueSlot?: string;
        align?: 'start' | 'end';
        children: JSX.Element;
        Icon?: IconComponent;
    }) => JSX.Element;
}

/**
 * Graph toolbar (U3.9). It owns no graph state; it renders the semantic level, projection, and the
 * commands the host supplies. Capability gaps are disabled with an explanation, never hidden.
 *
 * The row is organised by axis, not by kind. Four things are inline (what is shown, where
 * the camera is) and everything else is one click away: "Draw" holds how the map is drawn, "Show"
 * holds what it says, and the commands sit at the end.
 */
export function GraphToolbar(props: GraphToolbarProps): JSX.Element {
    return (
        <div
            data-component="spacegraph-toolbar"
            data-slot="graph-toolbar"
            class="flex flex-wrap items-center gap-2 border-b border-border-weaker-base px-2 py-1.5"
            style={props.endInset ? { 'padding-inline-end': props.endInset } : undefined}
        >
            <GraphLayersControl {...props} />
            <GraphLayoutControl {...props} />
            <GraphTimeControl {...props} />
            <GraphToolbarViewControls {...props} />
            <GraphToolbarCommandControls {...props} />
        </div>
    );
}

/**
 * View controls group (Draw, Show, Export, Questions).
 * Separated for compact mode handling.
 */
type GraphToolbarViewControlsProps = GraphDrawControlProps &
    GraphShowControlProps & {
        compact?: boolean;
        onSearch?: () => void;
        searching?: boolean;
        onExport?: (format: 'svg' | 'json' | 'html', model: RenderModel) => void;
        renderModel?: RenderModel;
        onCopyView?: () => void;
        dispatchCommand?: (command: string) => void;
    };

function GraphToolbarViewControls(props: GraphToolbarViewControlsProps): JSX.Element {
    const { compact, i18n, Icon, Popover, ...rest } = props;

    const menu = compact
        ? { slot: 'graph-toolbar-overflow', label: i18n.t('ui.toolbar.more'), icon: 'outline-dots' }
        : { slot: 'graph-toolbar-view', label: i18n.t('ui.toolbar.view'), icon: 'outline-sliders' };

    return (
        <ToolbarMenu {...menu}>
            <GraphToolbarViewControlsInner
                {...rest}
                i18n={i18n}
                Icon={Icon}
                Popover={Popover}
            />
            <GraphToolbarCommandControlsInner {...rest} i18n={i18n} Icon={Icon} />
        </ToolbarMenu>
    );
}

function GraphToolbarViewControlsInner(props: GraphToolbarViewControlsProps): JSX.Element {
    const { i18n, Icon, Popover, ...rest } = props;

    return (
        <>
            <div data-slot="graph-toolbar-draw-group">
                <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                    {i18n.t('ui.toolbar.draw')}
                </div>
                <GraphDrawControl {...rest} i18n={i18n} Icon={Icon} Popover={Popover} />
            </div>
            <div data-slot="graph-toolbar-show-group">
                <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                    {i18n.t('ui.toolbar.show')}
                </div>
                <GraphShowControl {...rest} i18n={i18n} Icon={Icon} Popover={Popover} />
            </div>
        </>
    );
}

function GraphToolbarCommandControlsInner(props: GraphToolbarViewControlsProps): JSX.Element {
    const {
        i18n,
        Icon,
        Popover,
        onSearch,
        searching,
        dispatchCommand,
        onExport,
        renderModel,
        onCopyView,
    } = props;

    const renderIcon = Icon ?? createIconRenderer();

    return (
        <>
            {onSearch && (
                <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
                    onClick={onSearch}
                    aria-label={i18n.t('ui.toolbar.search')}
                    aria-pressed={searching ?? false}
                >
                    {renderIcon({ name: 'magnifying-glass', size: 'small' })}
                </button>
            )}
            {dispatchCommand && (
                <GraphQuestionsControl
                    dispatchCommand={dispatchCommand}
                    i18n={i18n}
                    Icon={renderIcon}
                    Popover={Popover}
                />
            )}
            {onExport && (
                <GraphExportControl
                    onExport={onExport}
                    renderModel={renderModel}
                    onCopyView={onCopyView}
                    t={i18n.t}
                    plural={i18n.plural}
                    Icon={renderIcon}
                    Popover={Popover}
                />
            )}
        </>
    );
}

/**
 * Command controls group (Zoom, Fit, Split, Back).
 */
interface GraphToolbarCommandControlsProps {
    zoomPercent?: number;
    onZoomOut?: () => void;
    onZoomIn?: () => void;
    zoomOutDisabled?: boolean;
    zoomInDisabled?: boolean;
    onFit: () => void;
    onSplitView?: () => void;
    onBack?: () => void;
    renderer?: string;
    compact?: boolean;
    endInset?: string;
    i18n: I18n;
    Icon?: IconComponent;
}


const RENDERER_LABELS: Record<string, string> = {
    spacegraph: 'SpaceGraph',
    cytoscape: 'Cytoscape',
};

function GraphToolbarCommandControls(props: GraphToolbarCommandControlsProps): JSX.Element {
    const { i18n, Icon, ...rest } = props;

    return (
        <>
            <GraphZoomControl {...rest} i18n={i18n} Icon={Icon} />
            <GraphIconButton
                icon="expand"
                label={i18n.t('ui.toolbar.fit')}
                onClick={rest.onFit}
                Icon={Icon}
            />

            {rest.onSplitView && (
                <GraphRendererStatus
                    renderer={rest.renderer}
                    compact={rest.compact}
                    onSplitView={rest.onSplitView}
                    onBack={rest.onBack}
                    endInset={rest.endInset}
                    i18n={i18n}
                    Icon={Icon}
                />
            )}
        </>
    );
}

/**
 * Renderer status display with split/back buttons.
 */
interface GraphRendererStatusProps {
    renderer?: string;
    compact?: boolean;
    onSplitView?: () => void;
    onBack?: () => void;
    endInset?: string;
    i18n: I18n;
    Icon?: IconComponent;
}

function GraphRendererStatus(props: GraphRendererStatusProps): JSX.Element {
    const { renderer, compact, onSplitView, onBack, endInset, i18n, Icon } = props;
    const rendererLabel =
        renderer && i18n.t('ui.toolbar.renderer', { renderer: RENDERER_LABELS[renderer] });

    return (
        <div
            class="ml-auto flex items-center gap-2"
            style={endInset ? { 'padding-inline-end': endInset } : undefined}
        >
            {!compact && rendererLabel && (
                <span class="text-12-regular text-text-weak" title={rendererLabel}>
                    {rendererLabel}
                </span>
            )}
            {onSplitView && (
                <GraphIconButton
                    icon="split"
                    label={i18n.t('ui.toolbar.split')}
                    onClick={onSplitView}
                    Icon={Icon}
                />
            )}
            {onBack && (
                <GraphIconButton
                    icon="outline-arrow-left"
                    label={i18n.t('ui.toolbar.back')}
                    onClick={onBack}
                    Icon={Icon}
                />
            )}
        </div>
    );
}
