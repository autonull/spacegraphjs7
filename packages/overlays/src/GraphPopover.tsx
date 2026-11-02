import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphNode } from '@spacegraphjs/shared/types';
import { Show, type JSX } from 'solid-js';
import type { GraphDetailProps, GraphDetailSurfaceProps } from './GraphDetail';

export const POPOVER_WIDTH = 340;
export const POPOVER_MAX_HEIGHT = 420;
export const POPOVER_GAP = 16;

export type GraphPopoverProps = Omit<GraphDetailProps, 'node'> & {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** The node to show details for. */
    node?: GraphNode;
    /** Callback when the popover should close. */
    onClose?: () => void;
    /** Callback to open a window. */
    onOpenWindow?: GraphDetailProps['onOpenWindow'];
    /** The kind of trace to show. */
    traceKind?: GraphDetailProps['traceKind'];
    /** Callback for trace why. */
    onTraceWhy?: GraphDetailProps['onTraceWhy'];
    /** Callback for trace led here. */
    onTraceLedHere?: GraphDetailProps['onTraceLedHere'];
    /** Callback for trace related. */
    onTraceRelated?: GraphDetailProps['onTraceRelated'];
    /** Callback to clear trace. */
    onClearTrace?: GraphDetailProps['onClearTrace'];
    /** Callback to copy trace outline. */
    onCopyTraceOutline?: GraphDetailProps['onCopyTraceOutline'];
};

/**
 * The detail of a node, floating over the canvas next to the node it belongs to. It takes no layout
 * width and never reframes the camera, so opening it does not move the map under the reader — which
 * is the whole difference between a popover and a side panel.
 */
export const GraphPopover = (props: GraphPopoverProps): JSX.Element => {
    const { i18n, Icon, node, onClose, ...detailProps } = props;
    const renderIcon = createIconRenderer(Icon);

    return (
        <Show when={node} keyed>
            {(node) => (
                <div
                    data-component="spacegraph-popover"
                    data-slot="graph-popover"
                    role="dialog"
                    aria-label={i18n.t('ui.sessionGraph.inspector.title')}
                    class="relative flex flex-col overflow-hidden rounded-md border border-border-weaker-base bg-surface-base shadow-lg"
                    style={{ width: `${POPOVER_WIDTH}px`, 'max-height': `${POPOVER_MAX_HEIGHT}px` }}
                >
                    <Show when={onClose}>
                        <div class="absolute end-1 top-1 z-10">
                            <GraphIconButton
                                label={i18n.t('ui.sessionGraph.popover.close')}
                                icon="outline-xmark"
                                onClick={() => onClose?.()}
                                Icon={Icon}
                            />
                        </div>
                    </Show>
                    <GraphDetailSurface node={node} {...detailProps} Icon={Icon} i18n={i18n} />
                </div>
            )}
        </Show>
    );
};

const GraphIconButton = (props: {
    label: string;
    icon: string;
    onClick: () => void;
    Icon?: IconComponent;
}): JSX.Element => {
    const renderIcon = createIconRenderer(props.Icon);
    return (
        <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
            aria-label={props.label}
            onClick={props.onClick}
        >
            {renderIcon({ name: props.icon, size: 'small' })}
        </button>
    );
};

// GraphDetailSurface - placeholder for now, the host will provide the actual implementation
const GraphDetailSurface = (props: GraphDetailSurfaceProps): JSX.Element => {
    const { node, i18n, Icon, ...rest } = props;
    const renderIcon = createIconRenderer(Icon);

    return (
        <div class="flex-1 overflow-auto p-2">
            <div class="text-12-medium text-text-strong mb-2">{node.label}</div>
            <div class="text-12-regular text-text-weak">{node.kind}</div>
            <Show when={node.summary}>
                <div class="mt-2 text-12-regular text-text-base">{node.summary}</div>
            </Show>
        </div>
    );
};
