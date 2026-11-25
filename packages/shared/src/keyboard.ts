/**
 * Keyboard utilities for SpaceGraphJS components.
 * Matches keyboard events to shortcut definitions.
 */

import { createEffect, onCleanup } from 'solid-js';

/** Keyboard shortcut definition. */
export interface KeyboardShortcut {
    /** Key or key combination (e.g., "Escape", "ArrowDown", "Mod+S"). */
    key: string;
    /** Callback when shortcut is triggered. */
    onTrigger: (event: KeyboardEvent) => void;
    /** Whether to prevent default browser behavior. */
    preventDefault?: boolean;
    /** Whether to stop propagation. */
    stopPropagation?: boolean;
    /** Target element or accessor for a ref (defaults to window). */
    target?: HTMLElement | Window | (() => HTMLElement | Window | undefined);
}

/**
 * Hook for registering keyboard shortcuts.
 * @param shortcuts - Array of shortcut definitions
 */
export function useKeyboardShortcuts(shortcuts: readonly KeyboardShortcut[]): void {
    createEffect(() => {
        const handlers = shortcuts.map((shortcut) => {
            const specified = shortcut.target;
            const target =
                (typeof specified === 'function' ? specified() : specified) ?? window;
            const handler = (event: Event) => {
                const ke = event as KeyboardEvent;
                if (matchShortcut(ke, shortcut.key)) {
                    if (shortcut.preventDefault !== false) ke.preventDefault();
                    if (shortcut.stopPropagation) ke.stopPropagation();
                    shortcut.onTrigger(ke);
                }
            };
            target.addEventListener('keydown', handler);
            return { target, handler };
        });

        onCleanup(() => {
            for (const { target, handler } of handlers) {
                target.removeEventListener('keydown', handler);
            }
        });
    });
}

/** Matches a keyboard event against a shortcut key string. */
export function matchShortcut(event: KeyboardEvent, key: string): boolean {
    const parts = key.toLowerCase().split('+');
    const requiredKey = parts.pop()!;
    const modifiers = parts;

    if (event.key.toLowerCase() !== requiredKey) return false;

    for (const mod of modifiers) {
        switch (mod) {
            case 'mod':
            case 'meta':
                if (!event.metaKey && !event.ctrlKey) return false;
                break;
            case 'ctrl':
                if (!event.ctrlKey) return false;
                break;
            case 'shift':
                if (!event.shiftKey) return false;
                break;
            case 'alt':
                if (!event.altKey) return false;
                break;
            default:
                return false;
        }
    }

    return true;
}
