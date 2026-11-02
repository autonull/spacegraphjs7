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
        let targetContainer: HTMLElement | null = null;
        if (typeof container === 'function') {
            targetContainer = container();
        } else if (container) {
            targetContainer = container;
        } else {
            targetContainer = document.body;
        }
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

/**
 * Hook for rendering content in a portal.
 * Returns a function to update the portal content.
 */
export function usePortal(defaultContainer?: HTMLElement) {
    let portalRoot: HTMLElement | null = null;
    let container = defaultContainer;

    const setContainer = (newContainer: HTMLElement) => {
        container = newContainer;
    };

    const render = (content: JSX.Element, targetContainer?: HTMLElement) => {
        const target = targetContainer ?? container ?? document.body;
        if (!target) return;

        if (!portalRoot) {
            portalRoot = document.createElement('div');
            target.appendChild(portalRoot);
        }
        portalRoot.replaceChildren();
        portalRoot.append(content as unknown as Node);
    };

    const close = () => {
        if (portalRoot) {
            portalRoot.replaceChildren();
        }
    };

    const dispose = () => {
        if (portalRoot && portalRoot.parentNode) {
            portalRoot.parentNode.removeChild(portalRoot);
        }
        portalRoot = null;
    };

    onCleanup(dispose);

    return { render, close, dispose, setContainer };
}
