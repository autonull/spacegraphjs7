// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { TOUCH_PRESETS, TouchRecognizer, bindTouchVerbs, touchBindingsFor } from '../src/touch';

describe('touch bindings', () => {
    it('maps gestures to verbs as preset data', () => {
        expect(Object.values(TOUCH_PRESETS.default)).toHaveLength(6);
        expect(TOUCH_PRESETS.minimal).toEqual({
            doubleTap: 'descend',
            swipeDown: 'ascend',
            swipeLeft: 'return',
        });
        expect(touchBindingsFor('off')).toEqual({});
        expect(touchBindingsFor('unknown')).toBe(TOUCH_PRESETS.default);
    });

    it('recognizes a double tap after two close taps', () => {
        const recognizer = new TouchRecognizer();
        recognizer.down({ x: 0, y: 0, at: 90 });
        expect(recognizer.up({ x: 0, y: 0, at: 100 })).toBeUndefined();
        recognizer.down({ x: 4, y: 3, at: 240 });
        expect(recognizer.up({ x: 4, y: 3, at: 250 })).toBe('doubleTap');
        recognizer.down({ x: 4, y: 3, at: 390 });
        expect(recognizer.up({ x: 4, y: 3, at: 400 })).toBeUndefined();
        recognizer.down({ x: 4, y: 3, at: 890 });
        expect(recognizer.up({ x: 4, y: 3, at: 900 })).toBeUndefined();
    });

    it('recognizes a long press and each swipe direction', () => {
        const recognizer = new TouchRecognizer();
        recognizer.down({ x: 0, y: 0, at: 0 });
        expect(recognizer.up({ x: 1, y: 1, at: 600 })).toBe('longPress');

        for (const [x, y, gesture] of [
            [80, 0, 'swipeRight'],
            [-80, 0, 'swipeLeft'],
            [0, 80, 'swipeDown'],
            [0, -80, 'swipeUp'],
        ] as const) {
            recognizer.down({ x: 0, y: 0, at: 1000 });
            recognizer.move({ x, y, at: 1100 });
            expect(recognizer.up({ x, y, at: 1200 })).toBe(gesture);
        }
    });

    it('cancels an in-flight gesture', () => {
        const recognizer = new TouchRecognizer();
        recognizer.down({ x: 0, y: 0, at: 0 });
        recognizer.move({ x: 80, y: 0, at: 10 });
        recognizer.cancel();
        expect(recognizer.up({ x: 80, y: 0, at: 20 })).toBeUndefined();
    });

    it('translates touch pointers into verbs and ignores mouse pointers', () => {
        const handlers = new Map<string, (event: unknown) => void>();
        const target = {
            addEventListener: (type: string, handler: (event: unknown) => void) =>
                handlers.set(type, handler),
            removeEventListener: (type: string) => handlers.delete(type),
        };
        const verbs: string[] = [];
        const dispose = bindTouchVerbs(
            target as unknown as HTMLElement,
            () => TOUCH_PRESETS.default,
            (verb) => verbs.push(verb),
        );
        const emit = (type: string, pointerType: string, x: number, y: number, at: number) =>
            handlers.get(type)?.({ pointerType, clientX: x, clientY: y, timeStamp: at });

        emit('pointerdown', 'touch', 0, 0, 100);
        emit('pointerdown', 'mouse', 0, 0, 100);
        emit('pointermove', 'touch', 0, 80, 150);
        emit('pointerup', 'touch', 0, 80, 200);
        expect(verbs).toEqual(['ascend']);
        expect(handlers.size).toBe(4);
        dispose();
        expect(handlers.size).toBe(0);
    });
});
