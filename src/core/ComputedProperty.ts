import { type Disposable } from './EventEmitter';
import { Property } from './Property';

export class ComputedProperty<T> extends Property<T> {
    private disposables: Disposable[] = [];
    private computing = false;

    constructor(
        private compute: () => T,
        dependencies: Property<unknown>[],
    ) {
        super(compute());
        for (const dep of dependencies) {
            this.disposables.push(dep.subscribe(() => this.recompute()));
        }
    }

    private recompute(): void {
        if (this.computing) return;
        this.computing = true;
        try { super.value = this.compute(); }
        finally { this.computing = false; }
    }

    dispose(): void {
        for (const d of this.disposables) d.dispose();
        this.disposables = [];
        super.dispose();
    }
}