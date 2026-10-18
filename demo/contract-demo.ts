// L1.29 — a non-OpenCode reference demo for the renderer contract.
//
// One host-neutral activity model feeds three renderers: the SpaceGraph adapter, the Cytoscape
// adapter, and the static SVG renderer. The reusable pieces are the library's own: LaneLayout for
// positions, GraphController for selection/trail/zoom bands/search, and AccessibilityLayer for
// keyboard traversal. Nothing here imports OpenCode or uses session vocabulary.

import {
  supports,
  type GraphRenderer,
  type Projection,
  type RenderEdge,
  type RenderModel,
  type RenderNode,
  type RenderTheme,
} from '@spacegraphjs/renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { InlineGraph } from '@spacegraphjs/svg-renderer';
import { AccessibilityLayer } from 'spacegraphjs/a11y';
import { GraphController } from 'spacegraphjs/control';
import { LaneLayout } from 'spacegraphjs/layout';
import { activityHostFixture } from './activity-host';

type RendererID = 'spacegraph' | 'cytoscape' | 'svg';
type ThemeName = 'dark' | 'light';
type SceneName = 'pipeline' | 'host';

type ActivityNode = {
  id: string;
  lane: string;
  group?: string;
  ordinal: number;
  depth?: number;
  kind: string;
  label: string;
  summary?: string;
  status?: RenderNode['status'];
  shape?: RenderNode['shape'];
  size?: [number, number, number];
  html?: string;
  data?: Record<string, unknown>;
};

const LANES = ['intent', 'narrative', 'explore', 'edit', 'verify', 'delegate', 'artifacts'] as const;

const THEMES: Record<ThemeName, RenderTheme> = {
  dark: {
    background: '#0b0f17',
    surface: '#151b26',
    surfaceMuted: '#1f2733',
    text: '#e6ecf5',
    textMuted: '#9aa7b8',
    border: '#2b3544',
    accent: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    edge: '#5b6b82',
    edgeMuted: '#3a4658',
    selection: '#60a5fa',
    focus: '#93c5fd',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 13,
  },
  light: {
    background: '#f7f8fa',
    surface: '#ffffff',
    surfaceMuted: '#e9edf3',
    text: '#101828',
    textMuted: '#5b6675',
    border: '#c6cfdb',
    accent: '#2563eb',
    success: '#15803d',
    warning: '#b45309',
    error: '#b91c1c',
    edge: '#8a97a8',
    edgeMuted: '#b6c0cd',
    selection: '#2563eb',
    focus: '#60a5fa',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    fontSize: 13,
  },
};

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`contract demo: missing #${id}`);
  return found as T;
}

function card(title: string, body: string, status?: string): string {
  const tone = status ? ` data-status="${status}"` : '';
  return `<div class="demo-card"${tone}><b>${title}</b><span>${body}</span></div>`;
}

function edge(
  source: string,
  target: string,
  kind: string,
  confidence: RenderEdge['confidence'],
  label?: string
): RenderEdge {
  return { id: `${source}->${target}:${kind}`, source, target, kind, confidence, directed: true, label };
}

