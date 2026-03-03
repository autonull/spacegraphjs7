import type { Plugin } from 'vite';
import { runVisionAnalysis } from './analyzer';

export interface VisionPluginOptions {
  enabled?: boolean;
  autoFix?: boolean;
  thresholds?: {
    layout?: number;
    legibility?: number;
  };
}

export function spacegraphVision(options: VisionPluginOptions = {}): Plugin {
  return {
    name: 'spacegraph-vision',
    enforce: 'post',

    async closeBundle() {
      if (!options.enabled) return;
      console.log('👁️  Vision analysis running on build output...');

      const report = await runVisionAnalysis('dist');
      console.log('Vision Analysis Report:', report);

      if (options.thresholds?.layout && report.layoutScore < options.thresholds.layout) {
          console.warn(`[WARNING] Layout score (${report.layoutScore}) is below threshold (${options.thresholds.layout})`);
      }

      if (options.thresholds?.legibility && report.legibilityScore < options.thresholds.legibility) {
          console.warn(`[WARNING] Legibility score (${report.legibilityScore}) is below threshold (${options.thresholds.legibility})`);
      }
    },

    configureServer(server) {
      server.middlewares.use('/__vision', async (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
    },
  };
}
