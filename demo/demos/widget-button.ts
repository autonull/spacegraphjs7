import { createDemo } from '../framework';

export default function widgetButtonDemo() {
    return createDemo({
        nodes: [
            {
                id: 'button1',
                type: 'ButtonNode',
                label: 'Click Me',
                position: [0, 50, 0],
                data: {
                    color: 0x4488ff,
                    width: 150,
                    height: 50,
                },
            },
            {
                id: 'button2',
                type: 'ButtonNode',
                label: 'Secondary',
                position: [0, -50, 0],
                data: {
                    color: 0x44ff88,
                    width: 150,
                    height: 50,
                },
            },
        ],
        edges: [],
    });
}