// A synthetic activity stream: intent, exploration, an edit with an artifact, delegation, a failing
// verification, a retry, and recovery. It is deliberately generic — any agent UI can produce it.
function pipelineNodes(): ActivityNode[] {
  return [
    { id: 'root', lane: 'intent', ordinal: 0, kind: 'activity', label: 'Reconcile invoice totals', summary: 'A checkout total drifted by a cent.', shape: 'panel', status: 'neutral', size: [240, 72], html: card('activity', 'Reconcile invoice totals', 'neutral') },
    { id: 'plan', lane: 'narrative', ordinal: 0, kind: 'note', label: 'Plan: trace totals, fix rounding, re-verify', summary: 'Three steps, one delegation.', shape: 'panel', status: 'success', size: [240, 72], html: card('plan', 'trace · fix · re-verify', 'success') },

    { id: 'search', lane: 'explore', ordinal: 0, kind: 'call', label: 'grep', summary: 'totals · 4 matches', status: 'success', shape: 'card', size: [240, 72], html: card('grep', 'totals · 4 matches') },
    { id: 'read', lane: 'explore', ordinal: 1, kind: 'call', label: 'read', summary: 'src/billing/totals.ts', status: 'success', shape: 'card', size: [240, 72], html: card('read', 'src/billing/totals.ts') },

    { id: 'edit', lane: 'edit', ordinal: 0, kind: 'call', label: 'edit', summary: 'src/billing/totals.ts', status: 'success', shape: 'card', size: [240, 72], html: card('edit', 'src/billing/totals.ts') },
    { id: 'artifact', lane: 'artifacts', ordinal: 0, depth: 2, kind: 'artifact', label: 'src/billing/totals.ts', status: 'success', shape: 'card', size: [240, 72], html: card('artifact', 'src/billing/totals.ts') },

    { id: 'delegate', lane: 'delegate', ordinal: 0, kind: 'call', label: 'delegate', summary: 'audit rounding', status: 'success', shape: 'card', size: [240, 72], html: card('delegate', 'audit rounding') },
    { id: 'child', lane: 'delegate', ordinal: 1, depth: 2, kind: 'child', label: 'child run · completed', summary: 'found a half-cent drift', status: 'success', shape: 'badge', size: [240, 52], html: card('child run', 'completed · half-cent drift', 'success') },

    { id: 'verify', lane: 'verify', ordinal: 0, kind: 'call', label: 'test billing', summary: 'exit 1', status: 'error', shape: 'card', size: [240, 72], html: card('test billing', 'exit 1 · assertion failed', 'error') },
    { id: 'failure', lane: 'verify', ordinal: 1, depth: 2, kind: 'failure', label: 'expected 12 to equal 13', status: 'error', shape: 'badge', size: [240, 52], html: card('failure', 'expected 12 to equal 13', 'error') },
    { id: 'verify2', lane: 'verify', ordinal: 2, kind: 'call', label: 'test billing', summary: 'exit 0 · 12 passed', status: 'success', shape: 'card', size: [240, 72], html: card('test billing', 'exit 0 · 12 passed') },

    { id: 'retry', lane: 'narrative', ordinal: 1, kind: 'retry', label: 'retry #1', summary: 'round half-cents before summing', status: 'warning', shape: 'badge', size: [240, 52], html: card('retry #1', 'round half-cents first', 'warning') },
    { id: 'edit2', lane: 'edit', ordinal: 1, kind: 'call', label: 'edit', summary: 'src/billing/rounding.ts', status: 'success', shape: 'card', size: [240, 72], html: card('edit', 'src/billing/rounding.ts') },

    { id: 'done', lane: 'narrative', ordinal: 2, kind: 'note', label: 'Recovered', summary: 'Totals agree to the cent.', status: 'success', shape: 'panel', size: [240, 72], html: card('recovered', 'totals agree to the cent', 'success') },
  ];
}

function pipelineEdges(): RenderEdge[] {
  return [
    edge('root', 'plan', 'sequence', 'explicit'),
    edge('plan', 'search', 'sequence', 'explicit'),
    edge('search', 'read', 'sequence', 'explicit'),
    edge('read', 'edit', 'sequence', 'explicit'),
    edge('edit', 'artifact', 'produces', 'explicit'),
    edge('edit', 'delegate', 'sequence', 'explicit'),
    edge('delegate', 'child', 'delegates', 'explicit', 'delegates'),
    edge('delegate', 'verify', 'sequence', 'explicit'),
    edge('verify', 'failure', 'produces', 'explicit'),
    edge('failure', 'retry', 'evidence', 'structural', 'evidence'),
    edge('retry', 'edit2', 'sequence', 'explicit'),
    edge('edit2', 'verify2', 'sequence', 'explicit'),
    edge('verify2', 'done', 'sequence', 'explicit'),
  ];
}

function pipelineScene(): RenderModel {
  const layout = new LaneLayout({ lanes: LANES, laneGap: 110, step: 300, depthStep: 64 });
  const nodes = pipelineNodes();
  const positions = layout.placeAll(
    nodes.map((node) => ({
      id: node.id,
      lane: node.lane,
      ordinal: node.ordinal,
      depth: node.depth,
    }))
  );
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.kind,
      label: node.label,
      summary: node.summary,
      html: node.html,
      size: node.size,
      position: positions[node.id] ?? [0, 0, 0],
      status: node.status ?? 'neutral',
      shape: node.shape ?? 'dot',
      data: node.data,
    })),
    edges: pipelineEdges(),
  };
}

// P8.6 — the second-host fixture is part of the demo, not only of the contract suite.
function hostScene(): RenderModel {
  return activityHostFixture();
}

function sceneModel(name: SceneName): RenderModel {
  return name === 'host' ? hostScene() : pipelineScene();
}

const controller = new GraphController({
  bands: {
    bands: [
      { id: 'overview', min: 0, max: 0.45, label: 'Overview' },
      { id: 'detail', min: 0.45, max: 1, label: 'Detail' },
    ],
    hysteresis: 0.02,
  },
  trailMaxDepth: 8,
});

