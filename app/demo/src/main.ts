// The demo host: plain TypeScript. It maps a release-pipeline model to a RenderModel, mounts one of
// three renderers, and runs each library capability against that model.

import { createPatchPainter } from '@spacegraphjs/adapter';
import { SvgRenderer } from '@spacegraphjs/svg-renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import {
    DEFAULT_THEME,
    resolveTheme,
    type GraphRenderer,
    type RenderTheme,
    type RenderModel,
} from '@spacegraphjs/renderer';
import { AccessibilityLayer } from 'spacegraphjs/a11y';
import type { DepthMode } from 'spacegraphjs/depth';
import { Navigation } from 'spacegraphjs/navigation';
import { ScopedOverlay, extractSubgraph, renderCodeDiff } from 'spacegraphjs/overlays';
import { computeFocusOverlay, type FocusOverlay } from '@spacegraphjs/overlays';
import { elementGetter, renderTrail as paintTrail, round } from './dom';
import { CAPABILITIES, type Capability } from './gallery';
import { DemoHost } from './host';
import { HOST_VIEWS, searchableFields, type HostView } from './model';

type RendererID = 'spacegraph' | 'cytoscape' | 'svg';
type ThemeName = 'dark' | 'light';

const MINIMAP = { width: 220, height: 140 };
/** The gap between the minimap and the stage's edges (`inset-block-end: 12px`). */
const MINIMAP_GAP = 12;
const DEPTHS: readonly DepthMode[] = ['flat', 'layered', 'depth-stack', 'orbit'];

const TOKENS = {
    background: '--sh-background',
    surface: '--sh-surface',
    surfaceMuted: '--sh-surface-muted',
    text: '--sh-text',
    textMuted: '--sh-text-muted',
    border: '--sh-border',
    accent: '--sh-accent',
    success: '--sh-success',
    warning: '--sh-warning',
    error: '--sh-error',
    edge: '--sh-edge',
    edgeMuted: '--sh-edge-muted',
    selection: '--sh-selection',
    focus: '--sh-focus',
} as const;

const el = elementGetter('demo host');

function svgEl(id: string): SVGSVGElement {
    const found = document.getElementById(id);

    if (!(found instanceof SVGSVGElement)) throw new Error(`demo host: missing <svg id="${id}">`);

    return found;
}

const host = new DemoHost();

let rendererID: RendererID = 'spacegraph';
let themeName: ThemeName = 'dark';
let renderer: GraphRenderer | undefined;
let painter: ReturnType<typeof createPatchPainter> | undefined;
let mirror: AccessibilityLayer | undefined;
let scope: ScopedOverlay | undefined;
let currentFocusOverlay: FocusOverlay | undefined;

function readTheme(): RenderTheme {
    const styles = getComputedStyle(document.documentElement);

    return resolveTheme(TOKENS, (variable) => styles.getPropertyValue(variable), DEFAULT_THEME);
}

function select(ids: readonly string[]) {
    host.select(ids);
    renderer?.setSelection(ids);
}

function renderTrail(): void {
    paintTrail(el('trail'), host.controller.trail, () => host.controller.back(), (id) =>
        select([id]),
    );
}

function viewportOf() {
    const viewport = renderer?.getViewport?.();
    if (!viewport?.extent) return undefined;

    return { center: [viewport.center[0], viewport.center[1]] as const, extent: viewport.extent };
}

