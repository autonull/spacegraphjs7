import { createDemoWithNodes, shapeNode, edge } from '../framework';

export default function nodeDragDemo() {
    const sg = createDemoWithNodes(
        [
            shapeNode('draggable', [0, 0, 0], { color: 0x4488ff, size: 60 }),
            shapeNode('anchor1', [-200, 0, 0], { color: 0x44ff88, size: 40 }),
            shapeNode('anchor2', [200, 0, 0], { color: 0xff4488, size: 40 }),
        ],
        [edge('draggable', 'anchor1'), edge('draggable', 'anchor2')],
    );
    return sg;
}
