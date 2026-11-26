// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { HUDPlugin } from '../src/plugins/HUDPlugin';
import { syncModeToggle } from '../src/core/SpaceGraphAppHUD';
import type { SpaceGraphApp } from '../src/core/SpaceGraphApp';
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

describe('HUD mode toggle', () => {
    it('reflects the interaction mode and pressed state from one authority', () => {
        const container = document.createElement('div');
        container.id = 'sg-app-mode-toggle';
        for (const mode of ['default', 'select', 'connect']) {
            const button = document.createElement('button');
            button.dataset['mode'] = mode;
            container.append(button);
        }
        document.body.append(container);
        const modes = { mode: 'default' };
        const app = {
            sg: { pluginManager: { get: () => modes } },
        } as unknown as SpaceGraphApp;

        syncModeToggle(app);
        const buttons = [...container.querySelectorAll('button')];
        expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
            'true',
            'false',
            'false',
        ]);

        modes.mode = 'select';
        syncModeToggle(app);
        expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
            'false',
            'true',
            'false',
        ]);
        container.remove();
    });
});
