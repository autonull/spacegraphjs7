import { afterEach, describe, expect, it } from 'vitest';
import { createComponent, createRoot, createSignal } from 'solid-js';
import { insert } from 'solid-js/web';
import type { GraphRenderer, RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import { GraphView } from '../src';

const MODEL: RenderModel = {
  nodes: [
    { id: 'root', kind: 'session', label: 'Session', position: [0, 0, 0] },
    { id: 'read', kind: 'call', label: 'read', position: [1, 0, 0] },
  ],
  edges: [{ id: 'e1', source: 'root', target: 'read', kind: 'part-of' }],
};

const THEME: RenderTheme = {
  background: '#000',
  surface: '#111',
  surfaceMuted: '#222',
  text: '#fff',
  textMuted: '#888',
  border: '#333',
  accent: '#0af',
  success: '#0f0',
  warning: '#ff0',
  error: '#f00',
  edge: '#666',
  edgeMuted: '#444',
  selection: '#0af',
  focus: '#0af',
  fontFamily: 'sans-serif',
  fontSize: 12,
};

type Handler = (payload: unknown) => void;

function fakeRenderer() {
  const listeners = new Map<string, Set<Handler>>();
  const calls = { mounted: 0, models: [] as RenderModel[], disposed: 0, selection: [] as (readonly string[])[] };
  const renderer = {
    capabilities: {
      contractVersion: 1,
      projections: ['2d', '3d'],
      domNodes: true,
      maxDomNodes: 40,
      edgeLabels: true,
      clusterNodes: true,
      minimap: false,
      maxRecommendedNodes: 300,
    },
    async mount() {
      calls.mounted += 1;
    },
    setModel(model: RenderModel) {
      calls.models.push(model);
    },
    setTheme() {},
    setProjection() {},
    setSelection(ids: readonly string[]) {
      calls.selection.push(ids);
    },
    setViewport() {},
    fit() {},
    focus() {},
    resize() {},
    on(event: string, handler: Handler) {
      const set = listeners.get(event) ?? new Set<Handler>();
      set.add(handler);
      listeners.set(event, set);
      return () => set.delete(handler);
    },
    dispose() {
      calls.disposed += 1;
    },
  };
  return { renderer: renderer as unknown as GraphRenderer, calls };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const disposers: (() => void)[] = [];

function mount(code: () => unknown) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const dispose = createRoot((root) => {
    insert(container, code() as Node);
    return root;
  });
  disposers.push(dispose);
  return container;
}

afterEach(() => {
  for (const dispose of disposers) dispose();
  disposers.length = 0;
  document.body.innerHTML = '';
});

describe('solid-spacegraph GraphView', () => {
  it('mounts the renderer, pushes the model and selection, and disposes on cleanup', async () => {
    const { renderer, calls } = fakeRenderer();
    mount(() =>
      createComponent(GraphView, {
        createRenderer: () => renderer,
        model: MODEL,
        theme: THEME,
        selection: ['read'],
      })
    );

    await flush();

    expect(calls.mounted).toBe(1);
    expect(calls.models.at(-1)?.nodes.map((node) => node.id)).toEqual(['root', 'read']);
    expect(calls.selection.at(-1)).toEqual(['read']);

    for (const dispose of disposers) dispose();
    disposers.length = 0;
    expect(calls.disposed).toBe(1);
  });

  it('reacts to a model signal without remounting the renderer', async () => {
    const { renderer, calls } = fakeRenderer();
    const [model, setModel] = createSignal<RenderModel>(MODEL);
    mount(() =>
      createComponent(GraphView, {
        createRenderer: () => renderer,
        get model() {
          return model();
        },
        theme: THEME,
      })
    );
    await flush();
    calls.models.length = 0;

    setModel({ nodes: [{ id: 'root', kind: 'session', label: 'Session', position: [0, 0, 0] }], edges: [] });
    await flush();

    expect(calls.mounted).toBe(1);
    expect(calls.models.at(-1)?.nodes.map((node) => node.id)).toEqual(['root']);
  });
});
