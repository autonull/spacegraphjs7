import { createDemoWithNodes, SpaceGraph } from '../framework';

export default async function htmlSimpleTestDemo(): Promise<SpaceGraph> {
    const sg = await createDemoWithNodes(
        [
            {
                id: 'simple-node',
                type: 'HtmlNode',
                position: [0, 0, 0],
                data: {
                    width: 800,
                    height: 500,
                    backgroundColor: '#1e293b',
                    html: `
                        <div style="background: #ef4444; color: white; width: 100%; min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 10px solid white; box-sizing: border-box;">
                            <h1 style="font-size: 80px; margin: 0; font-weight: 900;">SUCCESS</h1>
                            <p style="font-size: 32px;">HTML CONTENT IS RENDERED</p>
                            <div style="margin-top: 40px; padding: 20px; background: white; color: black; border-radius: 8px; font-weight: bold;">
                                TEST BUTTON (INTERACTIVE)
                            </div>
                        </div>
                    `
                }
            }
        ]
    );

    sg.fitView(100);
    return sg;
}
