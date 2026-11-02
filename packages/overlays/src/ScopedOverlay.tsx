import { createEffect, onCleanup, onMount } from 'solid-js';

/**
 * Options for ScopedOverlay.
 */
export interface ScopedOverlayOptions {
    /** The container element to scope the overlay to. */
    container: HTMLElement;
    /** Callback when the overlay should close (e.g., Escape key, click outside). */
    onClose: () => void;
    /** Whether to use capture phase for event listeners. */
    useCapture?: boolean;
}

/**
 * A scoped overlay that traps focus and handles Escape key within a container.
 * Used for modal-like overlays that need to be self-contained.
 */
export class ScopedOverlay {
    private container: HTMLElement;
    private onClose: () => void;
    private useCapture: boolean;
    private previouslyFocusedElement: HTMLElement | null = null;
    private keydownHandler: (event: KeyboardEvent) => void;
    private clickHandler: (event: MouseEvent) => void;

    constructor(options: ScopedOverlayOptions) {
        this.container = options.container;
        this.onClose = options.onClose;
        this.useCapture = options.useCapture ?? false;

        this.keydownHandler = this.handleKeydown.bind(this);
        this.clickHandler = this.handleClick.bind(this);

        this.setup();
    }

    private setup(): void {
        // Store previously focused element
        this.previouslyFocusedElement = document.activeElement as HTMLElement;

        // Add event listeners
        document.addEventListener('keydown', this.keydownHandler, this.useCapture);
        document.addEventListener('click', this.clickHandler, this.useCapture);

        // Focus the container
        this.container.focus();
    }

    private handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            this.onClose();
            return;
        }

        // Trap Tab key within the container
        if (event.key === 'Tab') {
            const focusableElements = this.container.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            );
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    }

    private handleClick(event: MouseEvent): void {
        // Close if clicking outside the container
        if (!this.container.contains(event.target as Node)) {
            this.onClose();
        }
    }

    /**
     * Dispose of the overlay and restore focus.
     */
    dispose(): void {
        document.removeEventListener('keydown', this.keydownHandler, this.useCapture);
        document.removeEventListener('click', this.clickHandler, this.useCapture);

        // Restore focus to the previously focused element
        if (
            this.previouslyFocusedElement &&
            typeof this.previouslyFocusedElement.focus === 'function'
        ) {
            this.previouslyFocusedElement.focus();
        }
    }
}
