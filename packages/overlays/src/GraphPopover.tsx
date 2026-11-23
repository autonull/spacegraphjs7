import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphNode } from '@spacegraphjs/shared/types';
import { insert } from 'solid-js/web';
import type { JSX } from 'solid-js';
import type { GraphDetailProps } from './GraphDetail';

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
 * This component uses imperative DOM creation with deferred element creation to avoid SolidJS
 * template hoisting which causes "Client-only API called on the server side" errors during SSR builds.
 */
export const GraphPopover = (props: GraphPopoverProps) => {
    const { i18n, Icon, node, onClose, ...detailProps } = props;

    // Create elements lazily on first render to avoid module-level DOM creation
    // that fails during SSR builds
    let popoverEl: HTMLElement | null = null;
    let closeButtonContainer: HTMLElement | null = null;
    let detailSurface: HTMLElement | null = null;
    let labelEl: HTMLElement | null = null;
    let kindEl: HTMLElement | null = null;
    let summaryEl: HTMLElement | null = null;

    const ensureElements = () => {
        if (popoverEl) return;
        // Create popover container
        popoverEl = document.createElement('div');
        popoverEl.setAttribute('data-component', 'spacegraph-popover');
        popoverEl.setAttribute('data-slot', 'graph-popover');
        popoverEl.setAttribute('role', 'dialog');
        popoverEl.className = 'relative flex flex-col overflow-hidden rounded-md border border-border-weaker-base bg-surface-base shadow-lg';
        popoverEl.style.width = `${POPOVER_WIDTH}px`;
        popoverEl.style.maxHeight = `${POPOVER_MAX_HEIGHT}px`;

        // Create close button container
        closeButtonContainer = document.createElement('div');
        closeButtonContainer.className = 'absolute end-1 top-1 z-10';
        popoverEl.appendChild(closeButtonContainer);

        // Create detail surface
        detailSurface = document.createElement('div');
        detailSurface.className = 'flex-1 overflow-auto p-2';
        popoverEl.appendChild(detailSurface);

        // Create label element
        labelEl = document.createElement('div');
        labelEl.className = 'text-12-medium text-text-strong mb-2';
        detailSurface.appendChild(labelEl);

        // Create kind element
        kindEl = document.createElement('div');
        kindEl.className = 'text-12-regular text-text-weak';
        detailSurface.appendChild(kindEl);

        // Create summary element
        summaryEl = document.createElement('div');
        summaryEl.className = 'mt-2 text-12-regular text-text-base';
        detailSurface.appendChild(summaryEl);
    };

    const renderPopover = (node: GraphNode) => {
        ensureElements();

        // Close button
        if (props.onClose && closeButtonContainer) {
            // Clear existing close button
            closeButtonContainer.innerHTML = '';
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover';
            closeBtn.setAttribute('aria-label', i18n.t('ui.sessionGraph.popover.close'));
            closeBtn.onclick = () => props.onClose?.();
            const iconEl = document.createElement('span');
            const renderIcon = createIconRenderer(props.Icon);
            const iconNode = renderIcon({ name: 'outline-xmark', size: 'small' });
            if (iconNode && typeof iconNode === 'object' && 'nodeType' in iconNode) {
                iconEl.appendChild(iconNode as Node);
            }
            closeBtn.appendChild(iconEl);
            closeButtonContainer.appendChild(closeBtn);
        }

        // Update detail surface content
        if (labelEl) insert(labelEl, () => node.label);
        if (kindEl) insert(kindEl, () => node.kind);

        if (summaryEl) {
            if (node.summary) {
                insert(summaryEl, () => node.summary);
                summaryEl.style.display = '';
            } else {
                summaryEl.style.display = 'none';
            }
        }

        // Set popover aria-label
        if (popoverEl) {
            popoverEl.setAttribute('aria-label', i18n.t('ui.sessionGraph.inspector.title'));
        }

        return popoverEl;
    };

    if (!node) return null;
    const result = renderPopover(node);
    return result as unknown as JSX.Element;
};