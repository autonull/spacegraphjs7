/**
 * Common Solid hooks for SpaceGraphJS components.
 */

import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';

const resolveUpdater = <T>(next: T, current: T): T =>
    typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
/**
 * Hook for managing a boolean toggle state.
 * @param initial - Initial value
 * @returns [value, toggle, setTrue, setFalse]
 */
export function useToggle(
    initial = false,
): [Accessor<boolean>, () => void, () => void, () => void] {
    const [value, setValue] = createSignal(initial);
    const toggle = () => setValue((prev: boolean) => !prev);
    const setTrue = () => setValue(true);
    const setFalse = () => setValue(false);
    return [value, toggle, setTrue, setFalse];
}

/**
 * Hook for managing a value with a controlled/uncontrolled pattern.
 * @param controlledValue - Controlled value (optional)
 * @param onChange - Change callback (for controlled)
 * @param defaultValue - Default value (for uncontrolled)
 * @returns [value, setValue]
 */
export function useControlledValue<T>(
    controlledValue: T | undefined,
    onChange: ((value: T) => void) | undefined,
    defaultValue: T,
): [Accessor<T>, (value: T) => void] {
    const [uncontrolledValue, setUncontrolledValue] = createSignal(defaultValue);
    const isControlled = controlledValue !== undefined;

    const value = (): T => (isControlled ? (controlledValue as T) : uncontrolledValue());
    const setValue = (next: T) => {
        const newValue = resolveUpdater(
            next,
            isControlled ? (controlledValue as T) : uncontrolledValue(),
        );
        if (!isControlled) setUncontrolledValue(newValue as Exclude<T, Function>);
        onChange?.(newValue);
    };

    return [value, setValue];
}

/**
 * Hook for debouncing a value.
 * @param value - Source value
 * @param delay - Debounce delay in ms
 * @returns Debounced value
 */
export function useDebounce<T>(value: Accessor<T>, delay: number): Accessor<T> {
    const [debounced, setDebounced] = createSignal(value());

    createEffect(() => {
        const current = value();
        const timer = setTimeout(() => setDebounced(current as Exclude<T, Function>), delay);
        onCleanup(() => clearTimeout(timer));
    });

    return debounced;
}

/**
 * Hook for throttling a callback.
 * @param callback - Function to throttle
 * @param delay - Throttle delay in ms
 * @returns Throttled function
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
    callback: T,
    delay: number,
): T {
    let lastCall = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: unknown[] | null = null;

    const throttled = ((...args: unknown[]) => {
        const now = Date.now();
        lastArgs = args;

        if (now - lastCall >= delay) {
            lastCall = now;
            callback(...args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(
                () => {
                    lastCall = Date.now();
                    timeoutId = null;
                    if (lastArgs) callback(...lastArgs);
                },
                delay - (now - lastCall),
            );
        }
    }) as T;

    onCleanup(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });

    return throttled;
}

/**
 * Hook for reading a value from localStorage with SSR safety.
 * @param key - Storage key
 * @param defaultValue - Default value
 * @returns [value, setValue]
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T,
): [Accessor<T>, (value: T) => void] {
    const initializer = (): T => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    };
    const [value, setValue] = createSignal(initializer as unknown as T);

    const setStoredValue = (next: T) => {
        const newValue = resolveUpdater(next, value());
        setValue(newValue as Exclude<T, Function>);
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(key, JSON.stringify(newValue));
            } catch {
                // Ignore storage errors
            }
        }
    };

    return [value, setStoredValue];
}
