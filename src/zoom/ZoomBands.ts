// Headless zoom-band controller. Maps a normalized camera zoom to a named band and reports changes.
// It owns no rendering and no semantic policy: the host supplies contiguous bands and reacts to
// changes. The controller stays policy-free so any graph app can reuse it.

import { clamp, normalizeZoom, type ZoomRange } from '../core/zoom';

export interface ZoomBand {
  id: string;
  /** Lower bound of the band in normalized (0..1) zoom, inclusive. */
  min: number;
  /** Upper bound, exclusive except for the last band, which is inclusive of 1. */
  max: number;
  label?: string;
}

export interface ZoomBandsConfig {
  /** Contiguous bands covering [0, 1], ordered or sortable by `min`. */
  bands: readonly ZoomBand[];
  /** Normalized dead-zone around a boundary before switching bands; dampens wheel bursts. */
  hysteresis?: number;
}

export interface ZoomBandSnapshot {
  zoom: number;
  normalized: number;
  band: string;
  label?: string;
  timestamp: number;
}

export interface ZoomBandChange extends ZoomBandSnapshot {
  from: string;
  previous: ZoomBandSnapshot;
}

export type ZoomBandListener = (change: ZoomBandChange) => void;

export class ZoomBands {
  readonly #bands: ZoomBand[];
  readonly #hysteresis: number;
  readonly #listeners = new Set<ZoomBandListener>();
  #band: string;
  #normalized = 0;
  #zoom = 0;
  #timestamp = 0;

  constructor(config: ZoomBandsConfig) {
    const bands = [...config.bands].sort((a, b) => a.min - b.min);
    if (!bands.length) throw new Error('ZoomBands requires at least one band');
    if (bands[0].min !== 0 || bands[bands.length - 1].max !== 1) {
      throw new Error('ZoomBands: bands must cover the full [0, 1] range');
    }
    bands.forEach((band, i) => {
      if (band.min >= band.max) {
        throw new Error(`ZoomBands: invalid range for band "${band.id}" [${band.min}, ${band.max}]`);
      }
      const previous = bands[i - 1];
      if (previous && previous.max !== band.min) {
        throw new Error(`ZoomBands: gap or overlap before band "${band.id}"`);
      }
    });
    this.#bands = bands;
    this.#hysteresis = config.hysteresis ?? 0;
    this.#band = this.#resolve(0);
  }

  get bands(): readonly ZoomBand[] {
    return this.#bands;
  }

  get band(): string {
    return this.#band;
  }

  get normalized(): number {
    return this.#normalized;
  }

  indexOf(band: string): number {
    return this.#bands.findIndex((b) => b.id === band);
  }

  snapshot(): ZoomBandSnapshot {
    return {
      zoom: this.#zoom,
      normalized: this.#normalized,
      band: this.#band,
      label: this.#bands.find((b) => b.id === this.#band)?.label,
      timestamp: this.#timestamp,
    };
  }

  // Feed a raw camera zoom and the range that produced it.
  feed(raw: number, range: ZoomRange): ZoomBandSnapshot {
    return this.feedNormalized(normalizeZoom(raw, range), raw);
  }

  // Feed an already-normalized zoom; `raw` is only carried into the snapshot.
  feedNormalized(normalized: number, raw = normalized): ZoomBandSnapshot {
    const value = clamp(normalized, 0, 1);
    const candidate = this.#resolve(value);
    const next = candidate === this.#band ? candidate : this.#applyHysteresis(value, candidate);
    const previous = this.snapshot();
    this.#normalized = value;
    this.#zoom = raw;
    this.#timestamp = Date.now();
    this.#band = next;
    const snapshot = this.snapshot();
    if (next !== previous.band) {
      const change: ZoomBandChange = { ...snapshot, from: previous.band, previous };
      for (const listener of this.#listeners) listener(change);
    }
    return snapshot;
  }

  onChange(listener: ZoomBandListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #resolve(value: number): string {
    const band = this.#bands.find((b) => value >= b.min && value < b.max);
    return (band ?? this.#bands[this.#bands.length - 1]).id;
  }

  #applyHysteresis(value: number, candidate: string): string {
    const current = this.#bands.find((b) => b.id === this.#band);
    if (!this.#hysteresis || !current) return candidate;
    const rising = value >= current.max;
    if (rising && value < current.max + this.#hysteresis) return this.#band;
    if (!rising && value > current.min - this.#hysteresis) return this.#band;
    return candidate;
  }
}
