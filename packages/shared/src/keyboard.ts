/**
 * Keyboard utilities for SpaceGraphJS components.
 * Provides hooks for keyboard shortcuts, arrow navigation, and focus trapping.
 */

import { createSignal, createEffect, onCleanup } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';

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
    /** Target element (defaults to window). */
    target?: HTMLElement | Window;
}

/**
 * Hook for registering keyboard shortcuts.
 * @param shortcuts - Array of shortcut definitions
 */
export function useKeyboardShortcuts(shortcuts: readonly KeyboardShortcut[]): void {
    createEffect(() => {
        const handlers = shortcuts.map((shortcut) => {
            const target = shortcut.target ?? window;
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

/**
 * Hook for arrow key navigation in a list.
 * @param itemCount - Number of items in the list
 * @param onSelect - Callback when Enter is pressed on an item
 * @returns Object with active index and setter
 */
export function useArrowNavigation(
    itemCount: Accessor<number>,
    onSelect?: (index: number) => void,
): { activeIndex: Accessor<number>; setActiveIndex: Setter<number> } {
    const [activeIndex, setActiveIndex] = createSignal(0);

    useKeyboardShortcuts([
        {
            key: 'ArrowDown',
            onTrigger: () => {
                setActiveIndex((prev) => Math.min(itemCount() - 1, prev + 1));
            },
        },
        {
            key: 'ArrowUp',
            onTrigger: () => {
                setActiveIndex((prev) => Math.max(0, prev - 1));
            },
        },
        {
            key: 'Home',
            onTrigger: () => {
                setActiveIndex(0);
            },
        },
        {
            key: 'End',
            onTrigger: () => {
                setActiveIndex(itemCount() - 1);
            },
        },
        {
            key: 'Enter',
            onTrigger: () => {
                onSelect?.(activeIndex());
            },
        },
        {
            key: 'Escape',
            onTrigger: () => {
                setActiveIndex(0);
            },
        },
    ]);

    return { activeIndex, setActiveIndex };
}

/**
 * Hook for focus trapping within an element.
 * @param container - Ref to the container element
 * @param enabled - Whether the trap is active
 */
export function useFocusTrap(
    container: () => HTMLElement | undefined,
    enabled: Accessor<boolean> = () => true,
): void {
    createEffect(() => {
        if (!enabled()) return;

        const el = container();
        if (!el) return;

        const focusableElements = el.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTab = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            if (event.shiftKey) {
                if (document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        el.addEventListener('keydown', handleTab);
        firstElement?.focus();

        onCleanup(() => {
            el.removeEventListener('keydown', handleTab);
        });
    });
}

/**
 * Creates a keyboard event handler for common graph shortcuts.
 * @param handlers - Object with optional handler functions
 * @returns Combined keyboard event handler
 */
export function createGraphKeyboardHandler(handlers: {
    onEscape?: () => void;
    onSearch?: () => void;
    onFit?: () => void;
    onLevelOverview?: () => void;
    onLevelExecution?: () => void;
    onLevelDetail?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    onNote?: () => void;
    onTraceWhy?: () => void;
    onTraceLedHere?: () => void;
    onTraceRelated?: () => void;
    onStepPrev?: () => void;
    onStepNext?: () => void;
    onTurnMap?: () => void;
    onHybrid?: () => void;
    onGraph?: () => void;
}): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in an input
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            return;
        }

        switch (event.key) {
            case 'Escape':
                handlers.onEscape?.();
                break;
            case '/':
                if (event.metaKey || event.ctrlKey) {
                    event.preventDefault();
                    handlers.onSearch?.();
                }
                break;
            case 'f':
                if (!(event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    handlers.onFit?.();
                }
                break;
            case '1':
                handlers.onLevelOverview?.();
                break;
            case '2':
                handlers.onLevelExecution?.();
                break;
            case '3':
                handlers.onLevelDetail?.();
                break;
            case 'z':
                if (event.metaKey || event.ctrlKey) {
                    if (event.shiftKey) {
                        handlers.onRedo?.();
                    } else {
                        handlers.onUndo?.();
                    }
                }
                break;
            case 'n':
                handlers.onNote?.();
                break;
            case 'w':
                handlers.onTraceWhy?.();
                break;
            case 'e':
                handlers.onTraceLedHere?.();
                break;
            case 'r':
                handlers.onTraceRelated?.();
                break;
            case '[':
                handlers.onStepPrev?.();
                break;
            case ']':
                handlers.onStepNext?.();
                break;
            case 't':
                if (event.metaKey && event.altKey) {
                    handlers.onTurnMap?.();
                }
                break;
            case 'h':
                if (event.metaKey && event.shiftKey) {
                    handlers.onHybrid?.();
                }
                break;
            case 'g':
                if (event.metaKey) {
                    handlers.onGraph?.();
                }
                break;
        }
    };
}
