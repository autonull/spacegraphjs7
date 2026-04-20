import { createDemo } from '../framework';

export default async function widgetToggleDemo() {
  return await createDemo({
        nodes: [
            {
                id: 'toggle1',
                type: 'ToggleNode',
                position: [0, 50, 0],
                data: {
                    value: false,
                    onColor: 0x44ff88,
                    offColor: 0x666666,
                    width: 80,
                    height: 40,
                },
            },
            {
                id: 'toggle2',
                type: 'ToggleNode',
                position: [0, -50, 0],
                data: {
                    value: true,
                    onColor: 0xff8844,
                    offColor: 0x444466,
                    width: 80,
                    height: 40,
                },
            },
        ],
        edges: [],
    });
}
