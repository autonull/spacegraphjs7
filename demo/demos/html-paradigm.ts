import { createDemoWithNodes, edge, SpaceGraph } from '../framework';

export default async function htmlParadigmDemo(): Promise<SpaceGraph> {
    const sg = await createDemoWithNodes(
        [
            {
                id: 'center-hub',
                type: 'HtmlNode',
                position: [0, 0, 0],
                data: {
                    width: 1000,
                    height: 700,
                    useRawHtml: true,
                    html: `
                        <div style="padding: 50px; display: flex; flex-direction: column; height: 100%; font-family: 'Segoe UI', system-ui, sans-serif; color: #e2e8f0; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 2px solid #3b82f6; border-radius: 24px; box-shadow: 0 0 50px rgba(59, 130, 246, 0.3); box-sizing: border-box;">
                            <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                                <div>
                                    <h1 style="font-size: 56px; margin: 0; font-weight: 800; background: linear-gradient(to right, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px;">COMMAND CONSOLE</h1>
                                    <div style="font-size: 14px; color: #94a3b8; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Orbital Defense Network v7.4</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">STABLE</div>
                                    <div style="font-size: 12px; color: #64748b;">LATENCY: 14ms</div>
                                </div>
                            </header>

                            <div style="flex-grow: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                                <section style="background: rgba(255,255,255,0.03); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                                    <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-bottom: 20px; font-weight: 700;">Neural Processing Unit</div>
                                    <div style="display: flex; align-items: baseline; gap: 10px;">
                                        <span style="font-size: 72px; font-weight: 900; color: #60a5fa;">84.2</span>
                                        <span style="font-size: 24px; color: #64748b;">TFLOPS</span>
                                    </div>
                                    <div style="height: 12px; background: rgba(255,255,255,0.05); margin-top: 25px; border-radius: 6px; overflow: hidden;">
                                        <div style="width: 84%; height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa);"></div>
                                    </div>
                                </section>

                                <section style="background: rgba(255,255,255,0.03); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);">
                                    <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-bottom: 20px; font-weight: 700;">Global Synchronicity</div>
                                    <div style="display: flex; align-items: baseline; gap: 10px;">
                                        <span style="font-size: 72px; font-weight: 900; color: #a78bfa;">99.9</span>
                                        <span style="font-size: 24px; color: #64748b;">%</span>
                                    </div>
                                    <div style="height: 12px; background: rgba(255,255,255,0.05); margin-top: 25px; border-radius: 6px; overflow: hidden;">
                                        <div style="width: 99%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #a78bfa);"></div>
                                    </div>
                                </section>

                                <div style="grid-column: span 2; background: rgba(16, 185, 129, 0.05); padding: 25px; border-radius: 16px; border: 1px solid rgba(16, 185, 129, 0.2); display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-size: 18px; font-weight: 700; color: #10b981; display: flex; align-items: center; gap: 12px;">
                                            <span style="width: 12px; height: 12px; background: #10b981; border-radius: 50%; box-shadow: 0 0 15px #10b981;"></span>
                                            UPLINK ACTIVE
                                        </div>
                                        <div style="font-size: 14px; color: #94a3b8; margin-top: 4px;">Connected to Station ALPHA-9</div>
                                    </div>
                                    <div style="text-align: right; font-family: monospace;">
                                        <div style="color: #60a5fa;">TX: 1.2 GB/s</div>
                                        <div style="color: #a78bfa;">RX: 482 MB/s</div>
                                    </div>
                                </div>
                            </div>

                            <footer style="margin-top: 40px; display: flex; gap: 20px;">
                                <button data-sg-interactive="true" style="flex: 2; padding: 22px; background: #3b82f6; color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 18px; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; transition: all 0.2s; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);">Initialize Protocol</button>
                                <button data-sg-interactive="true" style="flex: 1; padding: 22px; background: #334155; color: #e2e8f0; border: 1px solid #475569; border-radius: 12px; font-weight: 700; font-size: 16px; cursor: pointer;">System Diagnostics</button>
                            </footer>
                        </div>
                    `
                }
            },
            {
                id: 'satellite-view',
                type: 'HtmlNode',
                position: [1100, 200, -100],
                data: {
                    width: 600,
                    height: 500,
                    useRawHtml: true,
                    html: `
                        <div style="background: #000; border-radius: 30px; overflow: hidden; height: 100%; border: 4px solid #334155; box-shadow: 0 40px 60px rgba(0,0,0,0.9); display: flex; flex-direction: column; font-family: system-ui, sans-serif;">
                            <div style="flex-grow: 1; background: #111; position: relative; display: flex; align-items: center; justify-content: center; color: white; overflow: hidden;">
                                <div style="font-size: 180px; opacity: 0.6; filter: drop-shadow(0 0 30px #3b82f6);">🛰️</div>
                                <div style="position: absolute; top: 30px; left: 30px; background: rgba(239, 68, 68, 0.9); padding: 8px 16px; border-radius: 6px; font-weight: 900; font-size: 14px; letter-spacing: 1px;">LIVE FEED</div>
                                <div style="position: absolute; top: 30px; right: 30px; color: rgba(255,255,255,0.5); font-family: monospace;">LAT: 45.32 | LON: -122.67</div>

                                <div style="position: absolute; inset: 0; border: 1px solid rgba(255,255,255,0.1); pointer-events: none; background-image:
                                    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
                                    background-size: 40px 40px;"></div>

                                <div style="position: absolute; bottom: 30px; left: 30px; right: 30px;">
                                    <div style="display: flex; justify-content: space-between; color: white; font-size: 12px; margin-bottom: 8px; font-weight: bold;">
                                        <span>SIGNAL STRENGTH</span>
                                        <span>88%</span>
                                    </div>
                                    <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                                        <div style="width: 88%; height: 100%; background: #3b82f6;"></div>
                                    </div>
                                </div>
                            </div>
                            <div style="padding: 30px; background: #1e293b; border-top: 1px solid #334155;">
                                <h3 style="margin: 0; color: white; font-size: 24px; font-weight: 800; text-transform: uppercase;">Aegis-1 Satellite</h3>
                                <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 16px;">Sector: 7G | Status: Online | Fuel: 94%</p>
                            </div>
                        </div>
                    `
                }
            },
            {
                id: 'settings-node',
                type: 'HtmlNode',
                position: [-800, -100, 100],
                data: {
                    width: 450,
                    height: 480,
                    title: 'Configuration Terminal',
                    backgroundColor: '#0f172a',
                    html: `
                        <div style="padding: 25px; color: #e2e8f0; font-family: system-ui, sans-serif;">
                            <div style="margin-bottom: 25px;">
                                <label style="display: block; font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 800; text-transform: uppercase;">Active Theme</label>
                                <select data-sg-interactive="true" style="width: 100%; background: #1e293b; border: 2px solid #334155; color: white; padding: 12px; border-radius: 8px; font-size: 14px;">
                                    <option>Cyberpunk Dark (Default)</option>
                                    <option>Neon Wasteland</option>
                                    <option>Corporate Minimal</option>
                                    <option>Deep Space</option>
                                </select>
                            </div>

                            <div style="margin-bottom: 25px;">
                                <label style="display: block; font-size: 12px; color: #64748b; margin-bottom: 12px; font-weight: 800; text-transform: uppercase;">Translucency Intensity</label>
                                <input type="range" data-sg-interactive="true" style="width: 100%; height: 6px; background: #334155; border-radius: 3px; cursor: pointer;">
                                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-top: 8px;">
                                    <span>SOLID</span>
                                    <span>TRANSPARENT</span>
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 15px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <div style="font-size: 14px; font-weight: 600;">Auto-sync Data</div>
                                        <div style="font-size: 11px; color: #64748b;">Synchronize with orbital array</div>
                                    </div>
                                    <input type="checkbox" checked data-sg-interactive="true" style="width: 24px; height: 24px; cursor: pointer;">
                                </div>
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div>
                                        <div style="font-size: 14px; font-weight: 600;">Holographic HUD</div>
                                        <div style="font-size: 11px; color: #64748b;">Enable spatial UI projections</div>
                                    </div>
                                    <input type="checkbox" data-sg-interactive="true" style="width: 24px; height: 24px; cursor: pointer;">
                                </div>
                            </div>

                            <button data-sg-interactive="true" style="width: 100%; margin-top: 25px; padding: 15px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">SAVE CONFIGURATION</button>
                        </div>
                    `
                }
            },
            {
                id: 'mini-status',
                type: 'HtmlNode',
                position: [0, -350, 0],
                data: {
                    width: 120,
                    height: 60,
                    useRawHtml: true,
                    html: `
                        <div style="background: #10b981; color: white; height: 100%; border-radius: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);">
                            ONLINE
                        </div>
                    `
                }
            }
        ],
        [
            edge('center-hub', 'satellite-view'),
            edge('center-hub', 'settings-node'),
            edge('center-hub', 'mini-status')
        ]
    );

    sg.fitView(150);
    return sg;
}
