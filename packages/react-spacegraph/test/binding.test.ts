import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { GraphRenderer, RenderModel, RenderTheme } from '@spacegraphjs/renderer';
import { GraphView } from '../src';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

let roots: Root[] = [];

function mount(node: ReturnType<typeof createElement>) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  return { root, render: () => act(async () => root.render(node)) };
}

afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount());
  roots = [];
  document.body.innerHTML = '';
});

describe('react-spacegraph GraphView', () => {
  it('mounts the renderer, pushes the model and selection, and disposes on unmount', async () => {
    const { renderer, calls } = fakeRenderer();
    const { root, render } = mount(
      createElement(GraphView, { createRenderer: () => renderer, model: MODEL, theme: THEME, selection: ['read'] })
    );

    await render();
    await flush();

    expect(calls.mounted).toBe(1);
    expect(calls.models.at(-1)?.nodes.map((node) => node.id)).toEqual(['root', 'read']);
    expect(calls.selection.at(-1)).toEqual(['read']);

    await act(async () => root.unmount());
    expect(calls.disposed).toBe(1);
  });

  it('pushes a new model without remounting the renderer', async () => {
    const { renderer, calls } = fakeRenderer();
    const { render } = mount(createElement(GraphView, { createRenderer: () => renderer, model: MODEL, theme: THEME }));
    await render();
    await flush();
    calls.models.length = 0;

    const next: RenderModel = { nodes: [{ id: 'root', kind: 'session', label: 'Session', position: [0, 0, 0] }], edges: [] };
    await act(async () => {
      roots[0]!.render(createElement(GraphView, { createRenderer: () => renderer, model: next, theme: THEME }));
    });

    expect(calls.mounted).toBe(1);
    expect(calls.models.at(-1)?.nodes.map((node) => node.id)).toEqual(['root']);
  });

  it('leaves exactly one live renderer under StrictMode double-invoke', async () => {
    const created: ReturnType<typeof fakeRenderer>[] = [];
    const { render } = mount(
      createElement(
        StrictMode,
        null,
        createElement(GraphView, {
          createRenderer: () => {
            const fake = fakeRenderer();
            created.push(fake);
            return fake.renderer;
          },
          model: MODEL,
          theme: THEME,
        })
      )
    );

    await render();
    await flush();

    expect(created.length).toBeGreaterThanOrEqual(2);
    const alive = created.filter((fake) => fake.calls.disposed === 0);
    expect(alive).toHaveLength(1);
  });
});
