import * as THREE from 'three';
import type { Node } from '../../nodes/Node';
import { BaseLayout, type LayoutOptions } from './BaseLayout';

export interface TimelineLayoutOptions extends LayoutOptions {
  timeField: string;
  orientation: string;
  spacing: number;
  scaleFactor: number;
  staggerLayout: boolean;
  staggerAmount: number;
}

export class TimelineLayout extends BaseLayout<TimelineLayoutOptions> {
  readonly id = 'timeline-layout';
  readonly name = 'Timeline Layout';
  readonly version = '1.0.0';

  protected place(nodes: Node[], config: TimelineLayoutOptions): void {
    const timeline = nodes
      .map((node) => ({ node, time: timeValue(node, config.timeField) }))
      .sort((a, b) => a.time - b.time);
    const minTime = timeline[0]?.time ?? 0;

    const target = new THREE.Vector3();
    let fallbackIndex = 0;
    for (const [index, { node, time }] of timeline.entries()) {
      const hasValidTime = time !== 0 || minTime !== 0;
      const along = hasValidTime
        ? (time - minTime) * config.scaleFactor
        : fallbackIndex++ * config.spacing;
      const stagger = config.staggerLayout
        ? (index % 2 === 0 ? config.staggerAmount : -config.staggerAmount)
        : 0;
      target.set(
        config.orientation === 'horizontal' ? along : stagger,
        config.orientation === 'horizontal' ? stagger : -along,
        0
      );
      this.applyPosition(node, target);
    }

    this.centerNodes(timeline.map((entry) => entry.node));
  }

  protected defaultConfig(): TimelineLayoutOptions {
    return {
      timeField: 'timestamp',
      orientation: 'horizontal',
      spacing: 200,
      scaleFactor: 0.1,
      animate: true,
      duration: 1.5,
      staggerLayout: true,
      staggerAmount: 150,
    };
  }
}

/** A node's place on the timeline: its timestamp in milliseconds, or 0 when it carries none. */
function timeValue(node: Node, timeField: string): number {
  const value = node.data?.[timeField];
  if (value === undefined) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}
