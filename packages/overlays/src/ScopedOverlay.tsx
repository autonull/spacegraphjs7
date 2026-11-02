// Re-export the core ScopedOverlay from the main library (implementation)
// Types are defined locally to avoid build-time dependency on main library's types
export { ScopedOverlay } from 'spacegraphjs/overlays';

/** Options for ScopedOverlay (mirrored from main library). */
export interface ScopedOverlayOptions {
    /** The dialog element that holds the focus. */
    container: HTMLElement;
    /** Called when the user presses Escape inside the overlay. */
    onClose?: () => void;
    /** The element focused when the overlay opens; defaults to the container. */
    initialFocus?: HTMLElement;
    /** When true, the overlay uses capture phase for keydown to ensure it handles Tab/Escape
     * before any parent focus traps. This is useful when the overlay is nested inside another
     * dialog's focus trap. */
    useCapture?: boolean;
}

/** Solid.js wrapper component for ScopedOverlay. */
export { GraphOverlayManager, type GraphOverlayManagerProps } from './GraphOverlayManager';
