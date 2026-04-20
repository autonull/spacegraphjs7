import { createDemoWithNodes, htmlNode, edge } from '../framework';

export default async function htmlNodeDemo() {
  return await createDemoWithNodes(
        [
            htmlNode('panel1', [-150, 0, 0], {
                title: 'Panel 1',
                backgroundColor: '#1a1a2e',
                color: '#fff',
                width: 200,
                height: 120,
            }),
            htmlNode('panel2', [150, 0, 0], {
                title: 'Panel 2',
                backgroundColor: '#2e1a1a',
                color: '#fff',
                width: 200,
                height: 120,
                editable: true,
                content: 'Editable content...',
            }),
        ],
        [],
    );
}
