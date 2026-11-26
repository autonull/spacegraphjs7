import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { HUDPlugin } from '../src/plugins/HUDPlugin';
import { MinimapPlugin } from '../src/plugins/MinimapPlugin';
import { ZoomBandsPlugin } from '../src/plugins/ZoomBandsPlugin';
import { ZoomUIPlugin } from '../src/plugins/ZoomUIPlugin';

interface FakeRenderer {
    domElement: HTMLCanvasElement;
    getPixelRatio(): number;
    setViewport(): void;
    setScissor(): void;
    setScissorTest(): void;
    setClearColor(): void;
    clear(): void;
    render(): void;
}

function makeCanvas(width = 800, height = 600) {
    const el = document.createElement('canvas');
    Object.defineProperty(el, 'clientWidth', { value: width });
    Object.defineProperty(el, 'clientHeight', { value: height });
    return el;
}

function fakeSg() {
    const container = document.createElement('div');
    const domElement = makeCanvas();
    const renderer: FakeRenderer = {
        domElement,
        getPixelRatio: () => 1,
        setViewport: () => {},
        setScissor: () => {},
        setScissorTest: () => {},
        setClearColor: () => {},
        clear: () => {},
        render: () => {},
    };
    const sg = {
        container,
        renderer: {
            container,
            renderer,
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(75, 4 / 3, 0.1, 10000),
        },
        cameraControls: {
            target: new THREE.Vector3(),
            enabled: true,
            setTarget: (_x: number, _y: number, _z: number) => {},
        },
        events: new EventEmitter(),
        graph: { nodes: new Map<string, unknown>(), edges: new Map<string, unknown>() },
        requestFrame: () => {},
    };
    return sg;
}

describe('L1.27 MinimapPlugin embedding', () => {
    it('scopes the overlay to the container, honours enable/disable, and cleans up on dispose', () => {
        const sg = fakeSg();
        const plugin = new MinimapPlugin();
        plugin.init(sg as never, sg.graph as never, sg.events as never);

        plugin.onPostRender(1);
        const overlay = sg.renderer.container.querySelector('div');
        expect(overlay).not.toBeNull();

        plugin.setEnabled(false);
        expect((overlay as HTMLElement).style.display).toBe('none');
        plugin.setEnabled(true);
        expect((overlay as HTMLElement).style.display).toBe('');

        plugin.dispose();
        expect(sg.renderer.container.querySelector('div')).toBeNull();
        expect(() => plugin.onPostRender(1)).not.toThrow();
    });

    it('hit-tests the minimap in canvas-local coordinates', () => {
        const sg = fakeSg();
        const canvas = sg.renderer.renderer.domElement;
        canvas.getBoundingClientRect = () =>
            ({ left: 100, top: 50, width: 800, height: 600 }) as DOMRect;
        const targets: number[][] = [];
        sg.cameraControls.setTarget = (x: number, y: number, z: number) => targets.push([x, y, z]);
        const plugin = new MinimapPlugin();
        plugin.settings.size = 160;
        plugin.settings.margin = 12;
        plugin.init(sg as never, sg.graph as never, sg.events as never);

        // Canvas-local minimap centre (708, 508) plus the canvas page offset (100, 50).
        canvas.dispatchEvent(
            new PointerEvent('pointerdown', { clientX: 808, clientY: 558, bubbles: true }),
        );
        expect(targets).toEqual([[0, 0, 0]]);
        plugin.dispose();
    });

    it('does no scene work while disabled', () => {
        const sg = fakeSg();
        let renders = 0;
        (sg.renderer.renderer as { render: () => void }).render = () => renders++;
        const plugin = new MinimapPlugin();
        plugin.settings.enabled = false;
        plugin.init(sg as never, sg.graph as never, sg.events as never);
        for (let i = 0; i < 10; i++) plugin.onPostRender(1);
        expect(renders).toBe(0);
    });
});

