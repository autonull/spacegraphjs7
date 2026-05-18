import { createDemoWithNodes, htmlNode, edge, SpaceGraph } from '../framework';

export default async function nodeHtmlDemo(): Promise<SpaceGraph> {
  return await createDemoWithNodes(
        [
            htmlNode('html-main', [0, 0, 0], {
                width: 600,
                height: 400,
                className: 'glass pulse-card',
                html: `
                    <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
                        <h2 style="margin: 0 0 15px 0; color: #60a5fa;">System Command Center</h2>
                        <div style="flex-grow: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                                <h3 style="font-size: 14px; margin-top: 0;">Resource Monitor</h3>
                                <div style="margin-top: 10px;">
                                    <label style="font-size: 10px; display: block; margin-bottom: 5px;">CPU LOAD</label>
                                    <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                                        <div style="width: 45%; height: 100%; background: #60a5fa;"></div>
                                    </div>
                                </div>
                                <div style="margin-top: 10px;">
                                    <label style="font-size: 10px; display: block; margin-bottom: 5px;">MEMORY</label>
                                    <div style="height: 6px; background: #334155; border-radius: 3px; overflow: hidden;">
                                        <div style="width: 72%; height: 100%; background: #a78bfa;"></div>
                                    </div>
                                </div>
                            </div>
                            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px;">
                                <h3 style="font-size: 14px; margin-top: 0;">Active Modules</h3>
                                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                                    <button style="padding: 8px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 6px; color: #10b981; cursor: pointer;" data-sg-interactive="true">VISION ENGINE [RUNNING]</button>
                                    <button style="padding: 8px; background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; border-radius: 6px; color: #3b82f6; cursor: pointer;" data-sg-interactive="true">GRAPH LAYOUT [READY]</button>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 20px; display: flex; align-items: center; gap: 15px;">
                             <input type="range" data-sg-interactive="true" style="flex-grow: 1;">
                             <input type="color" data-sg-interactive="true" value="#3b82f6">
                             <input type="checkbox" data-sg-interactive="true" checked>
                        </div>
                    </div>
                `
            }),
            htmlNode('html-status-1', [-400, 200, 100], {
                width: 120,
                height: 120,
                className: 'glass circle-node',
                html: '<div style="text-align: center;"><div style="font-size: 24px;">📡</div><div style="font-size: 10px; margin-top: 5px;">SATELLITE A</div></div>'
            }),
            htmlNode('html-status-2', [400, -200, -100], {
                width: 120,
                height: 120,
                className: 'glass circle-node',
                html: '<div style="text-align: center;"><div style="font-size: 24px;">🔋</div><div style="font-size: 10px; margin-top: 5px;">98%</div></div>'
            }),
            htmlNode('html-small-label', [0, -300, 50], {
                width: 100,
                height: 40,
                className: 'glass',
                html: '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 12px; font-weight: bold;">NODE_X_01</div>'
            })
        ],
        [
            edge('html-main', 'html-status-1'),
            edge('html-main', 'html-status-2'),
            edge('html-main', 'html-small-label')
        ],
    );
}
