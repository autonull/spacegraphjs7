import { describe, expect, it, vi } from 'vitest';
import type { GraphRenderer, RenderTheme } from '@spacegraphjs/renderer';
import {
  GraphBinding,
  type BindingRenderer,
  type ControlEventMap,
  type ControlModel,
} from 'spacegraphjs/control';

type Theme = { background: string };
const THEME: Theme = { background: '#000' };

function model(): ControlModel {
  return {
    nodes: [
      { id: 'root', label: 'Session', kind: 'session' },
      { id: 'read', label: 'read', kind: 'call' },
      { id: 'edit', label: 'edit', kind: 'call' },
    ],
    edges: [{ id: 'e1', source: 'root', target: 'read', kind: 'part-of' }],
  };
}

const last = <T>(values: readonly T[]): T | undefined => values[values.length - 1];

type AnyHandler = (payload: never) => void;

function fakeRenderer(options: { fail?: boolean; deferred?: boolean } = {}) {
  const listeners = new Map<string, Set<AnyHandler>>();
  let resolveMount: (() => void) | undefined;
  const calls = {
    mounted: 0,
    mountOptions: [] as { theme: unknown; projection: string }[],
    models: [] as ControlModel[],
    themes: [] as unknown[],
    projections: [] as string[],
    selection: [] as (readonly string[])[],
    focused: [] as string[],
    fits: 0,
    disposed: 0,
  };

  const renderer: BindingRenderer<Theme> & {
    emit: <K extends keyof ControlEventMap>(event: K, payload: ControlEventMap[K]) => void;
    calls: typeof calls;
  } = {
    async mount(_container, mountOptions) {
      calls.mounted += 1;
      calls.mountOptions.push(mountOptions);
      if (options.deferred) await new Promise<void>((resolve) => (resolveMount = resolve));
      if (options.fail) throw new Error('mount failed');
    },
    setModel(value) {
      calls.models.push(value);
    },
    setTheme(value) {
      calls.themes.push(value);
    },
    setProjection(value) {
      calls.projections.push(value);
    },
    setSelection(ids) {
      calls.selection.push(ids);
    },
    fit() {
      calls.fits += 1;
    },
    focus(id) {
      calls.focused.push(id);
    },
    on(event, handler) {
      const set = listeners.get(event) ?? new Set<AnyHandler>();
      set.add(handler as AnyHandler);
      listeners.set(event, set);
      return () => set.delete(handler as AnyHandler);
    },
    dispose() {
      calls.disposed += 1;
    },
    emit(event, payload) {
      for (const handler of listeners.get(event) ?? []) (handler as (value: unknown) => void)(payload);
    },
    calls,
  };
  return {
    renderer,
    calls,
    resolveMount: () => resolveMount?.(),
  };
}

describe('GraphBinding', () => {
  it('mounts the renderer, binds the controller, and pushes the initial state', async () => {
    const { renderer, calls } = fakeRenderer();
    const onReady = vi.fn();
    const binding = new GraphBinding<Theme>({
      createRenderer: () => renderer,
      theme: THEME,
      model: model(),
      projection: '3d',
      selection: ['read'],
      onReady,
    });

    await binding.mount(document.createElement('div'));

    expect(calls.mounted).toBe(1);
    expect(calls.mountOptions).toEqual([{ theme: THEME, projection: '3d' }]);
    expect(last(calls.models)?.nodes).toHaveLength(3);
    expect(calls.selection).toContainEqual(['read']);
    expect(binding.ready).toBe(true);
    expect(onReady).toHaveBeenCalledWith(binding);
  });

  it('is idempotent on mount', async () => {
    const { renderer, calls } = fakeRenderer();
    const binding = new GraphBinding<Theme>({ createRenderer: () => renderer, theme: THEME });
    await binding.mount(document.createElement('div'));
    await binding.mount(document.createElement('div'));
    expect(calls.mounted).toBe(1);
  });

  it('pushes model, theme, projection, and selection to the mounted renderer', async () => {
    const { renderer, calls } = fakeRenderer();
    const binding = new GraphBinding<Theme>({ createRenderer: () => renderer, theme: THEME });
    await binding.mount(document.createElement('div'));
    calls.models.length = 0;

    binding.setModel(model());
    binding.setTheme({ background: '#fff' });
    binding.setProjection('3d');
    binding.setSelection(['edit']);

    expect(last(calls.models)?.nodes).toHaveLength(3);
    expect(last(calls.themes)).toEqual({ background: '#fff' });
    expect(last(calls.projections)).toBe('3d');
    expect(last(calls.selection)).toEqual(['edit']);
  });

  it('forwards renderer events into the controller and delegates fit/focus', async () => {
    const { renderer, calls } = fakeRenderer();
    const binding = new GraphBinding<Theme>({ createRenderer: () => renderer, theme: THEME, model: model() });
    await binding.mount(document.createElement('div'));

    renderer.emit('nodeClick', { id: 'read' });
    expect(binding.controller.selection).toEqual(['read']);

    binding.fit(['read', 'edit']);
    binding.focus('edit');
    expect(calls.fits).toBe(1);
    expect(calls.focused).toEqual(['edit']);
  });

  it('disposes the renderer, unbinds, and no-ops after dispose', async () => {
    const { renderer, calls } = fakeRenderer();
    const onChange = vi.fn();
    const binding = new GraphBinding<Theme>({
      createRenderer: () => renderer,
      theme: THEME,
      model: model(),
      onChange,
    });
    await binding.mount(document.createElement('div'));
    onChange.mockClear();

    binding.dispose();
    expect(calls.disposed).toBe(1);

    binding.setModel(model());
    binding.setTheme({ background: '#fff' });
    expect(calls.disposed).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disposes a renderer whose mount resolves after an unmount (StrictMode double-mount)', async () => {
    const { renderer, calls, resolveMount } = fakeRenderer({ deferred: true });
    const onReady = vi.fn();
    const binding = new GraphBinding<Theme>({ createRenderer: () => renderer, theme: THEME, onReady });

    const mounting = binding.mount(document.createElement('div'));
    binding.dispose();
    resolveMount();
    await mounting;

    expect(calls.disposed).toBe(1);
    expect(onReady).not.toHaveBeenCalled();
    expect(binding.ready).toBe(false);
  });

  it('reports a mount failure through onError and stays unready', async () => {
    const { renderer } = fakeRenderer({ fail: true });
    const onError = vi.fn();
    const binding = new GraphBinding<Theme>({ createRenderer: () => renderer, theme: THEME, onError });

    await binding.mount(document.createElement('div'));

    expect(onError).toHaveBeenCalledOnce();
    expect(binding.ready).toBe(false);
  });

  it('exposes a controller a framework can observe', async () => {
    const { renderer } = fakeRenderer();
    const onChange = vi.fn();
    const binding = new GraphBinding<Theme>({
      createRenderer: () => renderer,
      theme: THEME,
      model: model(),
      onChange,
    });
    await binding.mount(document.createElement('div'));
    onChange.mockClear();

    binding.controller.select('read');
    expect(onChange).toHaveBeenCalled();
    expect(last(onChange.mock.calls)?.[0].selection).toEqual(['read']);
  });

  it('accepts a contract adapter as its renderer', () => {
    const accept = (renderer: BindingRenderer<RenderTheme>) => renderer;
    const graphRenderer = {} as GraphRenderer;
    expect(accept(graphRenderer)).toBe(graphRenderer);
  });
});
