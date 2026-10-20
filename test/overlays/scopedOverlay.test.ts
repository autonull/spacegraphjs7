import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScopedOverlay } from '../../src/overlays';

let opener: HTMLButtonElement;
let dialog: HTMLDivElement;

const press = (element: Element, key: string, shiftKey = false) =>
    element.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));

beforeEach(() => {
    opener = document.createElement('button');
    document.body.append(opener);

    dialog = document.createElement('div');
    dialog.tabIndex = -1;
    const first = document.createElement('button');
    const last = document.createElement('button');
    dialog.append(first, last);
    document.body.append(dialog);
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('ScopedOverlay', () => {
    it('moves the focus into the overlay and gives it back on dispose', () => {
        opener.focus();
        expect(document.activeElement).toBe(opener);

        const overlay = new ScopedOverlay({ container: dialog });
        expect(document.activeElement).toBe(dialog);

        overlay.dispose();
        expect(document.activeElement).toBe(opener);
    });

    it('closes on Escape', () => {
        let closed = 0;
        const overlay = new ScopedOverlay({ container: dialog, onClose: () => (closed += 1) });

        press(dialog, 'Escape');
        expect(closed).toBe(1);

        overlay.dispose();
    });

    it('keeps the Tab key inside the overlay', () => {
        const overlay = new ScopedOverlay({ container: dialog });
        const [first, last] = overlay.focusable();

        last!.focus();
        press(dialog, 'Tab');
        expect(document.activeElement).toBe(first);

        first!.focus();
        press(dialog, 'Tab', true);
        expect(document.activeElement).toBe(last);

        overlay.dispose();
    });

    it('lists only the enabled focusable elements', () => {
        const disabled = document.createElement('button');
        disabled.setAttribute('disabled', '');
        dialog.append(disabled);

        const overlay = new ScopedOverlay({ container: dialog });

        expect(overlay.focusable()).toHaveLength(2);

        overlay.dispose();
    });

    it('stops listening after dispose', () => {
        let closed = 0;
        const overlay = new ScopedOverlay({ container: dialog, onClose: () => (closed += 1) });

        overlay.dispose();
        press(dialog, 'Escape');
        expect(closed).toBe(0);
    });
});
