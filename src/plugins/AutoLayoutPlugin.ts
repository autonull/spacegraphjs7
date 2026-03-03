import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class AutoLayoutPlugin implements ISpaceGraphPlugin {
  readonly id = 'auto-layout';
  readonly name = 'Auto Layout';
  readonly version = '1.0.0';

  private sg!: SpaceGraph;

  init(sg: SpaceGraph): void {
    this.sg = sg;
    console.log(`[AutoLayoutPlugin] Initialized ${this.name} v${this.version}`);
  }

  onPreRender(delta: number): void {
    // This plugin will serve as a skeleton for AI vision layout adjustments.
    // In the future, VisionManager will call methods on this plugin to auto-correct
    // overlapping nodes and poor visual groupings.
  }

  public applyVisionCorrection(issues: any[]): void {
      console.log(`[AutoLayoutPlugin] Received ${issues.length} vision issues to auto-fix.`);
      const overlapIssues = issues.filter(i => i.type === 'overlap');
      if (overlapIssues.length > 0) {
          this.fixOverlaps(overlapIssues);
      }
  }

  public fixOverlaps(overlaps: any[]): void {
      console.log(`[AutoLayoutPlugin] Auto-fixing ${overlaps.length} overlaps...`);
      const layoutPlugin: any = this.sg.pluginManager.getPlugin('ForceLayout');

      if (layoutPlugin && typeof layoutPlugin.apply === 'function') {
          // Temporarily increase distance to push overlapping nodes apart
          const originalDistance = layoutPlugin.settings.nodeDistance || 100;
          layoutPlugin.settings.nodeDistance = originalDistance * 2;

          // Run a few steps of physics to separate nodes rapidly
          layoutPlugin.apply();

          // Restore settings
          setTimeout(() => {
              layoutPlugin.settings.nodeDistance = originalDistance;
          }, 500);
      } else {
          // Fallback if no physics layout plugin: manually push nodes apart
          for (const issue of overlaps) {
              const nodeA = this.sg.graph.nodes.get(issue.nodeA);
              const nodeB = this.sg.graph.nodes.get(issue.nodeB);
              if (nodeA && nodeB) {
                  const dir = nodeB.position.clone().sub(nodeA.position);
                  if (dir.lengthSq() < 0.01) {
                      dir.set(Math.random() - 0.5, Math.random() - 0.5, 0);
                  }

                  // Move them apart by a fixed amount along the axis between them
                  dir.normalize().multiplyScalar(30);
                  nodeB.position.add(dir);
                  nodeA.position.sub(dir);
                  nodeA.object.position.copy(nodeA.position);
                  nodeB.object.position.copy(nodeB.position);
              }
          }
      }
  }

  dispose(): void {
    console.log(`[AutoLayoutPlugin] Disposing ${this.name}`);
  }
}
