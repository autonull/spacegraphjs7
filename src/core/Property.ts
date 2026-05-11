import { EventEmitter, type Disposable } from './EventEmitter';

export interface PropertyChange<T> {
    oldValue: T;
    newValue: T;
    property: Property<T>;
}

export class Property<T> extends EventEmitter<{ change: PropertyChange<T> }> implements Disposable {
    private disposed = false;

    constructor(private _value: T) {
        super();
    }

    get value(): T {
        return this._value;
    }
    set value(v: T) {
        if (v === this._value && !Object.is(v, this._value)) return;
        this.emit('change', { oldValue: this._value, newValue: v, property: this });
        this._value = v;
    }

    get(): T {
        return this._value;
    }
    set(v: T): void {
        this.value = v;
    }
    subscribe(handler: (change: PropertyChange<T>) => void): Disposable {
        return this.on('change', handler);
    }
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.removeAllListeners();
    }
}
