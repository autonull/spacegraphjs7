/** Shared arrow/Enter handling for result lists that track an active index. */
export const navigateResults = (
    event: KeyboardEvent,
    count: number,
    active: number,
    setActive: (index: number) => void,
    select: (index: number) => void,
): void => {
    if (!count) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((active + (event.key === 'ArrowDown' ? 1 : -1) + count) % count);
        return;
    }
    if (event.key === 'Enter') {
        event.preventDefault();
        select(active);
    }
};
