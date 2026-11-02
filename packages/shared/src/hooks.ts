/**
 * Common React/Solid hooks for SpaceGraphJS components.
 */

import { createSignal, createEffect, onCleanup, onMount } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Hook for detecting clicks outside an element.
 * @param element - Ref to the element
 * @param onClickOutside - Callback when click occurs outside
 * @param enabled - Whether the detection is active
 */
export function useClickOutside(
    element: () => HTMLElement | undefined,
    onClickOutside: () => void,
    enabled: Accessor<boolean> = () => true,
): void {
    createEffect(() => {
        if (!enabled()) return;

        const handleClick = (event: MouseEvent) => {
            const el = element();
            if (el && !el.contains(event.target as Node)) {
                onClickOutside();
            }
        };

        document.addEventListener('mousedown', handleClick);
        onCleanup(() => document.removeEventListener('mousedown', handleClick));
    });
}

/**
 * Hook for observing element resize.
 * @param element - Ref to the element
 * @param onResize - Callback with new dimensions
 */
export function useResizeObserver(
    element: () => HTMLElement | undefined,
    onResize: (width: number, height: number) => void,
): void {
    createEffect(() => {
        const el = element();
        if (!el) return;

        let observer: ResizeObserver | null = null;
        let lastWidth = el.clientWidth;
        let lastHeight = el.clientHeight;

        observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width !== lastWidth || height !== lastHeight) {
                    lastWidth = width;
                    lastHeight = height;
                    onResize(width, height);
                }
            }
        });

        observer.observe(el);
        onCleanup(() => observer?.disconnect());
    });
}

/**
 * Hook for observing element intersection (visibility).
 * @param element - Ref to the element
 * @param onIntersect - Callback with intersection ratio
 * @param options - IntersectionObserver options
 */
export function useIntersectionObserver(
    element: () => HTMLElement | undefined,
    onIntersect: (ratio: number) => void,
    options: IntersectionObserverInit = {},
): void {
    createEffect(() => {
        const el = element();
        if (!el) return;

        let observer: IntersectionObserver | null = null;

        observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    onIntersect(entry.intersectionRatio);
                }
            },
            { threshold: [0, 0.25, 0.5, 0.75, 1], ...options },
        );

        observer.observe(el);
        onCleanup(() => observer?.disconnect());
    });
}

/**
 * Hook for matching media queries.
 * @param query - Media query string
 * @returns Whether the query matches
 */
export function useMediaQuery(query: string): Accessor<boolean> {
    const [matches, setMatches] = createSignal(false);

    onMount(() => {
        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        mediaQuery.addEventListener('change', handler);
        onCleanup(() => mediaQuery.removeEventListener('change', handler));
    });

    return matches;
}

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

    const value = isControlled ? controlledValue : uncontrolledValue();
    const setValue = (next: T) => {
        const newValue =
            typeof next === 'function'
                ? (next as (prev: T) => T)(isControlled ? controlledValue : uncontrolledValue())
                : next;
        if (!isControlled) {
            setUncontrolledValue(newValue as Exclude<T, Function>);
        }
        onChange?.(newValue);
    };

    return [() => value, setValue];
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
        const newValue = typeof next === 'function' ? (next as (prev: T) => T)(value()) : next;
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

/**
 * Hook for measuring element dimensions.
 * @param element - Ref to the element
 * @returns { width, height }
 */
export function useElementSize(
    element: () => HTMLElement | undefined,
): Accessor<{ width: number; height: number }> {
    const [size, setSize] = createSignal({ width: 0, height: 0 });

    useResizeObserver(element, (width, height) => {
        setSize({ width, height });
    });

    return size;
}

/**
 * Creates a signal that syncs with a prop when it changes.
 * Useful for lifting state up while maintaining local control.
 * @param prop - Prop accessor
 * @param onChange - Callback when local value changes
 * @returns [value, setValue]
 */
export function useSyncedState<T>(
    prop: Accessor<T | undefined>,
    onChange: (value: T) => void,
): [Accessor<T>, (value: T) => void] {
    const [localValue, setLocalValue] = createSignal<T>(prop() as T);
    let synced = true;

    createEffect(() => {
        const newProp = prop();
        if (newProp !== undefined && !synced) {
            setLocalValue(newProp as Exclude<T, Function>);
        }
        synced = true;
    });

    const setValue = (next: T) => {
        synced = false;
        const newValue = typeof next === 'function' ? (next as (prev: T) => T)(localValue()) : next;
        setLocalValue(newValue as Exclude<T, Function>);
        onChange(newValue);
    };

    return [localValue, setValue];
}
