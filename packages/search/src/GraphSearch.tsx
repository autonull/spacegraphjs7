import type { GraphViewData, GraphNode } from '@spacegraphjs/shared';
import { navigationHelp, navigationResults } from './navigation';
import { rankedSearch } from './search';
import type { IconComponent } from '@spacegraphjs/shared';
import type { I18n } from '@spacegraphjs/shared';
import { useDebounce } from '@spacegraphjs/shared';
import { createSignal, createMemo, createEffect } from 'solid-js';
import { createComponent, getNextElement, insert, setAttribute, template, memo } from 'solid-js/web';

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

    // Create templates lazily on first render to avoid module-level template calls
    // that fail during SSR builds
    let rootTemplate: ReturnType<typeof template> | null = null;
    let inputTemplate: ReturnType<typeof template> | null = null;
    let buttonTemplate: ReturnType<typeof template> | null = null;
    let hintTemplate: ReturnType<typeof template> | null = null;
    let listTemplate: ReturnType<typeof template> | null = null;
    let resultTemplate: ReturnType<typeof template> | null = null;
    let noResultsTemplate: ReturnType<typeof template> | null = null;
    let resultCountTemplate: ReturnType<typeof template> | null = null;

    const ensureTemplates = () => {
        if (rootTemplate) return;
        rootTemplate = template(
            '<div data-component="spacegraph-search" data-slot="graph-search" class="absolute left-2 top-2 z-10 flex w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md" role="dialog" aria-label="">',
            false,
        );
        inputTemplate = template(
            '<div class="flex items-center gap-2 px-2 py-1.5"><span class="shrink-0 text-text-weak"></span><input class="min-w-0 flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker" aria-label="" role="combobox" aria-expanded="false" aria-controls="graph-search-results" aria-activedescendant=""><button type="button" class="flex h-6 w-6 items-center justify-center rounded-sm text-text-weak hover:text-text-strong hover:bg-surface-base-hover" aria-label=""><span class="shrink-0"></span></button></div>',
            false,
        );
        buttonTemplate = template(
            '<button type="button" class="flex items-center gap-1 text-left text-12-regular text-text-weak hover:text-text-strong"><kbd class="rounded border border-border-weaker-base px-1 text-11-regular"></kbd><span class="truncate"></span></button>',
            false,
        );
        hintTemplate = template(
            '<div class="grid grid-cols-3 gap-x-3 gap-y-1 border-t border-border-weaker-base px-3 py-2"></div>',
            false,
        );
        listTemplate = template(
            '<div class="max-h-72 overflow-y-auto border-t border-border-weaker-base"></div>',
            false,
        );
        resultTemplate = template(
            '<ul id="graph-search-results" role="listbox" aria-label=""><li><button type="button" data-index="" data-node-id="" data-active="false" role="option" aria-selected="false" class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover"><span class="truncate text-12-regular text-text-strong"></span><span class="truncate text-12-regular text-text-weak"></span></button></li></ul>',
            false,
        );
        noResultsTemplate = template(
            '<div class="px-3 py-2 text-12-regular text-text-weaker"></div>',
            false,
        );
        resultCountTemplate = template(
            '<div class="px-3 py-1 text-12-regular text-text-weaker"></div>',
            false,
        );
    };

    const createRoot = () => {
        ensureTemplates();
        const el = getNextElement(rootTemplate!) as HTMLElement;
        setAttribute(el, 'aria-label', props.t('ui.search.label'));
        return el;
    };

    const createInput = () => {
        ensureTemplates();
        const el = getNextElement(inputTemplate!) as HTMLElement;
        const iconSpan = el.firstChild as HTMLElement;
        const input = iconSpan.nextSibling as HTMLInputElement;
        const button = input.nextSibling as HTMLButtonElement;
        const buttonSpan = button.firstChild as HTMLElement;

        // Render icon using createComponent + insert
        const searchIcon = createComponent(props.Icon, {
            name: 'magnifying-glass',
            size: 'small',
            class: 'shrink-0 text-text-weak',
        });
        insert(iconSpan, searchIcon);

        // Set input attributes
        setAttribute(input, 'placeholder', props.t('ui.search.placeholder'));
        setAttribute(input, 'aria-label', props.t('ui.search.placeholder'));
        setAttribute(button, 'aria-label', props.t('ui.search.close'));

        // Set button icon
        const closeIcon = createComponent(props.Icon, {
            name: 'close-small',
            size: 'small',
        });
        insert(buttonSpan, closeIcon);

        // Event handlers
        input.oninput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            setQueryRaw(target.value);
        };
        button.onclick = props.onClose;

        return el;
    };

    const createNavigationHints = () => {
        ensureTemplates();
        const hints = navigationHint();
        if (hints.length === 0) return null;
        
        const container = getNextElement(hintTemplate!) as HTMLElement;
        hints.forEach((entry) => {
            const btn = getNextElement(buttonTemplate!) as HTMLElement;
            const kbd = btn.firstChild as HTMLElement;
            const span = kbd.nextSibling as HTMLElement;
            insert(kbd, () => `g ${entry.key}`);
            insert(span, () => props.t(entry.labelKey));
            btn.onclick = () => setQueryRaw(`g ${entry.key}`);
            container.appendChild(btn);
        });
        return container;
    };

    const createResultsList = () => {
        ensureTemplates();
        const res = results();
        const container = getNextElement(listTemplate!) as HTMLElement;
        
        if (res.length === 0) {
            const noResults = getNextElement(noResultsTemplate!) as HTMLElement;
            insert(noResults, () => props.t('ui.search.noResults'));
            container.appendChild(noResults);
            return container;
        }

        const count = getNextElement(resultCountTemplate!) as HTMLElement;
        insert(count, () => props.plural('ui.search.results', res.length));
        container.appendChild(count);

        const ul = getNextElement(resultTemplate!) as HTMLElement;
        res.forEach((node, index) => {
            const li = ul.querySelector(`[data-index="${index}"]`) as HTMLLIElement;
            if (!li) return;
            const button = li.firstChild as HTMLButtonElement;
            const labelSpan = button.firstChild as HTMLElement;
            const summarySpan = labelSpan.nextSibling as HTMLElement;
            
            setAttribute(button, 'data-index', String(index));
            setAttribute(button, 'data-node-id', node.id);
            setAttribute(button, 'data-active', String(index === active()));
            setAttribute(button, 'aria-selected', String(index === active()));
            setAttribute(button, 'id', `graph-search-option-${index}`);
            insert(labelSpan, () => node.label);
            
            if (node.summary) {
                insert(summarySpan, () => node.summary);
                summarySpan.style.display = '';
            } else {
                summarySpan.style.display = 'none';
            }

            button.onmouseenter = () => setActive(index);
            button.onclick = () => props.onSelect(node);
            ul.appendChild(li);
        });
        return container;
    };

    // Handle keyboard navigation
    createEffect(() => {
        const res = results();
        if (res.length > 0) {
            setActive(Math.min(active(), res.length - 1));
        } else {
            setActive(0);
        }
    });

    // Return memoized render functions (not JSX!) to avoid SSR template hoisting
    return [
        memo(() => {
            const root = createRoot();
            const inputContainer = createInput();
            root.appendChild(inputContainer);
            return root;
        }, false),
        memo(() => {
            const hints = createNavigationHints();
            return hints;
        }, false),
        memo(() => {
            const queryTrimmed = queryRaw().trim();
            if (queryTrimmed.length > 0) {
                return createResultsList();
            }
            return null;
        }, false),
    ];
};