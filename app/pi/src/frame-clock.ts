import { lerp } from 'spacegraphjs/utils';

/** Owns the continuous-render clock and its frame measurements. RAF scheduling stays with the host. */
export class FrameClock {
    #running = false;
    #last = 0;
    #ticks = 0;
    #fps = 0;

    get running(): boolean {
        return this.#running;
    }

    get ticks(): number {
        return this.#ticks;
    }

    get fps(): number {
        return this.#fps;
    }

    start(now: number): void {
        if (this.#running) return;
        this.#running = true;
        this.#last = now;
    }

    stop(): void {
        this.#running = false;
    }

    frame(now: number): number {
        const seconds = Math.min(0.05, Math.max(0, (now - this.#last) / 1000));
        this.#last = now;
        return seconds;
    }

    tick(): void {
        this.#ticks++;
    }

    sample(seconds: number): void {
        this.#fps = lerp(this.#fps, seconds > 0 ? 1 / seconds : 0, 0.15);
    }
}
