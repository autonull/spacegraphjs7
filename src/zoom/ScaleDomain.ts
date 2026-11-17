// One continuous scale domain. ZoomBands still owns band resolution and hysteresis; this layer
// adds continuous position, interpolated semantic importance and anchored zoom on top of it.
// The semantics replace the deprecated FractalZoomPlugin without touching camera or renderer.

import { clamp, denormalizeZoom, normalizeZoom, type ZoomRange } from '../core/zoom';
import { ZoomBands, type ZoomBand, type ZoomBandChange, type ZoomBandListener } from './ZoomBands';

export interface ScaleStop {
    /** Normalized position in [0, 1] where this stop begins. */
    at: number;
    id: string;
    label?: string;
    /** Semantic importance 0..1, interpolated between stops. */
    importance?: number;
    /** Seconds to cross into the next stop. */
    transitionDuration?: number;
}

export interface ScaleDomainConfig {
    /** Host-defined stops covering [0, 1], ordered by `at`. */
    stops: readonly ScaleStop[];
    range: ZoomRange;
    hysteresis?: number;
}

export interface ScaleSample {
    normalized: number;
    raw: number;
    stop: string;
    label?: string;
    /** Continuous position along the stop ladder, in [0, stops.length - 1]. */
    position: number;
    /** Interpolated semantic importance in [0, 1]. */
    importance: number;
    /** Transition duration for entering the current stop, in seconds. */
    transitionDuration: number;
}

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface ScaleAnchor {
    /** World point held under the same screen position. */
    world: Vec3;
    /** Current camera target. */
    target: Vec3;
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export class ScaleDomain {
    readonly stops: readonly ScaleStop[];
    readonly range: ZoomRange;
    readonly #bands: ZoomBands;

    constructor(config: ScaleDomainConfig) {
        const stops = [...config.stops].sort((a, b) => a.at - b.at);
        if (stops.length < 2) throw new Error('ScaleDomain requires at least two stops');
        if (stops[0]?.at !== 0 || stops[stops.length - 1]?.at !== 1) {
            throw new Error('ScaleDomain: stops must cover the full [0, 1] range');
        }
        stops.forEach((stop, index) => {
            const next = stops[index + 1];
            if (next && stop.at >= next.at) {
                throw new Error(`ScaleDomain: invalid position for stop "${stop.id}"`);
            }
        });
        this.stops = stops;
        this.range = config.range;
        this.#bands = new ZoomBands({
            bands: stops.slice(0, -1).map((stop, index): ZoomBand => ({
                id: stop.id,
                min: stop.at,
                max: stops[index + 1]!.at,
                label: stop.label,
            })),
            hysteresis: config.hysteresis,
        });
    }

    get band(): string {
        return this.#bands.band;
    }

    get bands(): readonly ZoomBand[] {
        return this.#bands.bands;
    }

    onChange(listener: ZoomBandListener): () => void {
        return this.#bands.onChange(listener);
    }

    /** Continuous sample at a normalized zoom. Pure: no clock, no camera, no renderer. */
    sample(
        normalized: number,
        raw = denormalizeZoom(clamp(normalized, 0, 1), this.range),
        band?: string,
    ): ScaleSample {
        const value = clamp(normalized, 0, 1);
        const computedIndex = this.stops.findIndex((stop, i) => i > 0 && value < stop.at);
        const index = band
            ? Math.max(0, this.stops.findIndex((stop) => stop.id === band))
            : computedIndex === -1
              ? this.stops.length - 1
              : computedIndex - 1;
        const from = this.stops[index]!;
        const to = this.stops[Math.min(index + 1, this.stops.length - 1)]!;
        const span = to.at - from.at;
        const progress = span > 0 && index < this.stops.length - 1 ? clamp((value - from.at) / span, 0, 1) : 0;
        const fromImportance = from.importance ?? 0;
        const toImportance = index < this.stops.length - 1 ? (to.importance ?? fromImportance) : fromImportance;
        return {
            normalized: value,
            raw,
            stop: from.id,
            label: from.label,
            position: index + progress,
            importance: clamp(lerp(fromImportance, toImportance, progress), 0, 1),
            transitionDuration: from.transitionDuration ?? 0,
        };
    }

    feedNormalized(normalized: number, raw = normalized): ScaleSample {
        const snapshot = this.#bands.feedNormalized(normalized, raw);
        return this.sample(snapshot.normalized, snapshot.zoom, snapshot.band);
    }

    feed(raw: number): ScaleSample {
        const snapshot = this.#bands.feed(raw, this.range);
        return this.sample(snapshot.normalized, snapshot.zoom, snapshot.band);
    }

    /** Camera target that keeps `anchor.world` at the same screen position after the zoom. */
    anchoredTarget(from: ScaleSample, to: ScaleSample, anchor: ScaleAnchor): Vec3 {
        const factor = this.range.closerIsLarger ? from.raw / to.raw : to.raw / from.raw;
        const { world, target } = anchor;
        return {
            x: world.x - (world.x - target.x) * factor,
            y: world.y - (world.y - target.y) * factor,
            z: world.z - (world.z - target.z) * factor,
        };
    }

    /** Round-trip a zoom to a normalized value and back to its raw camera zoom. */
    rawAt(normalized: number): number {
        return denormalizeZoom(clamp(normalized, 0, 1), this.range);
    }

    normalizedAt(raw: number): number {
        return normalizeZoom(raw, this.range);
    }
}

export type { ZoomBandChange };