function renderMinimap() {
    const svg = svgEl('minimap');
    const layout = host.layout();
    const projection = Navigation.project({
        positions: layout.positions,
        box: MINIMAP,
        padding: 8,
        viewport: viewportOf(),
    });

    const dots = host.model.nodes.flatMap((node) => {
        const position = layout.positions.get(node.id);
        if (!position) return [];
        const point = projection.project(position);
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', String(round(point.x)));
        dot.setAttribute('cy', String(round(point.y)));
        dot.setAttribute('r', '3');
        dot.setAttribute('class', `dot dot--${node.status}`);
        dot.setAttribute('data-id', node.id);
        return [dot];
    });

    const viewRect = projection.viewRect;
    const frame = viewRect
        ? (() => {
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', String(round(viewRect.x)));
              rect.setAttribute('y', String(round(viewRect.y)));
              rect.setAttribute('width', String(round(viewRect.width)));
              rect.setAttribute('height', String(round(viewRect.height)));
              rect.setAttribute('class', 'view');
              return rect;
          })()
        : undefined;

    svg.replaceChildren(...(frame ? [frame] : []), ...dots);
}

function renderSearch(query: string) {
    const results = el('results');
    const hits = Navigation.search(host.model, query, searchableFields);

    if (!query.trim()) {
        results.replaceChildren();
        return;
    }

    results.replaceChildren(
        ...hits.map((hit) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'result';
            button.dataset.id = hit.id;
            button.textContent = `${hit.label} · ${hit.summary ?? hit.outcome}`;
            button.addEventListener('click', () => select([hit.id]));
            return button;
        }),
    );
}

function renderEvidence(capability: Capability, evidence: readonly string[]) {
    el('evidence-title').textContent = capability.title;
    el('evidence-summary').textContent = capability.summary;
    el('evidence').replaceChildren(
        ...evidence.map((line) => {
            const row = document.createElement('div');
            row.className = 'evidence-line';
            row.textContent = line;
            return row;
        }),
    );
}

function openOverlay(nodeID: string) {
    const dialog = el<HTMLElement>('overlay');
    const scoped = extractSubgraph(host.model, nodeID, { childEdgeKind: 'part-of' });

    el('overlay-title').textContent = scoped.root?.label ?? nodeID;
    el('overlay-body').replaceChildren(
        ...scoped.nodes.map((node) => {
            const row = document.createElement('div');
            row.className = 'overlay-node';
            row.dataset.id = node.id;
            row.textContent = `${node.label} · ${node.status}`;
            return row;
        }),
    );

    dialog.hidden = false;
    scope?.dispose();
    scope = new ScopedOverlay({
        container: dialog,
        onClose: () => closeOverlay(),
    });
}

function closeOverlay() {
    scope?.dispose();
    scope = undefined;
    el('overlay').hidden = true;
}

function openDiff() {
    el<HTMLElement>('diff').hidden = false;
    renderCodeDiff(el('diff-body'), host.diffs(), {
        toneClass: (tone) => `diff-line diff-line--${tone}`,
        fileClass: 'diff-file',
    });
}

function closeDiff() {
    el('diff').hidden = true;
}

function applyFocusOverlay(model: RenderModel, overlay: FocusOverlay | undefined): RenderModel {
    if (!overlay) return model;

    // LERP from minBrightness (dimmed) to 1.0 (selected)
    // minBrightness = 0.5 - readable but clearly distinct from selected (1.0)
    const minBrightness = 0.5;
    const maxDistance = 3;

    const brightnessForDistance = (distance: number | undefined): number => {
        if (distance === 0) return 1.0; // selected - full brightness
        if (distance === undefined) return minBrightness; // outside BFS range
        if (distance > maxDistance) return minBrightness;
        // LERP: minBrightness + (1 - minBrightness) * (1 - distance / maxDistance)
        return minBrightness + (1 - minBrightness) * (1 - distance / maxDistance);
    };

    return {
        ...model,
        nodes: model.nodes.map((node) => {
            const distance = overlay.get(node.id);
            const brightness = brightnessForDistance(distance);
            if (brightness >= 1) return node;

            // Apply uniform brightness via filter - dims background, text, border equally
            const existingStyle = (node.data?.style as Record<string, string> | undefined) ?? {};
            return {
                ...node,
                data: {
                    ...node.data,
                    style: {
                        ...existingStyle,
                        filter: `brightness(${brightness})`,
                        opacity: String(brightness), // also set opacity for consistent layering
                    },
                },
            };
        }),
    };
}

