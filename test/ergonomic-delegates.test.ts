// @vitest-environment jsdom
import { Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { ErgonomicsAPI } from '../src/core/Ergonomics';
import { Graph } from '../src/core/Graph';
import { Edge } from '../src/edges/Edge';
import { ShapeNode } from '../src/nodes/ShapeNode';
import { SpaceGraph } from '../src/SpaceGraph';
import { TypeRegistry } from '../src/core/TypeRegistry';

function host(): SpaceGraph {
    const registry = TypeRegistry.getInstance();
    registry.registerNode('ShapeNode', ShapeNode);
    registry.registerEdge('Edge', Edge);
    const sg = Object.create(SpaceGraph.prototype) as SpaceGraph;
    const graph = new Graph(sg);
    Object.assign(sg, {
        graph,
        renderer: { scene: new Scene() },
        animationController: { requestFrame: () => undefined },
    });
    sg.ergo = new ErgonomicsAPI(sg);
    sg.loadSpec({
        nodes: [
            { id: 'a', type: 'ShapeNode', label: 'Plan', data: { lane: 'one' } },
            { id: 'b', type: 'ShapeNode', label: 'Build', data: { lane: 'two' } },
        ],
        edges: [{ id: 'e1', source: 'a', target: 'b' }],
    });
    return sg;
}

describe('SpaceGraph fluent delegates', () => {
    it('queries through the documented names on the main instance', () => {
        const sg = host();
        expect(sg.$('a')?.id).toBe('a');
        expect(sg.at('b')?.label).toBe('Build');
        expect(sg.must('a').id).toBe('a');
        expect(sg.findNodes((node) => node.label === 'Plan').map((node) => node.id)).toEqual(['a']);
        expect(sg.where('lane', 'two').map((node) => node.id)).toEqual(['b']);
        expect(sg.neighbors('a').map((node) => node.id)).toEqual(['b']);
        expect(sg.adjacent('a').map((node) => node.id)).toEqual(['b']);
        expect(sg.connections('a').map((edge) => edge.id)).toEqual(['e1']);
        expect(sg.map((node) => node.id)).toEqual(['a', 'b']);
    });

    it('mutates through the documented aliases', () => {
        const sg = host();
        sg.add({ id: 'c', type: 'ShapeNode', label: 'Verify' });
        expect(sg.getNodesByType('ShapeNode')).toHaveLength(3);
        sg.label('c', 'Test');
        sg.fill('c', 0xff0000);
        sg.shift('c', 10, 20);
        sg.setSize('c', 40, 30);
        expect(sg.must('c').label).toBe('Test');
        expect(sg.must('c').position.x).toBe(10);
        expect(sg.must('c').data.color).toBe(0xff0000);
        expect(sg.removeWhere((node) => node.id === 'c')).toBe(1);
        expect(sg.hasNode('c')).toBe(false);
    });

    it('removes and toggles nodes through the documented names', () => {
        const sg = host();
        expect(sg.toggle('a')).toBe(false);
        expect(sg.$('a')!.visible).toBe(false);
        expect(sg.toggle('a')).toBe(true);
        expect(sg.remove('a')).toBe(true);
        expect(sg.remove('a')).toBe(false);
        expect(sg.hasNode('a')).toBe(false);
    });
    it('exposes the camera and its position as documented', () => {
        const sg = host();
        const camera = { position: { x: 1, y: 2, z: 3 } };
        Object.assign(sg.renderer, { camera });
        expect(sg.camera).toBe(camera);
        expect(sg.cameraPosition).toEqual([1, 2, 3]);
    });
    it('runs a batch with the graph as its argument', () => {
        const sg = host();
        sg.batch((graph) => graph.addNodes([{ id: 'd', type: 'ShapeNode', label: 'Ship' }]));
        expect(sg.$('d')?.label).toBe('Ship');
    });

    it('fails clearly before initialization', () => {
        const sg = Object.create(SpaceGraph.prototype) as SpaceGraph;
        expect(() => sg.$('a')).toThrow(/requires init/);
    });
});
