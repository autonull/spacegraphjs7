import { createDemoWithNodes, shapeNode, gridLayout } from '../framework';

export default function layoutDemo() {
    const nodes = [];
    for (let i = 0; i < 12; i++) {
        nodes.push(shapeNode(`n${i}`, [0, 0, 0], { color: Math.random() * 0xffffff, size: 40 }));
    }

    const sg = createDemoWithNodes(nodes);

    sg.init().then(() => {
        sg.pluginManager
            .get('AutoLayoutPlugin')
            ?.applyLayout('GridLayout', { columns: 4, cellWidth: 120, cellHeight: 100 });
    });

    return sg;
}