function paint() {
    const renderModel = host.renderModel();
    const modelWithFocus = applyFocusOverlay(renderModel, currentFocusOverlay);

    painter?.paint(modelWithFocus);

    mirror?.setItems(
        host.model.nodes.map((node) => ({
            id: node.id,
            label: node.label,
            kind: node.kind,
            status: node.status,
        })),
    );
    mirror?.setEdges(
        host.model.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            label: `${edge.kind} → ${edge.target}`,
        })),
    );
    mirror?.setSelected(host.controller.selection);

    el('state').textContent = `${host.view} · ${host.level} · ${host.depth} · ${rendererID}`;
    renderTrail();
    renderMinimap();
}

/**
 * The camera follows the content: a view change replaces the model, so the camera is framed again.
 * The floor keeps a card legible — half its natural size, which is what the lane views are read at.
 * The minimap is drawn over the canvas, so the frame keeps the content clear of it (T6.10).
 */
function fitCamera() {
    renderer?.fit(undefined, {
        minScale: 0.5,
        insets: { right: MINIMAP.width + MINIMAP_GAP, bottom: MINIMAP.height + MINIMAP_GAP },
    });
}

async function mountRenderer(id: RendererID): Promise<void> {
    host.controller.unbind();
    renderer?.dispose();
    renderer = undefined;
    painter = undefined;
    el('canvas').replaceChildren();
    el('svg').replaceChildren();
    rendererID = id;

    const svg = id === 'svg';
    el('stage').dataset.renderer = id;
    el('canvas').hidden = svg;
    el('svg').hidden = !svg;

    const next: GraphRenderer = svg
        ? new SvgRenderer()
        : id === 'cytoscape'
          ? new CytoscapeRenderer()
          : new SpaceGraphRenderer();
    renderer = next;
    painter = createPatchPainter(next);
    await next.mount(svg ? el('svg') : el('canvas'), { theme: readTheme(), projection: '2d' });
    if (!svg) host.controller.bind(next);
    paint();
    if (!svg) fitCamera();
}

function runCapability(capability: Capability) {
    const reframed = capability.view !== undefined || capability.level !== undefined;

    if (capability.view) host.view = capability.view;
    if (capability.level) host.level = capability.level;
    if (capability.depth) {
        host.depth = capability.depth;
        renderer?.setDepth(capability.depth);
    }

    // Apply selection from capability before running it
    if (capability.select) {
        host.select(capability.select);
    }

    // Compute focus overlay for the focus capability
    if (capability.id === 'focus') {
        const context = host.context(readTheme(), {
            rendererName: rendererName(),
            capabilities: renderer?.capabilities,
        });
        currentFocusOverlay = computeFocusOverlay({
            model: context.model,
            selection: context.selection,
            maxDistance: 3,
        });
    } else {
        currentFocusOverlay = undefined;
    }

    syncViews();
    paint();
    if (reframed) fitCamera();

    renderEvidence(
        capability,
        capability.run(
            host.context(readTheme(), {
                rendererName: rendererName(),
                capabilities: renderer?.capabilities,
            }),
        ),
    );

    if (capability.overlay) openOverlay(capability.overlay);
    if (capability.diff) openDiff();

    for (const button of el('gallery').querySelectorAll<HTMLButtonElement>('[data-capability]')) {
        button.setAttribute('aria-pressed', String(button.dataset.capability === capability.id));
    }
}

function rendererName(): string {
    if (rendererID === 'svg') return 'Static SVG';
    if (rendererID === 'cytoscape') return 'Cytoscape';
    return 'SpaceGraph';
}

