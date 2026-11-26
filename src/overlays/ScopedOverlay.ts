// The dialog behaviour of a scoped overlay: it keeps the keyboard focus inside, closes on Escape,
// and restores the focus to whatever opened it. The core owns the behaviour; the host owns the
// markup and the copy.

import { focusableElements, trapTabKey } from '../utils/DOMUtils';

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

/**
 * The focus scope of an overlay. Constructing it captures the current focus, moves it into the
 * overlay, and traps the Tab key between the overlay's focusable elements; disposing it gives the
 * focus back to the element that had it.
 */
export class ScopedOverlay {
    readonly #options: ScopedOverlayOptions;
    readonly #restore: HTMLElement | undefined;
    #disposed = false;

    constructor(options: ScopedOverlayOptions) {
        this.#options = options;
        const active = document.activeElement;
        this.#restore = active instanceof HTMLElement ? active : undefined;
        // Use capture phase to handle Tab/Escape before parent focus traps when nested
        options.container.addEventListener('keydown', this.#onKeyDown, options.useCapture);
        (options.initialFocus ?? options.container).focus();
    }

    dispose(): void {
        if (this.#disposed) return;
        this.#disposed = true;
        this.#options.container.removeEventListener(
            'keydown',
            this.#onKeyDown,
            this.#options.useCapture,
        );
        this.#restore?.focus();
    }

    /** The focusable elements inside the overlay, in document order. */
    focusable(): HTMLElement[] {
        return focusableElements(this.#options.container);
    }

    #onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            this.#options.onClose?.();
            return;
        }
        trapTabKey(this.#options.container, event);
    };
}
