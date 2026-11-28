import { CommandRegistry, filterCommands, matchCommand, type Command } from './commands';

export type ComposerOptions = {
    readonly onSubmit: (text: string) => void;
    readonly history?: readonly string[];
    /** Slash catalog; plain text still submits through `onSubmit`. */
    readonly commands?: CommandRegistry | readonly Command[];
    /** Called with the resolved command id and its trailing argument text. */
    readonly onCommand?: (id: string, rest: string) => void;
    /** Called on input with the active slash prefix and its ranked candidates. */
    readonly onComplete?: (prefix: string, matches: readonly Command[]) => void;
};
export type ComposerController = {
    readonly element: HTMLTextAreaElement;
    focus(): void;
    clear(): void;
    value(): string;
    destroy(): void;
};
/** Host-agnostic prompt editor: Enter submits, Shift+Enter inserts a newline, arrows walk history. */
export const mountComposer = (
    element: HTMLTextAreaElement,
    options: ComposerOptions,
): ComposerController => {
    const catalog = options.commands
        ? 'list' in options.commands
            ? options.commands
            : new CommandRegistry(options.commands)
        : undefined;
    const history = [...(options.history ?? [])];
    let cursor = history.length;
    let draft = '';
    const resize = (): void => {
        element.style.height = 'auto';
        element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
    };
    const reset = (): void => {
        element.value = '';
        draft = '';
        cursor = history.length;
        resize();
        options.onComplete?.('', []);
    };
    const complete = (): void => {
        const value = element.value.trim();
        const prefix = catalog && value.startsWith('/') ? value.slice(1).split(/\s+/)[0] ?? '' : '';
        options.onComplete?.(prefix, prefix ? filterCommands(catalog!.list(), prefix) : []);
    };
    const submit = (): void => {
        const text = element.value.trim();
        if (!text) return;
        if (history.at(-1) !== text) history.push(text);
        cursor = history.length;
        draft = '';
        options.onSubmit(text);
        complete();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
        if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.altKey &&
            !event.metaKey &&
            !event.ctrlKey
        ) {
            event.preventDefault();
            const match = catalog && matchCommand(catalog.list(), element.value);
            if (match) {
                options.onCommand?.(match.command.id, match.rest);
                reset();
                return;
            }
            submit();
        } else if (event.key === 'ArrowUp' && element.selectionStart === 0) {
            event.preventDefault();
            if (cursor === history.length) draft = element.value;
            cursor = Math.max(0, cursor - 1);
            element.value = history[cursor] ?? draft;
            element.setSelectionRange(0, 0);
            resize();
        } else if (event.key === 'ArrowDown' && element.selectionStart === element.value.length) {
            event.preventDefault();
            cursor = Math.min(history.length, cursor + 1);
            element.value = cursor === history.length ? draft : history[cursor] ?? '';
            element.setSelectionRange(element.value.length, element.value.length);
            resize();
        }
    };
    const onInput = (): void => {
        resize();
        complete();
    };
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('input', onInput);
    resize();
    return {
        element,
        focus: (): void => element.focus(),
        clear: reset,
        value: (): string => element.value,
        destroy: (): void => {
            element.removeEventListener('keydown', onKeyDown);
            element.removeEventListener('input', onInput);
        },
    };
};
