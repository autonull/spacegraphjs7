import type { VisionManager, VisionReport, SpaceGraph } from 'spacegraphjs';
import type { N8nBridge } from './spacegraph-n8n-bridge';

export class N8nVisionHealer {
    private bridge: N8nBridge;
    private vision: VisionManager;
    private sg: SpaceGraph;

    constructor(bridge: N8nBridge, sg: SpaceGraph) {
        this.bridge = bridge;
        this.sg = sg;
        this.vision = sg.vision;
    }

    async healLayout(_workflowId: string): Promise<VisionReport> {
        console.log(`[N8nVisionHealer] Initiating vision analysis for workflow...`);
        let report = await this.vision.analyzeVision();

        if (report.layoutScore < 70) {
            console.log(`[N8nVisionHealer] Layout score ${report.layoutScore} is low. Attempting auto-fix via ForceLayout...`);
            const forceLayout = this.sg.pluginManager.getPlugin?.('ForceLayout') || (this.sg.pluginManager as any).get?.('ForceLayout');

            if (forceLayout?.update) {
                // Run force layout physics ticks to stabilize
                for (let i = 0; i < 100; i++) forceLayout.update(0.016);
            } else if (forceLayout?.run) {
                await forceLayout.run();
            } else {
                console.warn('[N8nVisionHealer] ForceLayout plugin not found or missing update method.');
            }

            // Re-score after running physics
            report = await this.vision.analyzeVision();
        }

        if (report.overlap?.overlaps?.length > 0) {
            console.log(`[N8nVisionHealer] Overlaps detected. Triggering ErgonomicsPlugin to fix...`);
            const ergonomics = this.sg.pluginManager.getPlugin?.('ErgonomicsPlugin') || (this.sg.pluginManager as any).get?.('ErgonomicsPlugin');

            if (ergonomics?.fixOverlaps) {
                await ergonomics.fixOverlaps();
            } else {
                console.warn('[N8nVisionHealer] ErgonomicsPlugin not found or missing fixOverlaps method.');
            }
            // Re-score again
            report = await this.vision.analyzeVision();
        }

        // Push new node positions back to n8n if needed
        this.sg.graph.nodes.forEach(node => {
            this.bridge.pushNodePositionUpdate(node.id, node.position.x, -node.position.y);
        });

        console.log(`[N8nVisionHealer] Healing complete. Final score: ${report.layoutScore}`);
        return report;
    }
}
