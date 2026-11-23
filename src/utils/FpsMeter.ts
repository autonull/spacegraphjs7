export interface FpsSample {
    readonly fps: number;
    readonly elapsed: number;
    readonly frames: number;
}

/** Measures frame rate over a fixed interval. The first tick starts the clock without a sample. */
export class FpsMeter {
    #last: number | undefined;
    #frames = 0;

    constructor(private readonly intervalMs: number) {}

    tick(timestamp: number): FpsSample | undefined {
        if (this.#last === undefined) {
            this.#last = timestamp;
            return undefined;
        }
        this.#frames++;
        const elapsed = timestamp - this.#last;
        if (elapsed < this.intervalMs) return undefined;

        const sample = { fps: (this.#frames * 1000) / elapsed, elapsed, frames: this.#frames };
        this.#last = timestamp;
        this.#frames = 0;
        return sample;
    }
}
