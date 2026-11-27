import type { RenderModel, RendererViewport } from '@spacegraphjs/renderer';
import { Navigation } from 'spacegraphjs/navigation';
import { el } from './dom';

const WIDTH = 176;
const HEIGHT = 112;
let activeID = '';

const dotID = (id: string) => `minimap-node-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

/** Redraw the overview from the current model and camera viewport. */
export function drawMinimap(
    model: RenderModel | undefined,
    revealed: string,
    viewport: RendererViewport,
): void {
    const labels = new Map((model?.nodes ?? []).map((node) => [node.id, node.label]));
    const positions = new Map(
        (model?.nodes ?? []).map(
            (node) => [node.id, { x: node.position[0], y: node.position[1] }] as const,
        ),
    );
    const projection = Navigation.project({
        positions,
        box: { width: WIDTH, height: HEIGHT },
        padding: 8,
        ...(viewport.extent
            ? {
                  viewport: {
                      center: [viewport.center[0], viewport.center[1]] as [number, number],
                      extent: viewport.extent,
                  },
              }
            : {}),
    });
    if (!positions.has(activeID))
        activeID =
            revealed && positions.has(revealed) ? revealed : (positions.keys().next().value ?? '');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.setAttribute('role', 'presentation');
    if (projection.viewRect) {
        const view = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        view.dataset.minimapView = 'true';
        view.setAttribute('x', projection.viewRect.x.toFixed(1));
        view.setAttribute('y', projection.viewRect.y.toFixed(1));
        view.setAttribute('width', Math.max(1, projection.viewRect.width).toFixed(1));
        view.setAttribute('height', Math.max(1, projection.viewRect.height).toFixed(1));
        view.setAttribute('fill', 'none');
        view.setAttribute('stroke', 'var(--sg-colors-accent)');
        svg.append(view);
    }
    for (const [id, point] of positions) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const projected = projection.project(point);
        dot.id = dotID(id);
        dot.dataset.minimapNode = id;
        dot.dataset.active = String(id === activeID);
        dot.setAttribute('cx', projected.x.toFixed(1));
        dot.setAttribute('cy', projected.y.toFixed(1));
        dot.setAttribute('r', id === revealed ? '3' : '1.6');
        dot.setAttribute(
            'fill',
            id === revealed ? 'var(--sg-colors-ring)' : 'var(--sg-colors-edge)',
        );
        dot.setAttribute('role', 'option');
        dot.setAttribute('aria-selected', String(id === activeID));
        dot.setAttribute('aria-label', `Reveal ${labels.get(id) || id}`);
        svg.append(dot);
    }
    const container = el('minimap');
    container.replaceChildren(svg);
    container.setAttribute('aria-activedescendant', activeID ? dotID(activeID) : '');
}

/** Roving overview selection: arrows move the active dot, Enter reveals it. */
export function installMinimapKeys(reveal: (id: string) => void): void {
    const container = el('minimap');
    const dots = () => [...container.querySelectorAll<SVGElement>('[data-minimap-node]')];
    const select = (id: string) => {
        activeID = id;
        container.setAttribute('aria-activedescendant', id ? dotID(id) : '');
        for (const dot of dots()) {
            const selected = dot.dataset.minimapNode === id;
            dot.dataset.active = String(selected);
            dot.setAttribute('aria-selected', String(selected));
        }
    };
    container.addEventListener('keydown', (event) => {
        const list = dots().map((dot) => dot.dataset.minimapNode ?? '');
        const index = list.indexOf(activeID);
        const step =
            event.key === 'ArrowRight' || event.key === 'ArrowDown'
                ? 1
                : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                  ? -1
                  : 0;
        if (step) select(list[(index + step + list.length) % list.length] ?? '');
        else if (event.key === 'Home') select(list[0] ?? '');
        else if (event.key === 'End') select(list.at(-1) ?? '');
        else if (event.key === 'Enter' || event.key === ' ') {
            if (activeID) reveal(activeID);
        } else return;
        event.preventDefault();
    });
    container.addEventListener('click', (event) => {
        const id = (event.target as Element | null)
            ?.closest('[data-minimap-node]')
            ?.getAttribute('data-minimap-node');
        if (id) {
            select(id);
            reveal(id);
        }
    });
}
