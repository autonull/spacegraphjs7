import { createEffect, createMemo, createSignal, For, onMount, Show } from 'solid-js';
import type { GraphViewData, GraphNode } from '@spacegraphjs/shared';
import { navigationHelp, navigationResults } from './navigation';
import { rankedSearch } from './search';
import type { IconComponent } from '@spacegraphjs/shared';
import type { I18n } from '@spacegraphjs/shared';
import { useDebounce } from '@spacegraphjs/shared';

export type GraphSearchProps = {
    model: GraphViewData;
    onSelect: (node: GraphNode) => void;
    onClose: () => void;
    initialQuery?: string;
    t: I18n['t'];
    plural: I18n['plural'];
    Icon: IconComponent;
};

export const GraphSearch = (props: GraphSearchProps) => {
    const [queryRaw, setQueryRaw] = createSignal(props.initialQuery ?? '');
    const query = useDebounce(queryRaw, 150);
    const [active, setActive] = createSignal(0);
    const results = createMemo(
        () => navigationResults(props.model, query()) ?? rankedSearch(props.model, query()),
    );
    const navigationHint = createMemo(() =>
        query().trim().toLowerCase() === 'g' ? navigationHelp() : [],
    );
    let input!: HTMLInputElement;
    let list!: HTMLDivElement;

    createEffect(() => {
        query();
        setActive(0);
    });

    createEffect(() => {
        const index = active();
        queueMicrotask(() =>
            list?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' }),
        );
    });

    const move = (delta: number) => {
        const max = results().length - 1;
        if (max < 0) return;
        setActive((current) => Math.min(max, Math.max(0, current + delta)));
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            props.onClose();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            move(1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            move(-1);
            return;
        }

        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            setActive(event.key === 'Home' ? 0 : results().length - 1);
            return;
        }

        if (event.key === 'Enter') {
            const node = results()[active()];
            if (node) props.onSelect(node);
        }
    };

    onMount(() => input.focus());

    return (
        <div
            data-component="spacegraph-search"
            data-slot="graph-search"
            class="absolute left-2 top-2 z-10 flex w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md"
            role="dialog"
            aria-label={props.t('ui.search.label')}
            onKeyDown={onKeyDown}
        >
            <div class="flex items-center gap-2 px-2 py-1.5">
                <props.Icon name="magnifying-glass" size="small" class="shrink-0 text-text-weak" />
                <input
                    ref={input}
                    value={query()}
                    class="min-w-0 flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker"
                    placeholder={props.t('ui.search.placeholder')}
                    aria-label={props.t('ui.search.placeholder')}
                    role="combobox"
                    aria-expanded={results().length > 0}
                    aria-controls="graph-search-results"
                    aria-activedescendant={
                        results().length > 0 ? `graph-search-option-${active()}` : undefined
                    }
                    onInput={(event) => setQueryRaw(event.currentTarget.value)}
                />
                <button
                    type="button"
                    class="flex h-6 w-6 items-center justify-center rounded-sm text-text-weak hover:text-text-strong hover:bg-surface-base-hover"
                    aria-label={props.t('ui.search.close')}
                    onClick={props.onClose}
                >
                    <props.Icon name="close-small" size="small" />
                </button>
            </div>

            <Show when={navigationHint().length > 0}>
                <div class="grid grid-cols-3 gap-x-3 gap-y-1 border-t border-border-weaker-base px-3 py-2">
                    <For each={navigationHint()}>
                        {(entry) => (
                            <button
                                type="button"
                                class="flex items-center gap-1 text-left text-12-regular text-text-weak hover:text-text-strong"
                                onClick={() => setQueryRaw(`g ${entry.key}`)}
                            >
                                <kbd class="rounded border border-border-weaker-base px-1 text-11-regular">
                                    g {entry.key}
                                </kbd>
                                <span class="truncate">{props.t(entry.labelKey)}</span>
                            </button>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={queryRaw().trim().length > 0}>
                <div ref={list} class="max-h-72 overflow-y-auto border-t border-border-weaker-base">
                    <Show
                        when={results().length > 0}
                        fallback={
                            <div class="px-3 py-2 text-12-regular text-text-weaker">
                                {props.t('ui.search.noResults')}
                            </div>
                        }
                    >
                        <div class="px-3 py-1 text-12-regular text-text-weaker">
                            {props.plural('ui.search.results', results().length)}
                        </div>
                        <ul
                            id="graph-search-results"
                            role="listbox"
                            aria-label={props.t('ui.search.label')}
                        >
                            <For each={results()}>
                                {(node, index) => (
                                    <li>
                                        <button
                                            type="button"
                                            id={`graph-search-option-${index()}`}
                                            data-index={index()}
                                            data-node-id={node.id}
                                            data-active={index() === active()}
                                            role="option"
                                            aria-selected={index() === active()}
                                            class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover"
                                            classList={{
                                                'bg-surface-base-hover': index() === active(),
                                            }}
                                            onMouseEnter={() => setActive(index())}
                                            onClick={() => props.onSelect(node)}
                                        >
                                            <span class="truncate text-12-regular text-text-strong">
                                                {node.label}
                                            </span>
                                            <Show when={node.summary}>
                                                <span class="truncate text-12-regular text-text-weak">
                                                    {node.summary}
                                                </span>
                                            </Show>
                                        </button>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Show>
                </div>
            </Show>
        </div>
    );
};
