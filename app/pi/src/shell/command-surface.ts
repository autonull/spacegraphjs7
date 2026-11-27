import { filterCommands, type Command } from 'spacegraphjs/commands';

export { filterCommands };
export type { Command };

export type CommandMode = 'palette' | 'commands' | 'help';

export interface CommandSurface {
    readonly element: HTMLElement;
    readonly mode: CommandMode | undefined;
    open(mode?: CommandMode, query?: string): void;
    close(keepFocus?: boolean): void;
}

export const createCommandSurface = (
    commands: () => readonly Command[],
    options: { readonly help?: readonly Command[] | (() => readonly Command[]) } = {},
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
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-controls', 'command-list');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const list = document.createElement('div');
    list.id = 'command-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Commands');
    const foot = document.createElement('div');
    foot.className = 'command-foot';
    foot.textContent = '↑↓ select · Enter run · Esc close';
    panel.append(input, list, foot);
    element.append(panel);

    let mode: CommandMode | undefined;
    let active = -1;
    let shown: readonly Command[] = [];
    let previousFocus: HTMLElement | null = null;

    /** A command may switch surface or move focus; neither should be undone by closing. */
    const runCommand = (command: Command): void => {
        if (command.disabledReason) return;
        const beforeMode = mode;
        const beforeFocus = document.activeElement;
        command.run?.();
        if (mode !== beforeMode) return;
        surface.close(document.activeElement !== beforeFocus);
    };

    const select = (index: number): void => {
        const enabled = shown.flatMap((command, position) =>
            command.disabledReason ? [] : [position],
        );
        const forward = index > active;
        active = enabled.length
            ? (enabled.find((position) =>
                  forward ? position > (active < 0 ? -1 : active) : position < active,
              ) ?? enabled[forward ? enabled.length - 1 : 0]!)
            : -1;
        const selected = active >= 0 ? `command-option-${active}` : '';
        for (const [rowIndex, row] of [...list.children].entries()) {
            if (row.getAttribute('role') === 'option')
                row.setAttribute('aria-selected', String(rowIndex === active));
        }
        if (selected) input.setAttribute('aria-activedescendant', selected);
        else input.removeAttribute('aria-activedescendant');
        list.children[active]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    };

    const render = (): void => {
        shown = filterCommands(
            mode === 'help'
                ? typeof options.help === 'function'
                    ? options.help()
                    : (options.help ?? [])
                : commands(),
            input.value,
        );
        active = -1;
        if (!shown.length) {
            const status = document.createElement('p');
            status.className = 'command-empty';
            status.setAttribute('role', 'status');
            status.textContent = 'No commands match — try another word.';
            list.replaceChildren(status);
            input.removeAttribute('aria-activedescendant');
            return;
        }
        list.replaceChildren(
            ...shown.map((command, rowIndex) => {
                const row = document.createElement('div');
                row.className = 'command-row';
                row.setAttribute('role', 'option');
                row.id = `command-option-${rowIndex}`;
                row.setAttribute('tabindex', '-1');
                row.setAttribute('aria-selected', 'false');
                if (command.disabledReason) {
                    row.setAttribute('aria-disabled', 'true');
                    row.classList.add('command-row--disabled');
                }
                row.dataset.commandId = command.id;
                const label = document.createElement('span');
                label.className = 'command-label';
                label.textContent = command.label;
                const group = document.createElement('span');
                group.className = 'command-group';
                group.textContent = command.group;
                row.append(label, group);
                const hint = document.createElement('span');
                hint.className = 'command-hint';
                hint.textContent = command.disabledReason ?? command.hint ?? '';
                if (hint.textContent) row.append(hint);
                row.addEventListener('click', () => runCommand(command));
                return row;
            }),
        );
        select(0);
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
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
    element.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            surface.close();
        } else if (event.key === 'Tab') {
            event.preventDefault();
            input.focus();
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
        open(next: CommandMode = 'palette', query = '') {
            previousFocus = document.activeElement as HTMLElement | null;
            mode = next;
            input.placeholder = next === 'help' ? 'Search shortcuts…' : 'Search verbs and knobs…';
            element.dataset.mode = next;
            element.hidden = false;
            input.setAttribute('aria-expanded', 'true');
            input.value = query;
            render();
            input.focus();
        },
        close(keepFocus = false) {
            element.hidden = true;
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            mode = undefined;
            if (!keepFocus) previousFocus?.focus();
            previousFocus = null;
        },
    };
    return surface;
};