let sceneName: SceneName = 'pipeline';
let rendererID: RendererID = 'spacegraph';
let projection: Projection = '2d';
let themeName: ThemeName = 'dark';
let direction: 'ltr' | 'rtl' = 'ltr';
let model: RenderModel = pipelineScene();
let renderer: GraphRenderer | null = null;
let inline: InlineGraph | null = null;
let a11y: AccessibilityLayer | null = null;
let mountGeneration = 0;

function currentTheme(): RenderTheme {
  return { ...THEMES[themeName], direction };
}

async function setRenderer(id: RendererID): Promise<void> {
  const generation = ++mountGeneration;
  const canvas = el('canvas');
  const svg = el('svg');

  controller.unbind();
  renderer?.dispose();
  renderer = null;
  inline?.dispose();
  inline = null;
  canvas.replaceChildren();
  svg.replaceChildren();
  rendererID = id;

  if (id === 'svg') {
    el('stage').dataset.renderer = 'svg';
    canvas.hidden = true;
    svg.hidden = false;
    inline = new InlineGraph(svg, { theme: currentTheme() });
    inline.setModel(model);
    updateControls();
    return;
  }

  canvas.hidden = false;
  svg.hidden = true;

  const next = id === 'cytoscape' ? new CytoscapeRenderer() : new SpaceGraphRenderer();
  renderer = next;
  if (!supports(next.capabilities, '3d')) projection = '2d';

  await next.mount(canvas, { theme: currentTheme(), projection });
  if (generation !== mountGeneration) {
    next.dispose();
    return;
  }

  next.setModel(model);
  controller.bind(next);
  next.fit();
  el('stage').dataset.renderer = id;
  renderBand();
  updateControls();
}

function setProjection(next: Projection): void {
  if (next === '3d' && (!renderer || !supports(renderer.capabilities, '3d'))) return;
  projection = next;
  renderer?.setProjection(next);
  updateControls();
}

function setTheme(name: ThemeName): void {
  themeName = name;
  document.documentElement.dataset.theme = name;
  renderer?.setTheme(currentTheme());
  if (inline) {
    inline.dispose();
    inline = new InlineGraph(el('svg'), { theme: currentTheme() });
    inline.setModel(model);
  }
  updateControls();
}

function setDirection(next: 'ltr' | 'rtl'): void {
  direction = next;
  document.documentElement.dir = next;
  setTheme(themeName);
}

async function setScene(name: SceneName): Promise<void> {
  sceneName = name;
  model = sceneModel(name);
  controller.setModel(model);

  a11y?.setItems(
    model.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      status: node.status,
      interactive: node.interactive !== false,
    }))
  );

  const root = model.nodes[0];
  controller.trail.reset(root ? { id: root.id, label: root.label, kind: root.kind } : undefined);
  select(root ? [root.id] : [], false);

  if (rendererID === 'svg') {
    inline?.setModel(model);
  } else if (renderer) {
    renderer.setModel(model);
    renderer.fit();
  }
  updateControls();
}

function select(ids: readonly string[], record = true): void {
  controller.select(ids, record);
}

function renderBand(): void {
  const snapshot = controller.bands.snapshot();
  const percent = Math.round(snapshot.normalized * 100);
  el('band').textContent = `Band: ${snapshot.label ?? snapshot.band} · zoom ${percent}%`;
}

function renderTrail(): void {
  const trail = controller.trail;
  const nav = el('trail');
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = 'Back';
  back.className = 'trail-back';
  back.disabled = !trail.canGoBack;
  back.dataset.role = 'trail-back';
  back.addEventListener('click', () => controller.back());

  const crumbs = trail.entries.map((entry) => {
    const crumb = document.createElement('button');
    crumb.type = 'button';
    crumb.className = 'crumb';
    crumb.textContent = entry.label ?? entry.id;
    crumb.dataset.id = entry.id;
    if (trail.current?.id === entry.id) crumb.setAttribute('aria-current', 'true');
    crumb.addEventListener('click', () => select([entry.id]));
    return crumb;
  });

  nav.replaceChildren(back, ...crumbs);
}

