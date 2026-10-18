import { describe, expect, it, vi } from 'vitest';
import type { GraphRenderer } from '@spacegraphjs/renderer';
import {
  GraphController,
  type ControlEventMap,
  type ControlModel,
  type ControlRenderer,
} from 'spacegraphjs/control';

function model(): ControlModel {
  return {
    nodes: [
      { id: 'root', label: 'Reconcile invoice totals', kind: 'activity' },
      { id: 'read', label: 'read', kind: 'call', summary: 'src/billing/totals.ts' },
      { id: 'edit', label: 'edit', kind: 'call', summary: 'src/billing/rounds.ts' },
      { id: 'verify', label: 'test billing', kind: 'call', summary: 'exit 1' },
    ],
    edges: [
      { id: 'e1', source: 'root', target: 'read', kind: 'sequence' },
      { id: 'e2', source: 'read', target: 'edit', kind: 'sequence' },
      { id: 'e3', source: 'edit', target: 'verify', kind: 'sequence', confidence: 'explicit' },
      { id: 'dangling', source: 'edit', target: 'missing', kind: 'sequence' },
    ],
  };
}

type AnyHandler = (payload: never) => void;

function fakeRenderer() {
  const listeners = new Map<string, Set<AnyHandler>>();
  const calls = { selection: [] as (readonly string[])[], focused: [] as string[], fits: 0, disposed: 0 };

  const renderer: ControlRenderer & {
    emit: <K extends keyof ControlEventMap>(event: K, payload: ControlEventMap[K]) => void;
    calls: typeof calls;
  } = {
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
  return renderer;
}

describe('GraphController', () => {
  it('keeps selection to known ids and dedupes', () => {
    const controller = new GraphController();
    controller.setModel(model());
    controller.select(['read', 'read', 'missing']);
    expect(controller.selection).toEqual(['read']);
  });

  it('records a single selection in the trail and navigates back and forward', () => {
    const controller = new GraphController();
    controller.setModel(model());
    controller.select('read');
    controller.select('edit');
    expect(controller.trail.toLabels()).toEqual(['read', 'edit']);
    controller.back();
    expect(controller.selection).toEqual(['read']);
    expect(controller.selection).not.toEqual(['missing']);
    controller.forward();
    expect(controller.selection).toEqual(['edit']);
  });

  it('does not record a multi-selection in the trail', () => {
    const controller = new GraphController();
    controller.setModel(model());
    controller.select(['read', 'edit']);
    expect(controller.trail.entries).toEqual([]);
  });

  it('reconciles selection and trail across a model update by id', () => {
    const controller = new GraphController();
    controller.setModel(model());
    controller.select('read');
    controller.select('edit');
    const next = model();
    next.nodes = next.nodes.filter((node) => node.id !== 'edit');
    controller.setModel(next);
    expect(controller.selection).toEqual([]);
    expect(controller.trail.toLabels()).toEqual(['read']);
    expect(controller.selectedNode).toBeUndefined();
  });

  it('toggles a node in and out of a multi-selection', () => {
    const controller = new GraphController();
    controller.setModel(model());
    controller.select('read');
    controller.toggle('edit');
    expect(controller.selection).toEqual(['read', 'edit']);
    controller.toggle('read');
    expect(controller.selection).toEqual(['edit']);
  });

  it('ranks search hits by field and drops misses', () => {
    const controller = new GraphController();
    controller.setModel(model());
    expect(controller.search('read').map((node) => node.id)).toEqual(['read']);
    expect(controller.search('billing').map((node) => node.id)).toEqual(['verify', 'read', 'edit']);
    expect(controller.search('totals.ts').map((node) => node.id)).toEqual(['read']);
    expect(controller.search('nope')).toEqual([]);
    expect(controller.search('   ')).toEqual([]);
  });

  it('lists connections and ignores dangling edges', () => {
    const controller = new GraphController();
    controller.setModel(model());
    expect(controller.connections('edit').map((link) => link.node.id)).toEqual(['read', 'verify']);
    expect(controller.connections('missing')).toEqual([]);
  });

  it('maps a viewport to a named zoom band', () => {
    const controller = new GraphController({
      bands: [
        { id: 'overview', min: 0, max: 0.5 },
        { id: 'detail', min: 0.5, max: 1 },
      ],
    });
    controller.setModel(model());
    controller.feedNormalized(0.2);
    expect(controller.band).toBe('overview');
    controller.feedNormalized(0.9);
    expect(controller.band).toBe('detail');
  });

  it('forwards renderer events without echoing the selection back', () => {
    const controller = new GraphController({
      bands: [
        { id: 'overview', min: 0, max: 0.5 },
        { id: 'detail', min: 0.5, max: 1 },
      ],
    });
    controller.setModel(model());
    const renderer = fakeRenderer();
    controller.bind(renderer);
    renderer.calls.selection.length = 0;

    renderer.emit('selectionChange', { ids: ['verify'] });
    expect(controller.selection).toEqual(['verify']);
    expect(renderer.calls.selection).toEqual([]); // no echo back to the renderer

    renderer.emit('viewportChange', { zoom: 0.8, center: [0, 0, 0] });
    expect(controller.band).toBe('detail');

    renderer.emit('nodeDoubleClick', { id: 'edit' });
    expect(renderer.calls.focused).toEqual(['edit']);

    renderer.emit('backgroundClick', undefined);
    expect(controller.selection).toEqual([]);
    expect(renderer.calls.selection).toEqual([[]]); // a programmatic clear does reach the renderer
  });

  it('drives an explicit selection through to the renderer', () => {
    const controller = new GraphController();
    controller.setModel(model());
    const renderer = fakeRenderer();
    controller.bind(renderer);
    renderer.calls.selection.length = 0;
    controller.select('edit');
    expect(renderer.calls.selection).toEqual([['edit']]);
    controller.fit(['edit', 'verify']);
    expect(renderer.calls.fits).toBe(1);
  });

  it('notifies listeners on selection, trail, and band changes and stops after dispose', () => {
    const controller = new GraphController({
      bands: [
        { id: 'overview', min: 0, max: 0.5 },
        { id: 'detail', min: 0.5, max: 1 },
      ],
    });
    controller.setModel(model());
    const listener = vi.fn();
    controller.onChange(listener);
    controller.select('read');
    controller.feedNormalized(0.7);
    expect(listener).toHaveBeenCalled();
    expect(listener.mock.calls[listener.mock.calls.length - 1]?.[0].band).toBe('detail');

    controller.dispose();
    const count = listener.mock.calls.length;
    controller.select('edit');
    expect(listener.mock.calls.length).toBe(count);
  });

  it('exposes a renderer surface a contract adapter satisfies', () => {
    const accept = (renderer: ControlRenderer) => renderer;
    const graphRenderer = {} as GraphRenderer;
    expect(accept(graphRenderer)).toBe(graphRenderer);
  });
});
