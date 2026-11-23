import type { RenderModel, RendererViewport } from '@spacegraphjs/renderer';
import { Navigation } from 'spacegraphjs/navigation';
import { el } from './dom';

const WIDTH = 176;
const HEIGHT = 112;

/** Redraw the overview from the current model and camera viewport. */
export function drawMinimap(
    model: RenderModel | undefined,
    revealed: string,
    viewport: RendererViewport,
): void {
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
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Graph overview minimap');
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
        dot.dataset.minimapNode = id;
        dot.setAttribute('cx', projected.x.toFixed(1));
        dot.setAttribute('cy', projected.y.toFixed(1));
        dot.setAttribute('r', id === revealed ? '3' : '1.6');
        dot.setAttribute(
            'fill',
            id === revealed ? 'var(--sg-colors-ring)' : 'var(--sg-colors-edge)',
        );
        svg.append(dot);
    }
    el('minimap').replaceChildren(svg);
}
