// Touch bindings are preset data over the same verb methods the keyboard and mouse use. The
// recognizer is pure and deterministic; the DOM binding only translates pointer events into verbs.

export type TouchVerb = 'descend' | 'ascend' | 'survey' | 'return' | 'trace' | 'follow';
export type TouchGesture =
    'doubleTap' | 'longPress' | 'swipeUp' | 'swipeDown' | 'swipeLeft' | 'swipeRight';
export type TouchPreset = 'default' | 'minimal' | 'off';
export type TouchBindings = Readonly<Partial<Record<TouchGesture, TouchVerb>>>;

export const TOUCH_PRESETS: Readonly<Record<TouchPreset, TouchBindings>> = {
    default: {
        doubleTap: 'descend',
        longPress: 'survey',
        swipeUp: 'trace',
        swipeDown: 'ascend',
        swipeLeft: 'return',
        swipeRight: 'follow',
    },
    minimal: { doubleTap: 'descend', swipeDown: 'ascend', swipeLeft: 'return' },
    off: {},
};

export const touchBindingsFor = (preset: string): TouchBindings =>
    TOUCH_PRESETS[preset as TouchPreset] ?? TOUCH_PRESETS.default;

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

/** Translates touch pointer events into host verbs. Mouse pointers stay with the existing map. */
export const bindTouchVerbs = (
    target: HTMLElement,
    bindingsFor: () => TouchBindings,
    dispatch: (verb: TouchVerb) => void,
): (() => void) => {
    const recognizer = new TouchRecognizer();
    const point = (event: PointerEvent): TouchPoint => ({
        x: event.clientX,
        y: event.clientY,
        at: event.timeStamp,
    });
    const touch = (event: PointerEvent): boolean => event.pointerType !== 'mouse';
    const onDown = (event: PointerEvent): void => {
        if (touch(event)) recognizer.down(point(event));
    };
    const onMove = (event: PointerEvent): void => {
        if (touch(event)) recognizer.move(point(event));
    };
    const onUp = (event: PointerEvent): void => {
        if (!touch(event)) return;
        const gesture = recognizer.up(point(event));
        const verb = gesture ? bindingsFor()[gesture] : undefined;
        if (verb) dispatch(verb);
    };
    const onCancel = (): void => recognizer.cancel();
    target.addEventListener('pointerdown', onDown);
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
    return () => {
        target.removeEventListener('pointerdown', onDown);
        target.removeEventListener('pointermove', onMove);
        target.removeEventListener('pointerup', onUp);
        target.removeEventListener('pointercancel', onCancel);
    };
};
