import { createDemoWithNodes, shapeNode, edge, SpaceGraph } from '../framework';

export default async function edgesDemo(): Promise<SpaceGraph> {
  return await createDemoWithNodes(
        [
            shapeNode('a', [-200, 100, 0], { color: 0xff4466 }),
            shapeNode('b', [0, 100, 0], { color: 0x44ff88 }),
            shapeNode('c', [200, 100, 0], { color: 0x4488ff }),
            shapeNode('d', [-200, -100, 0], { color: 0xffaa44 }),
            shapeNode('e', [0, -100, 0], { color: 0xaa44ff }),
            shapeNode('f', [200, -100, 0], { color: 0xff44aa }),
        ],
        [
            edge('a', 'b', 'CurvedEdge'),
            edge('b', 'c', 'CurvedEdge'),
            edge('d', 'e', 'CurvedEdge'),
            edge('e', 'f', 'CurvedEdge'),
            edge('a', 'd', 'FlowEdge'),
            edge('b', 'e', 'FlowEdge'),
            edge('c', 'f', 'FlowEdge'),
            edge('a', 'c', 'LabeledEdge'),
            edge('d', 'f', 'DottedEdge'),
        ],
    );
}
