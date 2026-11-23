import type { GraphSpec } from '../types';
import { isEditableTarget } from '../utils/DOMUtils';
import { BaseSystemPlugin } from './BaseSystemPlugin';

export interface HistoryPluginOptions {
    maxHistorySize?: number;
    enabled?: boolean;
}

export class HistoryPlugin extends BaseSystemPlugin {
    readonly id = 'history';
    readonly name = 'History Stack';

    private pastStack: GraphSpec[] = [];
    private futureStack: GraphSpec[] = [];
    readonly maxHistorySize: number;
    private isRestoring = false;
    readonly isEnabled: boolean;

    private snapshotDebounce = 500;
    private debounceTimer: any = null;

    constructor(options: HistoryPluginOptions = {}) {
        super();
        this.maxHistorySize = options.maxHistorySize || 50;
        this.isEnabled = options.enabled !== false;
    }

    protected onInit(): void {
        if (this.isEnabled) {
            this.pushSnapshot();
        }

        this.on('interaction:dragend', () => this.debouncedSnapshot());
        this.on('interaction:edgecreate', () => this.debouncedSnapshot());
        this.on('node:added', () => this.debouncedSnapshot());
        this.on('node:removed', () => this.debouncedSnapshot());
        this.on('edge:added', () => this.debouncedSnapshot());
        this.on('edge:removed', () => this.debouncedSnapshot());

        this.on('input:interaction:keydown', (e: unknown) =>
            this.handleKeydown(
                e as {
                    key: string;
                    ctrlKey: boolean;
                    metaKey: boolean;
                    shiftKey: boolean;
                    originalEvent?: { target?: { tagName?: string }; preventDefault?: () => void };
                },
            ),
        );
    }

    public pushSnapshot() {
        if (!this.isEnabled || this.isRestoring) return;

        const spec = this.sg.export();

        this.pastStack.push(spec);
        if (this.pastStack.length > this.maxHistorySize) {
            this.pastStack.shift();
        }

        this.futureStack = [];
    }

    public undo() {
        if (!this.isEnabled || this.pastStack.length <= 1) return;

        this.isRestoring = true;

        const currentState = this.pastStack.pop()!;
        this.futureStack.push(currentState);

        const previousState = this.pastStack[this.pastStack.length - 1];

        this.sg.graph.clear();
        this.sg.loadSpec(previousState);

        this.sg.events.emit('history:undo', { state: previousState });

        this.isRestoring = false;
    }

    public redo() {
        if (!this.isEnabled || this.futureStack.length === 0) return;

        this.isRestoring = true;

        const nextState = this.futureStack.pop()!;
        this.pastStack.push(nextState);

        this.sg.graph.clear();
        this.sg.loadSpec(nextState);

        this.sg.events.emit('history:redo', { state: nextState });

        this.isRestoring = false;
    }

    public clear() {
        this.pastStack = [];
        this.futureStack = [];
        this.pushSnapshot();
    }

    dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.pastStack = [];
        this.futureStack = [];
        super.dispose();
    }

    private handleKeydown(e: any): void {
        if (!this.isEnabled) return;

        if (isEditableTarget(e.originalEvent?.target)) return;

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.originalEvent?.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (e.key === 'y') {
                e.originalEvent?.preventDefault();
                this.redo();
            }
        }
    }

    private debouncedSnapshot() {
        if (!this.isEnabled || this.isRestoring) return;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.pushSnapshot();
        }, this.snapshotDebounce);
    }
}
