// The dialog behaviour of a scoped overlay: it keeps the keyboard focus inside, closes on Escape,
// and restores the focus to whatever opened it. The core owns the behaviour; the host owns the
// markup and the copy.

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

export interface ScopedOverlayOptions {
    /** The dialog element that holds the focus. */
    container: HTMLElement;
    /** Called when the user presses Escape inside the overlay. */
    onClose?: () => void;
    /** The element focused when the overlay opens; defaults to the container. */
    initialFocus?: HTMLElement;
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
        options.container.addEventListener('keydown', this.#onKeyDown);
        (options.initialFocus ?? options.container).focus();
    }

    dispose(): void {
        if (this.#disposed) return;
        this.#disposed = true;
        this.#options.container.removeEventListener('keydown', this.#onKeyDown);
        this.#restore?.focus();
    }

    /** The focusable elements inside the overlay, in document order. */
    focusable(): HTMLElement[] {
        return [...this.#options.container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
            (element) => !element.hasAttribute('disabled'),
        );
    }

    #onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            this.#options.onClose?.();
            return;
        }
        if (event.key !== 'Tab') return;

        const elements = this.focusable();
        if (elements.length === 0) return;

        const first = elements[0]!;
        const last = elements[elements.length - 1]!;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
}
