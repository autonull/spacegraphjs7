/**
 * Cursor manager for InteractionPlugin
 * Centralizes cursor state with priority-based management
 */
export type CursorMode = 'auto' | 'grab' | 'grabbing' | 'crosshair' | 'nwse-resize' | 'pointer';

const CURSOR_PRIORITY: Record<CursorMode, number> = {
    auto: 0,
    grab: 1,
    pointer: 1,
    crosshair: 2,
    'nwse-resize': 3,
    grabbing: 4,
} as const;

export class CursorManager {
    private cursorStack: Map<string, CursorMode> = new Map();
    private container: HTMLElement | null = null;

    setContainer(container: HTMLElement | null): void {
        this.container = container;
    }

    set(mode: CursorMode, reason: string): void {
        this.cursorStack.set(reason, mode);
        this.update();
    }

    clear(reason: string): void {
        this.cursorStack.delete(reason);
        this.update();
    }

    private update(): void {
        if (!this.container) return;

        let highestPriority = -1;
        let activeCursor: CursorMode = 'auto';

        for (const mode of this.cursorStack.values()) {
            const priority = CURSOR_PRIORITY[mode];
            if (priority > highestPriority) {
                highestPriority = priority;
                activeCursor = mode;
            }
        }

        this.container.style.cursor = activeCursor;
    }
}
