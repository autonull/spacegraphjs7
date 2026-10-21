import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Graph } from '../src/core/Graph';
import { Edge } from '../src/edges/Edge';
import { Node } from '../src/nodes/Node';

class TestNode extends Node {
  get object() {
    return new THREE.Object3D();
  }
}

class TestEdge extends Edge {
  get object(): Edge['object'] {
    return new THREE.Object3D() as unknown as Edge['object'];
  }

  updatePositions() {}
}

/**
 * A graph of four nodes in a line: a -> b -> c -> d, plus a chord from a to c.
 */
function chainGraph(): Graph {
  const graph = new Graph();
  const nodes = ['a', 'b', 'c', 'd'].map(
    (id) => new TestNode({ id, type: 'TestNode' }) as Node
  );
  for (const node of nodes) graph.addNode(node);

  const link = (source: Node, target: Node) =>
    graph.addEdge(
      new TestEdge(
        { id: `${source.id}-${target.id}`, source: source.id, target: target.id, type: 'TestEdge' },
        source,
        target
      )
    );

  link(nodes[0], nodes[1]);
  link(nodes[1], nodes[2]);
  link(nodes[2], nodes[3]);
  link(nodes[0], nodes[2]);

  return graph;
}

describe('Graph traversal', () => {
  it('walks breadth first from a start, one node per depth', () => {
    const graph = chainGraph();
    const visited: Array<[string, number]> = [];

    graph.bfs((node, depth) => visited.push([node.id, depth]), 'a');

    expect(visited).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 1],
      ['d', 2],
    ]);
  });

  it('finds the shortest path between two nodes', () => {
    const graph = chainGraph();

    expect(graph.findPath('a', 'd')?.map((node) => node.id)).toEqual(['a', 'c', 'd']);
    expect(graph.findPath('a', 'c')?.map((node) => node.id)).toEqual(['a', 'c']);
    expect(graph.findPath('c', 'a')?.map((node) => node.id)).toEqual(['c', 'a']);
  });

  it('finds no path when a node is out of reach or unknown', () => {
    const graph = chainGraph();
    const isolated = new TestNode({ id: 'isolated', type: 'TestNode' }) as Node;
    graph.addNode(isolated);

    expect(graph.findPath('a', 'isolated')).toBeNull();
    expect(graph.findPath('missing', 'a')).toBeNull();
    expect(graph.findPath('a', 'missing')).toBeNull();
  });

  it('finds a path to a node from itself', () => {
    const graph = chainGraph();

    expect(graph.findPath('a', 'a')?.map((node) => node.id)).toEqual(['a']);
  });

  it('reports the nodes with no edge on a side', () => {
    const graph = chainGraph();

    expect(graph.getRootNodes().map((node) => node.id)).toEqual(['a']);
    expect(graph.getLeafNodes().map((node) => node.id)).toEqual(['d']);
  });
});
