/** Declarative keyboard bindings with one typing guard and one dispatch path. */
export interface KeyBinding {
    readonly keys: string;
    readonly label: string;
    readonly match: (event: KeyboardEvent) => boolean;
    readonly run: (event: KeyboardEvent) => void;
    readonly whileTyping?: boolean;
}
export const plainKey =
    (key: string) =>
    (event: KeyboardEvent): boolean =>
        !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && event.key === key;
export const shiftedKey =
    (key: string) =>
    (event: KeyboardEvent): boolean =>
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.shiftKey &&
        event.key.toLowerCase() === key;
export const isTypingTarget = (target: EventTarget | null): boolean => {
    const node = target as HTMLElement | null;
    return Boolean(node?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node?.tagName ?? ''));
};
/** Runs the first matching binding; returns whether one handled the event. */
export const dispatchKeys = (
    event: KeyboardEvent,
    bindings: readonly KeyBinding[],
    typing = isTypingTarget(event.target),
): boolean => {
    const binding = bindings.find((entry) => entry.match(event) && (!typing || entry.whileTyping));
    if (!binding) return false;
    event.preventDefault();
    binding.run(event);
    return true;
};
export const renderShortcuts = (
    container: HTMLElement,
    bindings: readonly KeyBinding[],
): void => {
    container.replaceChildren(
        ...bindings.map((binding) => {
            const row = document.createElement('div');
            row.className = 'shortcut';
            const keys = document.createElement('kbd');
            keys.textContent = binding.keys;
            const label = document.createElement('span');
            label.textContent = binding.label;
            row.append(keys, label);
            return row;
        }),
    );
};
