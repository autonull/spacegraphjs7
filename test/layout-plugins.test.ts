import { describe, expect, it } from 'vitest';
import { Layout } from '../src/builder/factories';
import { EventSystem } from '../src/core/events/EventSystem';
import { Graph } from '../src/core/Graph';
import { PluginManager } from '../src/core/PluginManager';
import { ShapeNode } from '../src/nodes/ShapeNode';
import { GridLayout } from '../src/plugins/layouts/GridLayout';
import type { SpaceGraph } from '../src/SpaceGraph';

const makeHost = (ids: string[]) => {
  const graph = new Graph();
  const events = new EventSystem();

  for (const id of ids) graph.addNode(new ShapeNode(undefined, { id, type: 'ShapeNode' }));

  const sg = { graph, events, requestFrame: () => {} } as unknown as SpaceGraph;
  const pluginManager = new PluginManager(sg);
  Object.assign(sg, { pluginManager });

  return { sg, graph, events, pluginManager };
};

const positions = (graph: Graph) =>
  [...graph.nodes.values()].map((node) => [node.position.x, node.position.y]);

describe('layout plugins', () => {
  it('places the nodes it owns', async () => {
    const { sg, graph, pluginManager } = makeHost(['a', 'b', 'c']);
    pluginManager.register('GridLayout', new GridLayout());
    await pluginManager.initAll();

    await Layout.apply(sg, 'GridLayout', { columns: 2, spacingX: 100, spacingY: 50 });

    expect(positions(graph)).toEqual([
      [0, 0],
      [100, 0],
      [0, -50],
    ]);
  });

  it('answers to both apply and applyLayout', async () => {
    const { sg, graph, pluginManager } = makeHost(['a', 'b']);
    pluginManager.register('GridLayout', new GridLayout());
    await pluginManager.initAll();

    await Layout.apply(sg, 'GridLayout', { columns: 1, spacingX: 100, spacingY: 100 });
    expect(positions(graph)).toEqual([
      [0, 0],
      [0, -100],
    ]);

    const layout = pluginManager.getPlugin<GridLayout>('GridLayout')!;
    await layout.apply({ columns: 1, spacingX: 100, spacingY: 100 });
    expect(positions(graph)).toEqual([
      [0, 0],
      [0, -100],
    ]);
  });

  it('leaves the pinned nodes where they are', async () => {
    const { sg, graph, pluginManager } = makeHost(['a', 'b']);
    const pinned = graph.getNode('b')!;
    pinned.setPinned(true);
    pinned.updatePosition(50, 50, 0);

    pluginManager.register('GridLayout', new GridLayout());
    await pluginManager.initAll();

    await Layout.apply(sg, 'GridLayout', { columns: 2, spacingX: 100 });

    expect(positions(graph)).toEqual([
      [0, 0],
      [50, 50],
    ]);
  });

  it('announces the layout it applied', async () => {
    const { sg, events, pluginManager } = makeHost(['a']);
    const applied: unknown[] = [];
    events.on('layout:applied', (payload) => applied.push(payload));

    pluginManager.register('GridLayout', new GridLayout());
    await pluginManager.initAll();

    await Layout.apply(sg, 'GridLayout', {});

    expect(applied).toHaveLength(1);
    expect(applied[0]).toMatchObject({ layout: 'grid-layout' });
  });
});
