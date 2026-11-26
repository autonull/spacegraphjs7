// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { createZoomControls } from '../src/core/SpaceGraphAppHUD';
import type { SpaceGraphApp } from '../src/core/SpaceGraphApp';
import type { SpaceGraphEvents } from '../src/types';

function host(initial: number) {
    let value = initial;
    const events = new EventEmitter<SpaceGraphEvents>();
    const sg = {
        events,
        get zoom() {
            return value;
        },
        setZoom(next: number) {
            const previous = value;
            value = next;
            events.emit('zoom:change', { zoom: next, previous });
            return sg;
        },
    };
    const app = { sg, _zoomSliderHandler: undefined } as unknown as SpaceGraphApp;
    return { app, events, current: () => value };
}

describe('HUD zoom controls', () => {
    it('uses the normalized zoom range and follows zoom changes', () => {
        const { app } = host(0.5);
        const controls = createZoomControls(app);
        const slider = controls.querySelector<HTMLInputElement>('#sg-app-zoom-slider')!;
        expect([slider.min, slider.max, slider.step, slider.value]).toEqual([
            '0',
            '1',
            '0.01',
            '0.50',
        ]);
        expect(slider.getAttribute('aria-label')).toBe('Zoom level');
        const buttons = controls.querySelectorAll('button');
        expect(buttons[0]!.getAttribute('aria-label')).toBe('Zoom out');
        expect(buttons[1]!.getAttribute('aria-label')).toBe('Zoom in');

        slider.value = '0.2';
        slider.oninput?.(new Event('input'));
        expect(app.sg.zoom).toBeCloseTo(0.2);

        buttons[1]!.click();
        expect(app.sg.zoom).toBeCloseTo(0.3);
        buttons[0]!.click();
        expect(app.sg.zoom).toBeCloseTo(0.2);

        app.sg.setZoom(0.8);
        expect(slider.value).toBe('0.80');
    });

    it('clamps zoom at both ends', () => {
        const { app } = host(0.95);
        const controls = createZoomControls(app);
        for (let index = 0; index < 3; index++) controls.querySelectorAll('button')[1]!.click();
        expect(app.sg.zoom).toBe(1);
    });
});
