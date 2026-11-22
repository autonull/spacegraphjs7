export type CommandMode = 'palette' | 'commands' | 'help';

export interface Command {
    readonly id: string;
    readonly label: string;
    readonly group: string;
    readonly hint?: string;
    readonly run?: () => void;
}

export interface CommandSurface {
    readonly element: HTMLElement;
    readonly mode: CommandMode | undefined;
    open(mode?: CommandMode): void;
    close(keepFocus?: boolean): void;
}

const matches = (command: Command, query: string): boolean =>
    [command.label, command.group, command.hint ?? '', command.id].some((value) =>
        value.toLowerCase().includes(query),
    );

/** Pure filter: prefix matches rank first, original order breaks ties. */
export const filterCommands = (commands: readonly Command[], query: string): readonly Command[] => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    const found = commands.filter((command) => matches(command, needle));
    return [
        ...found.filter((command) => command.label.toLowerCase().startsWith(needle)),
        ...found.filter((command) => !command.label.toLowerCase().startsWith(needle)),
    ];
};

export const createCommandSurface = (
    commands: () => readonly Command[],
    options: { readonly help?: readonly Command[] } = {},
): CommandSurface => {
    const element = document.createElement('div');
    element.id = 'command-surface';
    element.className = 'command-surface';
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
    element.setAttribute('aria-label', 'Command surface');
    element.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'command-panel';
    const input = document.createElement('input');
    input.id = 'command-input';
    input.type = 'search';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Filter commands');
    const list = document.createElement('div');
    list.id = 'command-list';
    list.setAttribute('role', 'listbox');
    const foot = document.createElement('div');
    foot.className = 'command-foot';
    foot.textContent = '↑↓ select · Enter run · Esc close';
    panel.append(input, list, foot);
    element.append(panel);

    let mode: CommandMode | undefined;
    let active = 0;
    let shown: readonly Command[] = [];
    let previousFocus: HTMLElement | null = null;

    /** A command may switch surface or move focus; neither should be undone by closing. */
    const runCommand = (command: Command): void => {
        const beforeMode = mode;
        const beforeFocus = document.activeElement;
        command.run?.();
        if (mode !== beforeMode) return;
        surface.close(document.activeElement !== beforeFocus);
    };

    const select = (index: number): void => {
        active = Math.min(Math.max(index, 0), Math.max(shown.length - 1, 0));
        for (const [rowIndex, row] of [...list.children].entries()) {
            row.setAttribute('aria-selected', String(rowIndex === active));
        }
        list.children[active]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    const render = (): void => {
        shown = filterCommands(mode === 'help' ? (options.help ?? []) : commands(), input.value);
        active = 0;
        list.replaceChildren(
            ...shown.map((command) => {
                const row = document.createElement('button');
                row.type = 'button';
                row.className = 'command-row';
                row.setAttribute('role', 'option');
                row.dataset.commandId = command.id;
                const label = document.createElement('span');
                label.className = 'command-label';
                label.textContent = command.label;
                const group = document.createElement('span');
                group.className = 'command-group';
                group.textContent = command.group;
                row.append(label, group);
                if (command.hint) {
                    const hint = document.createElement('span');
                    hint.className = 'command-hint';
                    hint.textContent = command.hint;
                    row.append(hint);
                }
                row.addEventListener('click', () => runCommand(command));
                return row;
            }),
        );
        select(0);
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            surface.close();
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            select(active + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            select(active - 1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const command = shown[active];
            if (command) runCommand(command);
        }
    });
    element.addEventListener('pointerdown', (event) => {
        if (event.target === element) surface.close();
    });

    const surface: CommandSurface = {
        element,
        get mode() {
            return mode;
        },
        open(next: CommandMode = 'palette') {
            previousFocus = document.activeElement as HTMLElement | null;
            mode = next;
            input.placeholder = next === 'help' ? 'Search shortcuts…' : 'Search verbs and knobs…';
            element.dataset.mode = next;
            element.hidden = false;
            input.value = '';
            render();
            input.focus();
        },
        close(keepFocus = false) {
            element.hidden = true;
            mode = undefined;
            if (!keepFocus) previousFocus?.focus();
            previousFocus = null;
        },
    };
    return surface;
};