function renderGallery() {
    el('gallery').replaceChildren(
        ...CAPABILITIES.map((capability) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'capability';
            button.dataset.capability = capability.id;
            button.setAttribute('aria-pressed', 'false');

            const title = document.createElement('span');
            title.className = 'capability-title';
            title.textContent = capability.title;

            const module = document.createElement('span');
            module.className = 'capability-module';
            module.textContent = capability.modules.join(' · ');

            button.append(title, module);
            button.addEventListener('click', () => runCapability(capability));
            return button;
        }),
    );
}

/** The layout picker: the same model in every shape the host can draw. */
function renderViews() {
    el('views').replaceChildren(
        ...HOST_VIEWS.map((view) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.view = view;
            button.textContent = view;
            button.addEventListener('click', () => setView(view));
            return button;
        }),
    );

    syncViews();
}

function syncViews() {
    for (const button of el('views').querySelectorAll<HTMLButtonElement>('[data-view]')) {
        button.setAttribute('aria-pressed', String(button.dataset.view === host.view));
    }
}

function setView(view: HostView) {
    host.view = view;
    syncViews();
    paint();
    fitCamera();
}

async function main(): Promise<void> {
    document.documentElement.dataset.theme = themeName;

    mirror = new AccessibilityLayer(el('a11y'), {
        label: 'Pipeline nodes (keyboard)',
        onSelect: (id) => select([id]),
        onEscape: () => select([]),
        formatSelection: (labels) =>
            labels.length ? `Selected ${labels.join(', ')}` : 'Selection cleared',
        edgeAnnouncer: (edges) =>
            `Connections: ${edges.map((edge) => edge.label ?? edge.kind).join('; ')}`,
    });

    host.controller.onChange(() => {
        paint();
        renderSearch(el<HTMLInputElement>('search').value);
    });

    renderGallery();
    renderViews();

    const bindPicker = <T extends string>(prefix: string, ids: readonly T[], apply: (id: T) => void) => {
        for (const id of ids) el(`${prefix}-${id}`).addEventListener('click', () => apply(id));
    };

    bindPicker('renderer', ['spacegraph', 'cytoscape', 'svg'] as const, (id) => void mountRenderer(id));
    bindPicker('theme', ['dark', 'light'] as const, (id) => {
        themeName = id;
        document.documentElement.dataset.theme = id;
        const theme = readTheme();
        renderer?.setTheme(theme);
        paint();
    });
    bindPicker('depth', DEPTHS, (mode) => {
        host.depth = mode;
        renderer?.setDepth(mode);
        paint();
    });

    el<HTMLInputElement>('search').addEventListener('input', (event) =>
        renderSearch((event.target as HTMLInputElement).value),
    );
    el('overlay-close').addEventListener('click', () => closeOverlay());
    el('diff-close').addEventListener('click', () => closeDiff());
    window.addEventListener('resize', () => {
        renderer?.resize();
        paint();
    });

    await mountRenderer('spacegraph');
    const requested = new URLSearchParams(location.search).get('capability');
    runCapability(CAPABILITIES.find((entry) => entry.id === requested) ?? CAPABILITIES[0]!);

    (window as unknown as { __demo: unknown; __ready: boolean }).__demo = {
        capabilities: () => CAPABILITIES.map((capability) => capability.id),
        run: (id: string) => {
            const capability = CAPABILITIES.find((entry) => entry.id === id);
            if (capability) runCapability(capability);
        },
        evidence: () => [...el('evidence').children].map((child) => child.textContent ?? ''),
        renderer: () => rendererID,
        view: () => host.view,
        views: () => [...HOST_VIEWS],
        setView: (view: string) => {
            if ((HOST_VIEWS as readonly string[]).includes(view)) setView(view as HostView);
        },
        level: () => host.level,
        selection: () => host.controller.selection,
        overlayOpen: () => !el('overlay').hidden,
        diffOpen: () => !el('diff').hidden,
        search: (query: string) =>
            Navigation.search(host.model, query, searchableFields).map((hit) => hit.id),
    };
    (window as unknown as { __ready: boolean }).__ready = true;
}

void main();
