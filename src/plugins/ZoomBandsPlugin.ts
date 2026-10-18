import type { EventSystem } from '../core/events/EventSystem';
import type { Graph } from '../core/Graph';
import type { SpaceGraph } from '../SpaceGraph';
import { ZoomBands, type ZoomBand, type ZoomBandsConfig } from '../zoom/ZoomBands';
import { BaseSystemPlugin } from './BaseSystemPlugin';

const DEFAULT_BANDS: ZoomBand[] = [
  { id: 'overview', min: 0, max: 0.34, label: 'Overview' },
  { id: 'execution', min: 0.34, max: 0.67, label: 'Execution' },
  { id: 'detail', min: 0.67, max: 1, label: 'Detail' },
];

// Thin chrome plugin over the headless ZoomBands controller. It subscribes to the core's normalized
// `zoom:change` telemetry and reports band changes; it owns no rendering and no semantic policy.
// Replaces FractalZoomPlugin: it re-emits the legacy `fractal:level-change` channel, with band index
// as `to`, so ZoomUIPlugin and existing demos keep working unchanged.
export class ZoomBandsPlugin extends BaseSystemPlugin {
  readonly id = 'zoom-bands';
  readonly name = 'Zoom Bands';
  readonly version = '1.0.0';

  readonly bands: ZoomBands;

  constructor(config: Partial<ZoomBandsConfig> = {}) {
    super();
    this.bands = new ZoomBands({ bands: config.bands ?? DEFAULT_BANDS, hysteresis: config.hysteresis });
  }

  get currentBand(): string {
    return this.bands.band;
  }

  init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
    super.init(sg, graph, events);
    this.on('zoom:change', (event: { zoom: number }) => this.feed(event.zoom));
    this.feed(sg.zoom, true);
  }

  feed(normalized: number, force = false): void {
    const from = this.bands.band;
    const snapshot = this.bands.feedNormalized(normalized);
    if (!force && snapshot.band === from) return;
    this.emit('zoomband:change', snapshot);
    this.emit('fractal:level-change', {
      from: this.bands.indexOf(from),
      to: this.bands.indexOf(snapshot.band),
      label: snapshot.label,
      timestamp: snapshot.timestamp,
    });
  }
}
