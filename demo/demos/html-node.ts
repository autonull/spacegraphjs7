import { createDemoWithNodes, htmlNode, edge, SpaceGraph } from '../framework';

export default async function htmlNodeDemo(): Promise<SpaceGraph> {
    const sg = await createDemoWithNodes(
        [
            {
                id: 'hero-node',
                type: 'HtmlNode',
                position: [0, 0, 0],
                data: {
                    width: 500,
                    height: 350,
                    className: 'glass pulse-card',
                    html: `
                        <div style="background: rgba(255, 255, 255, 0.1); padding: 10px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; align-items: center;">
                            <span>Command Console v7.2</span>
                            <span style="font-size:10px; opacity:0.7; color:#10b981;">● SYSTEM READY</span>
                        </div>
                        <div style="padding: 20px; font-size: 13px; line-height: 1.6;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">REACTOR STATUS</label>
                                        <div style="display:flex; gap:5px;">
                                            <button style="flex:1; background: rgba(59, 130, 246, 0.5); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer;" data-sg-interactive="true">START</button>
                                            <button style="flex:1; background: rgba(239, 68, 68, 0.5); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer;" data-sg-interactive="true">STOP</button>
                                        </div>
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">ENERGY OUTPUT</label>
                                        <input type="range" data-sg-interactive="true" value="65" style="width: 100%;">
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">COOLANT TEMP</label>
                                        <div style="height:20px; background:rgba(255,255,255,0.05); border-radius:4px; position:relative; overflow:hidden;">
                                            <div style="width:42%; height:100%; background:linear-gradient(90deg, #3b82f6, #60a5fa);"></div>
                                            <span style="position:absolute; right:5px; top:2px; font-size:10px; font-weight:bold;">42°C</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">ACCESS LEVEL</label>
                                        <select style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; padding:5px; border-radius:4px;" data-sg-interactive="true">
                                            <option>Observer</option>
                                            <option selected>Operator</option>
                                            <option>Administrator</option>
                                        </select>
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">TARGET COORDINATES</label>
                                        <input type="text" value="34.0522° N, 118.2437° W" data-sg-interactive="true" style="font-size:10px; width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; color: white; padding: 4px 8px;">
                                    </div>
                                    <div style="margin-bottom: 12px;">
                                        <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">SYSTEM LOG</label>
                                        <div style="height:60px; background:rgba(0,0,0,0.3); border-radius:4px; padding:5px; font-family:monospace; font-size:9px; overflow-y:auto; color:#10b981;" data-sg-interactive="true">
                                            > Boot sequence complete<br>
                                            > Connection established<br>
                                            > Vision engine online<br>
                                            > Monitoring started...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `
                }
            },
            {
                id: 'stats-node',
                type: 'HtmlNode',
                position: [450, 250, 100],
                data: {
                    width: 280,
                    height: 280,
                    className: 'glass',
                    html: `
                        <div style="background: rgba(255, 255, 255, 0.1); padding: 10px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold; font-size: 14px;">Visual Styles</div>
                        <div style="padding: 20px;">
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-bottom: 4px;">PRIMARY ACCENT</label>
                                <input type="color" value="#3b82f6" data-sg-interactive="true" style="height:40px; width: 100%; border:none; padding:0; background:none; cursor:pointer;">
                            </div>
                            <div style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:12px;">Bloom Effect</span>
                                <input type="checkbox" checked data-sg-interactive="true">
                            </div>
                            <div style="margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:12px;">Dynamic Grid</span>
                                <input type="checkbox" data-sg-interactive="true">
                            </div>
                            <button style="width:100%; margin-top:10px; background: rgba(59, 130, 246, 0.5); border: 1px solid rgba(255, 255, 255, 0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer;" data-sg-interactive="true">APPLY CHANGES</button>
                        </div>
                    `
                }
            },
            {
                id: 'battery-node',
                type: 'HtmlNode',
                position: [-400, -200, 50],
                data: {
                    width: 220,
                    height: 220,
                    className: 'glass circle-node pulse-card',
                    style: {
                        border: '3px solid #60a5fa'
                    },
                    html: `
                        <div style="text-align:center;">
                            <div style="font-size:48px;">🔋</div>
                            <div style="font-weight:bold; font-size:24px;">92%</div>
                            <div style="font-size:10px; opacity:0.6;">REMAINING</div>
                        </div>
                    `
                }
            }
        ],
        [
            edge('hero-node', 'stats-node'),
            edge('hero-node', 'battery-node')
        ]
    );

    sg.fitView(150);
    return sg;
}
