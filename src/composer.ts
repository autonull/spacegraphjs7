export type ComposerOptions = {
    readonly onSubmit: (text: string) => void;
    readonly history?: readonly string[];
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
    const history = [...(options.history ?? [])];
    let cursor = history.length;
    let draft = '';
    const resize = (): void => {
        element.style.height = 'auto';
        element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
    };
    const submit = (): void => {
        const text = element.value.trim();
        if (!text) return;
        if (history.at(-1) !== text) history.push(text);
        cursor = history.length;
        draft = '';
        options.onSubmit(text);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
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
    const onInput = (): void => resize();
    element.addEventListener('keydown', onKeyDown);
    element.addEventListener('input', onInput);
    resize();
    return {
        element,
        focus: (): void => element.focus(),
        clear: (): void => {
            element.value = '';
            draft = '';
            cursor = history.length;
            resize();
        },
        value: (): string => element.value,
        destroy: (): void => {
            element.removeEventListener('keydown', onKeyDown);
            element.removeEventListener('input', onInput);
        },
    };
};
