// Touch bindings are preset data over the same verb methods the keyboard and mouse use. The
// recognizer is promoted to spacegraphjs/input; this module maps gestures to Pi navigation verbs.
import { TouchRecognizer, type TouchGesture, type TouchPoint } from 'spacegraphjs/input';

export { TouchRecognizer };
export type { TouchGesture, TouchPoint };

export type TouchVerb = 'descend' | 'ascend' | 'survey' | 'return' | 'trace' | 'follow';
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
