// @vitest-environment jsdom
import { Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { addGrid } from '../src/core/SpaceGraphAppHUD';
import { setupHotkeys, setupInteractionHandlers } from '../src/core/SpaceGraphAppInteraction';
import type { SpaceGraphApp } from '../src/core/SpaceGraphApp';
import type { SpaceGraphEvents } from '../src/types';

function host() {
    const events = new EventEmitter<SpaceGraphEvents>();
    const scene = new Scene();
    const app = {
        sg: { events, renderer: { scene } },
        options: { hotkeys: {} },
        hud: { hideTooltip: () => undefined, hideContextMenu: () => undefined },
        currentSelected: new Set(),
        currentSelectedEdges: new Set(),
    } as unknown as SpaceGraphApp;
    return { app, events, scene };
}

describe('SpaceGraphApp setup cleanup', () => {
    it('removes every interaction subscription it installed', () => {
        const { app, events } = host();
        const names = [
            'interaction:selection',
            'interaction:edgecreate',
            'graph:click',
            'node:click',
            'edge:click',
            'node:dblclick',
            'edge:dblclick',
            'node:contextmenu',
            'edge:contextmenu',
            'graph:contextmenu',
            'node:pointerenter',
            'node:pointerleave',
            'edge:pointerenter',
            'edge:pointerleave',
        ] as const;
        const dispose = setupInteractionHandlers(app);
        for (const name of names) expect(events.listenerCount(name), name).toBe(1);

        dispose();
        for (const name of names) expect(events.listenerCount(name), name).toBe(0);
    });

    it('stops dispatching hotkeys after disposal', () => {
        const { app } = host();
        let calls = 0;
        app.options.hotkeys = { x: () => calls++ };
        const dispose = setupHotkeys(app);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
        expect(calls).toBe(1);
        dispose();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
        expect(calls).toBe(1);
    });

    it('removes the grid it added and is a no-op when disabled', () => {
        const { app, scene } = host();
        const dispose = addGrid(app);
        expect(scene.children).toHaveLength(1);
        dispose();
        expect(scene.children).toHaveLength(0);

        app.options.enableGrid = false;
        addGrid(app)();
        expect(scene.children).toHaveLength(0);
    });
});