describe('L1.27 ZoomUIPlugin embedding', () => {
    it('scopes overlays to the container and releases its listener on dispose', () => {
        const sg = fakeSg();
        const plugin = new ZoomUIPlugin({ showHint: false });
        plugin.init(sg as never, sg.graph as never, sg.events as never);

        const indicator = sg.container.querySelector('.fractal-level-indicator');
        expect(indicator).not.toBeNull();
        expect(indicator?.parentElement).toBe(sg.container);

        plugin.dispose();
        expect(sg.container.querySelector('.fractal-level-indicator')).toBeNull();
        expect(() =>
            sg.events.emit('fractal:level-change', { to: 2, label: 'Detail' }),
        ).not.toThrow();
    });
});

describe('flight progress relay', () => {
    it('forwards camera flight progress to the zoom chrome', () => {
        const sg = { ...fakeSg(), zoom: 0 };
        const plugin = new ZoomBandsPlugin();
        plugin.init(sg as never, sg.graph as never, sg.events as never);

        const progress: number[] = [];
        sg.events.on('fractal:transition-progress', (value: number) => progress.push(value));
        sg.events.emit('camera:fly:progress', 0.25);
        sg.events.emit('camera:fly:progress', 1);

        expect(progress).toEqual([0.25, 1]);
        plugin.dispose();
    });
});
describe('HUD flight progress', () => {
    it('shows the progress bar inside the zoom indicator', () => {
        const sg = fakeSg();
        sg.renderer.container.appendChild(sg.renderer.renderer.domElement);
        const indicator = document.createElement('div');
        indicator.className = 'fractal-level-indicator';
        document.body.appendChild(indicator);
        const plugin = new HUDPlugin();
        plugin.init(sg as never, sg.graph as never, sg.events as never);
        sg.events.emit('fractal:transition-progress', 0.4);
        const bar = document.getElementById('fractal-zoom-progress') as HTMLElement;
        expect(bar.parentElement?.parentElement).toBe(indicator);
        expect(bar.style.width).toBe('40%');
        plugin.dispose();
        bar.remove();
        indicator.remove();
    });
});

describe('HUD tooltip and context menu', () => {
    it('shows and hides host tooltips', () => {
        const sg = fakeSg();
        sg.renderer.container.appendChild(sg.renderer.renderer.domElement);
        const plugin = new HUDPlugin();
        plugin.init(sg as never, sg.graph as never, sg.events as never);
        plugin.showTooltip(sg.renderer.renderer.domElement, 'node detail', {
            clientX: 20,
            clientY: 30,
        });
        const tooltip = sg.renderer.container.querySelector('#spacegraph-tooltip') as HTMLElement;
        expect(tooltip.textContent).toBe('node detail');
        expect(tooltip.style.pointerEvents).toBe('none');
        plugin.hideTooltip();
        expect(sg.renderer.container.querySelector('#spacegraph-tooltip')).toBeNull();
        plugin.dispose();
    });

    it('runs a menu action and dismisses the menu', () => {
        const sg = fakeSg();
        sg.renderer.container.appendChild(sg.renderer.renderer.domElement);
        const plugin = new HUDPlugin();
        plugin.init(sg as never, sg.graph as never, sg.events as never);
        let clicks = 0;
        plugin.showContextMenu(10, 20, [{ label: 'Edit', action: () => (clicks += 1) }]);
        const menu = sg.renderer.container.querySelector('#spacegraph-context-menu') as HTMLElement;
        expect(menu.querySelectorAll('button')).toHaveLength(1);
        menu.querySelector('button')!.click();
        expect(clicks).toBe(1);
        expect(sg.renderer.container.querySelector('#spacegraph-context-menu')).toBeNull();

        plugin.showContextMenu(10, 20, [{ label: 'Edit', action: () => {} }]);
        document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        expect(sg.renderer.container.querySelector('#spacegraph-context-menu')).toBeNull();
        plugin.dispose();
    });
});
