// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { HUDPlugin } from '../src/plugins/HUDPlugin';
import type { SpaceGraph } from '../src/SpaceGraph';

function modalHost() {
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.append(canvas);
    const hud = new HUDPlugin();
    Object.assign(hud, {
        sg: { renderer: { renderer: { domElement: canvas } } } as unknown as SpaceGraph,
    });
    return { hud, parent };
}

describe('HUD modal options', () => {
    it('applies the requested width and fires onClose once', () => {
        const { hud, parent } = modalHost();
        let closed = 0;
        hud.showModal('Details', '<p>Body</p>', {
            width: '640px',
            onClose: () => closed++,
        });

        const overlay = parent.querySelector<HTMLElement>('#spacegraph-modal-overlay');
        const panel = overlay?.firstElementChild as HTMLElement;
        expect(panel.style.width).toBe('640px');
        expect(panel.textContent).toContain('Body');

        panel.querySelector('button')?.click();
        expect(parent.querySelector('#spacegraph-modal-overlay')).toBeNull();
        expect(closed).toBe(1);
        hud.hideModal();
        expect(closed).toBe(1);
    });

    it('closes from the overlay backdrop', () => {
        const { hud, parent } = modalHost();
        let closed = 0;
        hud.showModal('Details', 'Body', { onClose: () => closed++ });
        const overlay = parent.querySelector<HTMLElement>('#spacegraph-modal-overlay')!;
        overlay.click();
        expect(closed).toBe(1);
    });
});
