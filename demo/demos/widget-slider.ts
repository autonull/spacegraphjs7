import { createDemo } from '../framework';

export default async function widgetSliderDemo() {
  return await createDemo({
        nodes: [
            {
                id: 'slider1',
                type: 'SliderNode',
                position: [0, 50, 0],
                data: {
                    min: 0,
                    max: 100,
                    value: 50,
                    width: 250,
                },
            },
            {
                id: 'slider2',
                type: 'SliderNode',
                position: [0, -50, 0],
                data: {
                    min: 0,
                    max: 1,
                    value: 0.75,
                    width: 250,
                    thumbColor: 0x44ff88,
                },
            },
        ],
        edges: [],
    });
}
