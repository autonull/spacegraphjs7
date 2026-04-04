import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import type { GraphSpec } from '../types';

export interface HistoryPluginOptions {
    maxHistorySize?: number;
    enabled?: boolean;
}

export class HistoryPlugin implements Plugin {
    readonly id = 'history';
    readonly name = 'History Stack';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private pastStack: GraphSpec[] = [];
    private futureStack: GraphSpec[] = [];
    private maxHistorySize: number;
    private isRestoring = false;
    private isEnabled = true;

    private lastSnapshotTime = 0;
    private snapshotDebounce = 500;
    private debounceTimer: any = null;

    constructor(options: HistoryPluginOptions = {}) {
        this.maxHistorySize = options.maxHistorySize || 50;
        this.isEnabled = options.enabled !== false;
    }

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;

        if (this.isEnabled) {
            this.pushSnapshot();
        }

        this.sg.events.on('interaction:dragend', () => this.debouncedSnapshot());
        this.sg.events.on('interaction:edgecreate', () => this.debouncedSnapshot());
        this.sg.events.on('node:added', () => this.debouncedSnapshot());
        this.sg.events.on('node:removed', () => this.debouncedSnapshot());
        this.sg.events.on('edge:added', () => this.debouncedSnapshot());
        this.sg.events.on('edge:removed', () => this.debouncedSnapshot());

        this.sg.events.on('input:interaction:keydown', (e: unknown) =>
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

    private handleKeydown(e: any): void {
        if (!this.isEnabled) return;

        const tag = (e.originalEvent?.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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

    public pushSnapshot() {
        if (!this.isEnabled || this.isRestoring) return;

        const spec = this.sg.export();

        this.pastStack.push(spec);
        if (this.pastStack.length > this.maxHistorySize) {
            this.pastStack.shift();
        }

        this.futureStack = [];
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
    }
}
