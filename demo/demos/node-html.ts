import { createDemoWithNodes, htmlNode, edge, SpaceGraph } from '../framework';

export default async function nodeHtmlDemo(): Promise<SpaceGraph> {
  return await createDemoWithNodes(
        [
            htmlNode('html1', [-200, 0, 0], {
                html: '<h3 style="color: #4488ff;">Welcome</h3><p>This is an HTML node with custom content.</p>',
                backgroundColor: 0x222222,
            }),
            htmlNode('html2', [200, 0, 0], {
                html: '<div style="background: #44aa44; padding: 10px; border-radius: 8px;">Green Box</div>',
                width: 180,
                height: 80,
            }),
            htmlNode('html3', [0, -200, 0], {
                html: '<button style="padding: 10px 20px; background: #ff6644; border: none; border-radius: 4px; color: white;">Click Me</button>',
                width: 200,
                height: 60,
            }),
        ],
        [],
    );
}
