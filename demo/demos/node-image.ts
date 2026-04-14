import { createDemo, GraphSpec } from '../framework';

export default function nodeImageDemo() {
    return createDemo({
        nodes: [
            {
                id: 'img1',
                type: 'ImageNode',
                position: [-200, 50, 0],
                data: {
                    src: 'https://picsum.photos/200/150?random=1',
                    width: 200,
                    height: 150,
                },
            },
            {
                id: 'img2',
                type: 'ImageNode',
                position: [0, 50, 0],
                data: {
                    src: 'https://picsum.photos/200/150?random=2',
                    width: 200,
                    height: 150,
                    borderRadius: 10,
                },
            },
            {
                id: 'img3',
                type: 'ImageNode',
                position: [200, 50, 0],
                data: {
                    src: 'https://picsum.photos/200/150?random=3',
                    width: 200,
                    height: 150,
                    borderRadius: 50,
                },
            },
            {
                id: 'img4',
                type: 'ImageNode',
                position: [-100, -150, 0],
                data: {
                    src: 'https://picsum.photos/200/150?random=4',
                    width: 150,
                    height: 150,
                    fit: 'cover',
                },
            },
            {
                id: 'img5',
                type: 'ImageNode',
                position: [100, -150, 0],
                data: {
                    src: 'https://picsum.photos/200/150?random=5',
                    width: 150,
                    height: 150,
                    fit: 'contain',
                },
            },
        ],
        edges: [],
    });
}
