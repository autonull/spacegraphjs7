/**
 * Host-agnostic command data and contribution registry.
 * Commands carry labels, hints and gates; hosts own the DOM, grammar and execution surface.
 */
export interface Command {
    readonly id: string;
    readonly label: string;
    readonly group: string;
    readonly hint?: string;
    readonly shortcut?: string;
    readonly keywords?: readonly string[];
    /** Why the action is unavailable; a gated command stays visible with an explanation. */
    readonly disabledReason?: string;
    readonly run?: () => void;
}

const matches = (command: Command, needle: string): boolean =>
    [
        command.label,
        command.group,
        command.hint ?? '',
        command.id,
        command.shortcut ?? '',
        ...(command.keywords ?? []),
    ].some((value) => value.toLowerCase().includes(needle));

/** Prefix matches rank first; original order breaks ties. */
export const filterCommands = (commands: readonly Command[], query: string): readonly Command[] => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    const found = commands.filter((command) => matches(command, needle));
    return [
        ...found.filter((command) => command.label.toLowerCase().startsWith(needle)),
        ...found.filter((command) => !command.label.toLowerCase().startsWith(needle)),
    ];
};

export interface CommandMatch {
    readonly command: Command;
    readonly rest: string;
}
/** Resolve `/verb rest` against ids, labels and keywords; labels may span up to three words. */
export const matchCommand = (
    commands: readonly Command[],
    text: string,
): CommandMatch | undefined => {
    const value = text.trim().replace(/^\//, '');
    if (!value) return undefined;
    const parts = value.split(/\s+/);
    for (const command of commands) {
        const names = [command.id, command.label, ...(command.keywords ?? [])].map((name) =>
            name.toLowerCase(),
        );
        for (let count = Math.min(3, parts.length); count >= 1; count--) {
            const token = parts.slice(0, count).join(' ').toLowerCase();
            if (names.includes(token)) return { command, rest: parts.slice(count).join(' ') };
        }
    }
    const [prefix] = filterCommands(commands, parts[0]!);
    return prefix ? { command: prefix, rest: parts.slice(1).join(' ') } : undefined;
};
/** A named set of contributed commands, keyed by stable id. */
export class CommandRegistry {
    readonly #entries: Command[] = [];

    constructor(commands: Iterable<Command> = []) {
        for (const command of commands) this.add(command);
    }

    add(command: Command): this {
        const index = this.#entries.findIndex((entry) => entry.id === command.id);
        if (index < 0) this.#entries.push(command);
        else this.#entries[index] = command;
        return this;
    }

    remove(id: string): boolean {
        const index = this.#entries.findIndex((entry) => entry.id === id);
        if (index < 0) return false;
        this.#entries.splice(index, 1);
        return true;
    }

    get(id: string): Command | undefined {
        return this.#entries.find((entry) => entry.id === id);
    }

    list(): readonly Command[] {
        return this.#entries;
    }

    groups(): readonly string[] {
        return [...new Set(this.#entries.map((command) => command.group))];
    }

    filter(query: string): readonly Command[] {
        return filterCommands(this.#entries, query);
    }

    /** Runs an enabled command; a missing or gated command is a no-op. */
    run(id: string): boolean {
        const command = this.get(id);
        if (!command || command.disabledReason) return false;
        command.run?.();
        return true;
    }
}

export interface TourStep {
    readonly id: string;
    readonly title: string;
    readonly instruction: string;
    readonly hint?: string;
}

/** An untimed sequence of guidance steps; hosts render the step and own completion. */
export class Tour {
    readonly #steps: readonly TourStep[];
    #index = 0;

    constructor(steps: readonly TourStep[] = []) {
        this.#steps = steps;
    }

    get current(): TourStep | undefined {
        return this.#steps[this.#index];
    }

    get index(): number {
        return this.#index;
    }

    get total(): number {
        return this.#steps.length;
    }

    get done(): boolean {
        return this.#steps.length === 0 || this.#index >= this.#steps.length;
    }

    start(): TourStep | undefined {
        this.#index = this.#steps.length ? 0 : this.#steps.length;
        return this.current;
    }

    advance(): TourStep | undefined {
        if (!this.done) this.#index += 1;
        return this.current;
    }

    skip(): void {
        this.#index = this.#steps.length;
    }
}
