// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { forwardGraphEvents } from '../src/core/forwardEvents';
import { Graph } from '../src/core/Graph';
import { Node } from '../src/nodes/Node';

class TestNode extends Node {
  readonly object = new THREE.Object3D();
}

const makeGraph = () => new Graph(undefined as any);
const makeNode = (id: string) => new TestNode({ id, type: 'TestNode' } as any);

describe('graph event forwarding', () => {
  it('mirrors graph mutations onto the event system', () => {
    const graph = makeGraph();
    const events = new EventEmitter();
    forwardGraphEvents(graph, events);

    const seen: string[] = [];
    events.on('node:added', (payload: any) => seen.push(`added:${payload.node.id}`));
    events.on('node:updated', (payload: any) => seen.push(`updated:${payload.node.id}`));
    events.on('node:removed', (payload: any) => seen.push(`removed:${payload.id}`));
    events.on('graph:cleared', () => seen.push('cleared'));

    graph.addNode(makeNode('n1'));
    graph.updateNode('n1', { label: 'renamed' });
    graph.removeNode('n1');
    graph.clear();

    expect(seen).toEqual(['added:n1', 'updated:n1', 'removed:n1', 'cleared']);
  });

  it('leaves graph emissions intact without forwarding', () => {
    const graph = makeGraph();
    const seen: string[] = [];
    graph.on('node:added', (payload: any) => seen.push(payload.node.id));
    graph.addNode(makeNode('solo'));
    expect(seen).toEqual(['solo']);
  });
});

describe('graph positions', () => {
  it('applies absolute positions without animation', () => {
    const graph = makeGraph();
    const n = makeNode('n1');
    graph.addNode(n);
    graph.setPositions({ n1: [10, 20, 30], missing: [1, 2, 3] });
    expect(n.position.toArray()).toEqual([10, 20, 30]);
    expect(n.object.position.toArray()).toEqual([10, 20, 30]);
  });

  it('pins and unpins every node', () => {
    const graph = makeGraph();
    const a = makeNode('a');
    const b = makeNode('b');
    graph.addNode(a);
    graph.addNode(b);
    graph.pinAll();
    expect(a.isPinned() && b.isPinned()).toBe(true);
    graph.pinAll(false);
    expect(a.isPinned() || b.isPinned()).toBe(false);
  });
});