function renderDetail(): void {
  const detail = el('detail');
  const node = controller.selectedNode;
  if (!node) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Select a node to inspect it.';
    detail.replaceChildren(empty);
    return;
  }

  const heading = document.createElement('h2');
  heading.textContent = node.label;

  const meta = document.createElement('p');
  meta.className = 'muted';
  meta.textContent = [node.kind, node.status ?? 'neutral'].filter(Boolean).join(' · ');

  const summary = document.createElement('p');
  summary.textContent = node.summary ?? '';

  const connections = document.createElement('ul');
  connections.className = 'connections';
  for (const { edge: link, node: other } of controller.connections(node.id)) {
    const item = document.createElement('li');
    const follow = document.createElement('button');
    follow.type = 'button';
    follow.className = 'connection';
    follow.dataset.id = other.id;
    follow.dataset.confidence = link.confidence ?? 'explicit';
    follow.textContent = `${link.kind} · ${link.confidence ?? 'explicit'} → ${other.label}`;
    follow.addEventListener('click', () => select([other.id]));
    item.append(follow);
    connections.append(item);
  }

  const parts: HTMLElement[] = [heading, meta];
  if (node.summary) parts.push(summary);
  if (connections.childElementCount) parts.push(connections);
  else {
    const none = document.createElement('p');
    none.className = 'muted';
    none.textContent = 'No connections.';
    parts.push(none);
  }
  detail.replaceChildren(...parts);
}

function updateControls(): void {
  for (const id of ['spacegraph', 'cytoscape', 'svg'] as const) {
    el(`renderer-${id}`).setAttribute('aria-pressed', String(rendererID === id));
  }
  for (const id of ['2d', '3d'] as const) {
    const button = el<HTMLButtonElement>(`projection-${id}`);
    const supported = id === '2d' || (renderer !== null && supports(renderer.capabilities, '3d'));
    button.setAttribute('aria-pressed', String(projection === id));
    button.disabled = !supported;
    button.title = supported ? '' : 'The active renderer has no 3D projection.';
  }
  for (const id of ['dark', 'light'] as const) {
    el(`theme-${id}`).setAttribute('aria-pressed', String(themeName === id));
  }
  for (const id of ['ltr', 'rtl'] as const) {
    el(`direction-${id}`).setAttribute('aria-pressed', String(direction === id));
  }
  el<HTMLButtonElement>('fit').disabled = rendererID === 'svg';
  el<HTMLButtonElement>('scene-pipeline').setAttribute('aria-pressed', String(sceneName === 'pipeline'));
  el<HTMLButtonElement>('scene-host').setAttribute('aria-pressed', String(sceneName === 'host'));
}

function wireControls(): void {
  for (const id of ['spacegraph', 'cytoscape', 'svg'] as const) {
    el(`renderer-${id}`).addEventListener('click', () => void setRenderer(id));
  }
  for (const id of ['2d', '3d'] as const) {
    el(`projection-${id}`).addEventListener('click', () => setProjection(id));
  }
  for (const id of ['dark', 'light'] as const) {
    el(`theme-${id}`).addEventListener('click', () => setTheme(id));
  }
  for (const id of ['ltr', 'rtl'] as const) {
    el(`direction-${id}`).addEventListener('click', () => setDirection(id));
  }
  el('fit').addEventListener('click', () => renderer?.fit());
  el('scene-pipeline').addEventListener('click', () => void setScene('pipeline'));
  el('scene-host').addEventListener('click', () => void setScene('host'));
  window.addEventListener('resize', () => {
    renderer?.resize();
    inline?.resize();
  });
}

function api() {
  return {
    model: () => model,
    nodeCount: () => model.nodes.length,
    renderer: () => rendererID,
    projection: () => projection,
    selection: () => controller.selection,
    trail: () => controller.trail.toLabels(),
    band: () => controller.band,
    select: (id: string) => select([id]),
    clear: () => select([]),
    back: () => controller.back(),
    setRenderer,
    setProjection,
    setScene,
    setTheme,
    setDirection,
  };
}

async function main(): Promise<void> {
  a11y = new AccessibilityLayer(el('a11y'), {
    label: 'Activity nodes (keyboard)',
    onSelect: (id) => select([id]),
    onEscape: () => select([]),
    formatSelection: (labels) => (labels.length ? `Selected ${labels.join(', ')}` : 'Selection cleared'),
  });

  document.documentElement.dataset.theme = themeName;
  controller.onChange(() => {
    a11y?.setSelected(controller.selection);
    renderBand();
    renderTrail();
    renderDetail();
  });
  wireControls();
  await setScene('pipeline');
  await setRenderer('spacegraph');

  (window as unknown as { __contractDemo: ReturnType<typeof api>; __ready: boolean }).__contractDemo = api();
  (window as unknown as { __ready: boolean }).__ready = true;
}

void main();
