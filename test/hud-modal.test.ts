// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { HUDPlugin } from '../src/plugins/HUDPlugin';
import { HUDAlerts } from '../src/plugins/hud/HUDAlerts';
import { HUDStatusBar } from '../src/plugins/hud/HUDStatusBar';
import { syncModeToggle } from '../src/core/SpaceGraphAppHUD';
import type { SpaceGraphApp } from '../src/core/SpaceGraphApp';
import type { SpaceGraph } from '../src/SpaceGraph';

function modalHost() {
    const parent = document.createElement('div');
    const canvas = document.createElement('canvas');
    parent.append(canvas);
    const hud = new HUDPlugin();
    const sg = { renderer: { renderer: { domElement: canvas } } } as unknown as SpaceGraph;
    Object.assign(hud, { sg });
    return { hud, parent, sg };
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

    it('exposes dialog semantics and closes on Escape', () => {
        const { hud, parent } = modalHost();
        hud.showModal('Details', 'Body');
        const overlay = parent.querySelector<HTMLElement>('#spacegraph-modal-overlay')!;
        const panel = overlay.firstElementChild as HTMLElement;
        expect(panel.getAttribute('role')).toBe('dialog');
        expect(panel.getAttribute('aria-modal')).toBe('true');
        expect(panel.getAttribute('aria-labelledby')).toBe('spacegraph-modal-title');

        overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(parent.querySelector('#spacegraph-modal-overlay')).toBeNull();
    });

    it('keeps Tab focus inside the dialog', () => {
        const { hud, parent } = modalHost();
        document.body.append(parent);
        hud.showModal('Details', '<button type="button" id="inner-action">Inner</button>');
        const panel = parent.querySelector<HTMLElement>('#spacegraph-modal-overlay')!
            .firstElementChild as HTMLElement;
        const inner = panel.querySelector<HTMLButtonElement>('#inner-action')!;
        const close = panel.lastElementChild as HTMLButtonElement;
        expect(document.activeElement).toBe(close);

        close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        expect(document.activeElement).toBe(inner);

        inner.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
        );
        expect(document.activeElement).toBe(close);
        parent.remove();
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

describe('HUD context menu', () => {
    it('supports menu semantics, arrow traversal and Escape', () => {
        const { hud, parent } = modalHost();
        document.body.append(parent);
        hud.showContextMenu(10, 10, [
            { label: 'First', action: () => undefined },
            { label: 'Second', action: () => undefined },
        ]);

        const menu = parent.querySelector<HTMLElement>('#spacegraph-context-menu')!;
        expect(menu.getAttribute('role')).toBe('menu');
        const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button')];
        expect(buttons.map((button) => button.getAttribute('role'))).toEqual([
            'menuitem',
            'menuitem',
        ]);
        expect(document.activeElement).toBe(buttons[0]);

        buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(buttons[1]);

        buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(parent.querySelector('#spacegraph-context-menu')).toBeNull();
        parent.remove();
    });
});

describe('shared HUD chrome', () => {
    it('scopes status fields to the host that owns them', () => {
        const first = modalHost();
        const second = modalHost();
        const firstBar = new HUDStatusBar(first.sg);
        const secondBar = new HUDStatusBar(second.sg);
        firstBar.create();
        secondBar.create();

        firstBar.updateNodeCount(3, 1);
        expect(first.parent.querySelector('#sg-status-nodes')!.textContent).toBe('Nodes: 3');
        expect(second.parent.querySelector('#sg-status-nodes')!.textContent).toBe('Nodes: 0');
    });

    it('lets a reader dismiss an alert before its timer expires', () => {
        const { parent, sg } = modalHost();
        const alerts = new HUDAlerts(sg);
        alerts.create();
        alerts.show({ message: 'Deployment finished', duration: 60_000 });

        const dismiss = parent.querySelector<HTMLButtonElement>(
            'button[aria-label="Dismiss notification"]',
        )!;
        expect(dismiss).not.toBeNull();
        dismiss.click();
        expect(parent.querySelector('.spacegraph-alerts-container > div')).toBeNull();
    });
});
