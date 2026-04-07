import { createDemoWithNodes, shapeNode } from '../framework';

export default function layoutDemo() {
    const nodes: any[] = [];
    for (let i = 0; i < 12; i++) {
        nodes.push(shapeNode(`n${i}`, [0, 0, 0], { color: Math.random() * 0xffffff, size: 40 }));
    }

    const sg = createDemoWithNodes(nodes);

    // Apply layout after init
    setTimeout(() => {
        const layoutPlugin = sg.pluginManager.getPlugin('AutoLayoutPlugin') as any;
        if (layoutPlugin?.applyLayout) {
            layoutPlugin.applyLayout('GridLayout', { columns: 4, cellWidth: 120, cellHeight: 100 });
        }
    }, 100);

    return sg;
}
