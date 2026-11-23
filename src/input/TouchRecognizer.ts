export type TouchGesture =
    'doubleTap' | 'longPress' | 'swipeUp' | 'swipeDown' | 'swipeLeft' | 'swipeRight';

export interface TouchPoint {
    readonly x: number;
    readonly y: number;
    readonly at: number;
}

export interface TouchOptions {
    readonly moveThreshold: number;
    readonly doubleTapMs: number;
    readonly doubleTapRadius: number;
    readonly holdMs: number;
}

const DEFAULT_OPTIONS: TouchOptions = {
    moveThreshold: 40,
    doubleTapMs: 350,
    doubleTapRadius: 30,
    holdMs: 550,
};

/** Recognizes one gesture per press. No DOM, clocks or side effects; tests drive it directly. */
export class TouchRecognizer {
    readonly options: TouchOptions;
    #down: TouchPoint | undefined;
    #lastTap: TouchPoint | undefined;
    #moved = false;

    constructor(options: Partial<TouchOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    down(point: TouchPoint): void {
        this.#down = point;
        this.#moved = false;
    }

    move(point: TouchPoint): void {
        if (!this.#down) return;
        const { x, y } = this.#down;
        if (Math.hypot(point.x - x, point.y - y) > this.options.moveThreshold) this.#moved = true;
    }

    cancel(): void {
        this.#down = undefined;
        this.#moved = false;
        this.#lastTap = undefined;
    }

    up(point: TouchPoint): TouchGesture | undefined {
        const down = this.#down;
        this.#down = undefined;
        if (!down) return undefined;
        const moved = this.#moved;
        this.#moved = false;

        if (moved) {
            this.#lastTap = undefined;
            const dx = point.x - down.x;
            const dy = point.y - down.y;
            return Math.abs(dx) > Math.abs(dy)
                ? dx > 0
                    ? 'swipeRight'
                    : 'swipeLeft'
                : dy > 0
                  ? 'swipeDown'
                  : 'swipeUp';
        }
        if (point.at - down.at >= this.options.holdMs) {
            this.#lastTap = undefined;
            return 'longPress';
        }
        const previous = this.#lastTap;
        this.#lastTap = point;
        if (
            previous &&
            point.at - previous.at <= this.options.doubleTapMs &&
            Math.hypot(point.x - previous.x, point.y - previous.y) <= this.options.doubleTapRadius
        ) {
            this.#lastTap = undefined;
            return 'doubleTap';
        }
        return undefined;
    }
}
