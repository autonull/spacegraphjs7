import { createDemoWithNodes, htmlNode, SpaceGraph } from '../framework';

export default async function htmlTestDemo(): Promise<SpaceGraph> {
    const sg = await createDemoWithNodes(
        [
            {
                id: 'raw-html',
                type: 'HtmlNode',
                position: [-250, 150, 0],
                data: {
                    width: 200,
                    height: 100,
                    useRawHtml: true,
                    html: '<div style="background: linear-gradient(to right, red, orange); color: white; padding: 10px; border-radius: 10px; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: bold;">RAW HTML</div>'
                }
            },
            {
                id: 'styled-node',
                type: 'HtmlNode',
                position: [0, 150, 0],
                data: {
                    width: 200,
                    height: 100,
                    title: 'Styled Node',
                    backgroundColor: 'rgba(0, 200, 100, 0.8)',
                    html: '<div style="padding: 10px;">Content with <b>bold</b> text.</div>'
                }
            },
            {
                id: 'editable-node',
                type: 'HtmlNode',
                position: [250, 150, 0],
                data: {
                    width: 200,
                    height: 100,
                    title: 'Editable Node',
                    editable: true,
                    content: 'Click here to edit me!'
                }
            },
            {
                id: 'glass-node',
                type: 'HtmlNode',
                position: [0, -50, 0],
                data: {
                    width: 300,
                    height: 150,
                    className: 'glass',
                    html: `
                        <div style="padding: 15px;">
                            <h3 style="margin-bottom: 10px;">Glassmorphism</h3>
                            <p style="font-size: 12px; opacity: 0.8;">This node uses the "glass" CSS class for a translucent frosted-glass effect.</p>
                            <button data-sg-interactive="true" style="margin-top: 10px; padding: 5px 10px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; cursor: pointer; border-radius: 4px;">Interactive Button</button>
                        </div>
                    `
                }
            }
        ],
        []
    );

    sg.fitView(150);
    return sg;
}
