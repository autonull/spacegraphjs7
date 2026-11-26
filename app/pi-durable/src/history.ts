import { encodeAddress, type Address } from './address';

/** The undoable sequence of view addresses. The tracker owns ordering and suppression; the host
 * owns how an address is captured and applied. */
export class HistoryTracker {
    readonly #entries: Address[] = [];
    #cursor = -1;
    #suppressed = false;

    get entries(): readonly Address[] {
        return this.#entries;
    }

    get index(): number {
        return this.#cursor;
    }

    suppress(suppressed: boolean): void {
        this.#suppressed = suppressed;
    }

    record(snapshot: Address): void {
        if (this.#suppressed) return;
        const current = this.#entries[this.#cursor];
        if (current && encodeAddress(current) === encodeAddress(snapshot)) return;
        this.#entries.length = this.#cursor + 1;
        this.#entries.push(snapshot);
        this.#cursor = this.#entries.length - 1;
    }

    step(delta: -1 | 1): Address | undefined {
        const cursor = this.#cursor + delta;
        if (cursor < 0 || cursor >= this.#entries.length) return undefined;
        this.#cursor = cursor;
        return this.#entries[cursor];
    }
}
