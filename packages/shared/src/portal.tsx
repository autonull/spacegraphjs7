/**
 * Portal component for SpaceGraphJS.
 * Renders children at the document root or a specified container.
 */

import { createEffect, onCleanup, onMount } from 'solid-js';
import type { JSX } from 'solid-js';

/** Portal props. */
export interface PortalProps {
    /** Children to render in the portal. */
    children: JSX.Element;
    /** Target container (defaults to document.body). */
    container?: HTMLElement | (() => HTMLElement | null);
    /** Whether the portal is active. */
    isOpen?: boolean;
    /** Z-index for the portal content. */
    zIndex?: number;
}

/**
 * Portal component - renders children in a different part of the DOM tree.
 * Useful for overlays, dropdowns, modals that need to escape layout constraints.
 */
export function Portal(props: PortalProps): JSX.Element {
    const children = props.children;
    const container = props.container;
    const isOpen = props.isOpen ?? true;
    const zIndex = props.zIndex;
    let portalRoot: HTMLElement | null = null;
    let mounted = false;

    onMount(() => {
        mounted = true;
        const targetContainer =
            typeof container === 'function' ? container() : (container ?? document.body);
        if (!targetContainer) return;

        portalRoot = document.createElement('div');
        if (zIndex !== undefined) {
            portalRoot.style.zIndex = String(zIndex);
        }
        targetContainer.appendChild(portalRoot);
    });

    createEffect(() => {
        if (!mounted || !portalRoot) return;
        if (isOpen) {
            portalRoot.replaceChildren();
            portalRoot.append(children as unknown as Node);
        } else {
            portalRoot.replaceChildren();
        }
    });

    onCleanup(() => {
        if (portalRoot && portalRoot.parentNode) {
            portalRoot.parentNode.removeChild(portalRoot);
        }
        portalRoot = null;
    });

    // Render nothing in the original location
    return <noscript />;
}
