import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin, GraphSpec } from '../types';

export interface HistoryPluginOptions {
    maxHistorySize?: number;
    enabled?: boolean;
}

export class HistoryPlugin implements ISpaceGraphPlugin {
    readonly id = 'history';
    readonly name = 'History Stack';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private pastStack: GraphSpec[] = [];
    private futureStack: GraphSpec[] = [];
    private maxHistorySize: number;
    private isRestoring = false;
    private isEnabled = true;

    // Throttle / Debounce variables for dragging and frequent updates
    private lastSnapshotTime = 0;
    private snapshotDebounce = 500;
    private debounceTimer: any = null;

    constructor(options: HistoryPluginOptions = {}) {
        this.maxHistorySize = options.maxHistorySize || 50;
        this.isEnabled = options.enabled !== false;
    }

    init(sg: SpaceGraph): void {
        this.sg = sg;

        // Take initial snapshot
        if (this.isEnabled) {
            this.pushSnapshot();
        }

        // Listen for significant user interactions that warrant a history state
        this.sg.events.on('interaction:dragend', () => this.debouncedSnapshot());
        this.sg.events.on('interaction:edgecreate', () => this.debouncedSnapshot());
        this.sg.events.on('node:added', () => this.debouncedSnapshot());
        this.sg.events.on('node:removed', () => this.debouncedSnapshot());
        this.sg.events.on('edge:added', () => this.debouncedSnapshot());
        this.sg.events.on('edge:removed', () => this.debouncedSnapshot());

        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleKeydown);
        }
    }

    private handleKeydown = (e: KeyboardEvent) => {
        if (!this.isEnabled) return;

        // Ignore if user is typing in an input or textarea
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        }
    };

    /**
     * Manually push a snapshot onto the history stack.
     */
    public pushSnapshot() {
        if (!this.isEnabled || this.isRestoring) return;

        const spec = this.sg.export();

        // Don't push if it's identical to the last one (simple check)
        if (this.pastStack.length > 0) {
            const last = this.pastStack[this.pastStack.length - 1];
            // Shallow length check to avoid full deep equals cost if obvious
            if (last.nodes.length === spec.nodes.length && last.edges.length === spec.edges.length) {
                // If it's a minor change we still want to save it, but we could add deep equality later if performance demands.
            }
        }

        this.pastStack.push(spec);
        if (this.pastStack.length > this.maxHistorySize) {
            this.pastStack.shift();
        }

        // Clear future stack on new action
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
        if (!this.isEnabled || this.pastStack.length <= 1) return; // Keep initial state

        this.isRestoring = true;

        // The current state is the top of the past stack. We pop it to future.
        const currentState = this.pastStack.pop()!;
        this.futureStack.push(currentState);

        // The state to restore is now the new top of the past stack.
        const previousState = this.pastStack[this.pastStack.length - 1];

        // Import without camera changes to prevent jarring jumps, just data.
        // The SpaceGraph.import clears the graph.
        this.sg.graph.clear();
        this.sg.loadSpec(previousState);

        // Tell plugins/HUD that a major change happened
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
        this.pushSnapshot(); // save current state as base
    }

    dispose(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeydown);
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.pastStack = [];
        this.futureStack = [];
    }
}
