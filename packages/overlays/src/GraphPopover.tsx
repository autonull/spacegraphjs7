import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphNode } from '@spacegraphjs/shared/types';
import { createComponent, effect, getNextElement, insert, setAttribute, template, Show } from 'solid-js/web';
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
 * 
 * This component uses imperative DOM creation with lazily-created templates to avoid SolidJS
 * template hoisting which causes "Client-only API called on the server side" errors during SSR builds.
 */
export const GraphPopover = (props: GraphPopoverProps) => {
    const { i18n, Icon, node, onClose, ...detailProps } = props;
    const renderIcon = createIconRenderer(Icon);

    // Create templates lazily on first render to avoid module-level template calls
    // that fail during SSR builds
    let popoverTemplate: ReturnType<typeof template> | null = null
    let closeButtonTemplate: ReturnType<typeof template> | null = null
    let detailSurfaceTemplate: ReturnType<typeof template> | null = null

    const ensureTemplates = () => {
        if (popoverTemplate) return
        popoverTemplate = template(
            '<div data-component="spacegraph-popover" data-slot="graph-popover" role="dialog" class="relative flex flex-col overflow-hidden rounded-md border border-border-weaker-base bg-surface-base shadow-lg" style="width:340px;max-height:420px"><div class="absolute end-1 top-1 z-10"></div><div class="flex-1 overflow-auto p-2"><div class="text-12-medium text-text-strong mb-2"></div><div class="text-12-regular text-text-weak"></div><div class="mt-2 text-12-regular text-text-base"></div></div>',
            false,
        )
        closeButtonTemplate = template(
            '<button type="button" class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover" aria-label=""></button>',
            false,
        )
        detailSurfaceTemplate = template(
            '<div class="flex-1 overflow-auto p-2"><div class="text-12-medium text-text-strong mb-2"></div><div class="text-12-regular text-text-weak"></div><div class="mt-2 text-12-regular text-text-base"></div>',
            false,
        )
    }

    const renderPopover = (node: GraphNode) => {
        ensureTemplates()
        const el = getNextElement(popoverTemplate!) as HTMLElement
        const closeButtonContainer = el.firstChild as HTMLElement
        const detailSurface = closeButtonContainer.nextSibling as HTMLElement

        // Close button
        if (props.onClose) {
            const closeBtn = getNextElement(template(
                '<button type="button" class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover" aria-label=""></button>',
                false,
            )) as HTMLButtonElement
            closeBtn.setAttribute('aria-label', i18n.t('ui.sessionGraph.popover.close'))
            closeBtn.onclick = () => props.onClose?.()
            const iconEl = document.createElement('span')
            const renderIcon = createIconRenderer(props.Icon)
            iconEl.appendChild(renderIcon({ name: 'outline-xmark', size: 'small' }))
            closeBtn.appendChild(iconEl)
            closeButtonContainer.appendChild(closeBtn)
        }

        // Detail surface
        const detailEl = detailSurface as HTMLElement
        const labelEl = detailEl.firstChild as HTMLElement
        const kindEl = labelEl.nextSibling as HTMLElement
        const summaryEl = kindEl.nextSibling as HTMLElement

        insert(labelEl, () => node.label)
        insert(kindEl, () => node.kind)

        if (node.summary) {
            insert(summaryEl, () => node.summary)
            summaryEl.style.display = ''
        } else {
            summaryEl.style.display = 'none'
        }

        // Set popover styles
        el.style.width = `${POPOVER_WIDTH}px`
        el.style.maxHeight = `${POPOVER_MAX_HEIGHT}px`
        el.setAttribute('data-component', 'spacegraph-popover')
        el.setAttribute('data-slot', 'graph-popover')
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-label', i18n.t('ui.sessionGraph.inspector.title'))

        return el
    }

    if (!node) return null
    return renderPopover(node)
};
