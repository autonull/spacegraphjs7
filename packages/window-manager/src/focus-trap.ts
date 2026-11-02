export function setupFocusTrap(element: HTMLDivElement, onEscape: () => void): () => void {
    const focusableSelector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () =>
        Array.from(element.querySelectorAll<HTMLElement>(focusableSelector)).filter(
            (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
        );

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === first) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    };

    const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            onEscape();
        }
    };

    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('keydown', handleEscape, { capture: true });

    const focusable = getFocusableElements();
    if (focusable.length > 0) {
        focusable[0].focus();
    }

    return () => {
        element.removeEventListener('keydown', handleKeyDown);
        element.removeEventListener('keydown', handleEscape, { capture: true });
    };
}
