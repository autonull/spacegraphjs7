import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Edge } from '../src/edges/Edge';
import { LabeledEdge } from '../src/edges/LabeledEdge';
import { Node } from '../src/nodes/Node';
import type { SpaceGraph } from '../src/SpaceGraph';
import { declutterLabels } from '../src/utils/labelDeclutter';

class TestNode extends Node {
  readonly object = new THREE.Group();
  constructor(id: string) {
    super({ id, type: 'TestNode', data: {} });
    this.object.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 1)));
  }
}

const endpoints = (): [TestNode, TestNode] => [new TestNode('a'), new TestNode('b')];
const fakeSg = (theme?: unknown) =>
  ({ options: theme ? { theme } : {}, requestFrame: () => {} }) as unknown as SpaceGraph;

describe('L1.17 label declutter', () => {
  it('keeps non-overlapping labels', () => {
    const hidden = declutterLabels([
      { id: 'a', left: 0, top: 0, width: 10, height: 10 },
      { id: 'b', left: 50, top: 0, width: 10, height: 10 },
    ]);
    expect(hidden.size).toBe(0);
  });

  it('hides the lower-priority of two overlapping labels deterministically by id', () => {
    const hidden = declutterLabels([
      { id: 'b', left: 5, top: 0, width: 10, height: 10 },
      { id: 'a', left: 0, top: 0, width: 10, height: 10 },
    ]);
    expect([...hidden]).toEqual(['b']);
  });

  it('lets priority override id order', () => {
    const hidden = declutterLabels([
      { id: 'a', left: 0, top: 0, width: 10, height: 10 },
      { id: 'b', left: 4, top: 0, width: 10, height: 10, priority: 5 },
    ]);
    expect([...hidden]).toEqual(['a']);
  });

  it('hides a label that overlaps a DOM card (higher priority) but never the card', () => {
    const hidden = declutterLabels([
      { id: 'edge:e', left: 0, top: 0, width: 40, height: 12 },
      { id: 'node:card', left: 0, top: 0, width: 120, height: 60, priority: 1 },
    ]);
    expect([...hidden]).toEqual(['edge:e']);
  });
});

describe('L1.17 edge hit area', () => {
  it('honours data.hitWidth in hit testing and restores the raycaster threshold', () => {
    const [source, target] = endpoints();
    const edge = new Edge(
      fakeSg(),
      { id: 'e', source: 'a', target: 'b', data: { hitWidth: 50 } },
      source,
      target
    );

    const seen: number[] = [];
    const raycaster = {
      params: { Line: { threshold: 1 } },
      intersectObject: () => {
        seen.push(raycaster.params.Line.threshold);
        return [];
      },
    };

    expect(edge.hitTest(raycaster as never)).toBeNull();
    expect(seen[0]).toBe(50);
    expect(raycaster.params.Line.threshold).toBe(1);
  });
});

describe('L1.17 themed edge label', () => {
  it('uses the theme label colour/font and exposes its element', () => {
    const sg = fakeSg({ edge: { labelColor: '#abcdef' }, label: { fontSize: 15, fontFamily: 'Inter' } });
    const [source, target] = endpoints();
    const edge = new LabeledEdge(
      sg,
      { id: 'e', source: 'a', target: 'b', data: { label: 'links' } },
      source,
      target
    );

    expect(edge.labelElement).toBe(edge.labelEl);
    const probe = document.createElement('div');
    probe.style.color = '#abcdef';
    expect(edge.labelEl.style.color).toBe(probe.style.color);
    expect(edge.labelEl.style.fontSize).toBe('15px');
    expect(edge.labelEl.style.fontFamily).toBe('Inter');
  });

  it('exposes no label element for a plain edge', () => {
    const [source, target] = endpoints();
    const edge = new Edge(fakeSg(), { id: 'e', source: 'a', target: 'b' }, source, target);
    expect(edge.labelElement).toBeUndefined();
  });
});
