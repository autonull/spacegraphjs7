import { createSignal, createMemo, createEffect } from 'solid-js';
import type {
    GraphViewData,
    GraphNode,
    GraphFacets,
    FacetDisplayCounts,
    IconComponent,
    I18n,
} from '@spacegraphjs/shared';
import { facetCount, mergeFacets, toggleFacet } from '@spacegraphjs/shared';
import { rankedSearch, sessionOutline, facetCounts } from './search';
import { createComponent, getNextElement, insert, setAttribute, template, memo } from 'solid-js/web';

export type GraphFindProps = {
    model: GraphViewData;
    facets: GraphFacets;
    onFacetsChange: (facets: GraphFacets) => void;
    onSelect: (node: GraphNode) => void;
    onClose: () => void;
    initialTab?: 'search' | 'filters' | 'outline';
    t: I18n['t'];
    plural: I18n['plural'];
    Icon: IconComponent;
    vocabularyKeys: {
        kind: Record<string, string>;
        status: Record<string, string>;
        domain: Record<string, string>;
    };
};

const NODE_KINDS = ['turn', 'phase', 'tool', 'file', 'error', 'note', 'group'] as const;
const NODE_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
const DOMAINS = ['session', 'filesystem', 'code', 'terminal', 'browser'] as const;

export const GraphFind = (props: GraphFindProps) => {
    const [query, setQuery] = createSignal('');
    const [activeIndex, setActiveIndex] = createSignal(0);
    const [activeTab, setActiveTab] = createSignal<'search' | 'filters' | 'outline'>(
        props.initialTab ?? 'search',
    );

    const searchResults = createMemo(() => {
        const q = query().trim();
        if (!q) return [];
        return rankedSearch(props.model, q);
    });

    const outline = createMemo(() => sessionOutline(props.model));
    const counts = createMemo(() => facetCounts(props.model, props.facets));

    const handleSelectResult = (node: GraphNode) => {
        props.onSelect(node);
        props.onClose();
    };

    const handleOutlineSelect = (turnID: string) => {
        const turnNode = props.model.nodes.find((n) => n.id === turnID);
        if (turnNode) {
            props.onSelect(turnNode);
            props.onClose();
        }
    };

    const changeFacets = (next: Partial<GraphFacets>) =>
        props.onFacetsChange(mergeFacets(props.facets, next));

    const toggleKind = (kind: string) => changeFacets({ kinds: toggleFacet(props.facets.kinds, kind) });
    const toggleStatus = (status: string) =>
        changeFacets({ statuses: toggleFacet(props.facets.statuses, status) });
    const toggleDomain = (domain: string) =>
        changeFacets({ domains: toggleFacet(props.facets.domains, domain, 'session') });

    const clearFacets = () => {
        changeFacets({ query: '', kinds: new Set(), statuses: new Set() });
    };

    const countLabel = (value: string, counts: FacetDisplayCounts) => {
        const count = facetCount(value, counts);
        return count ? `${count.kept}/${count.total}` : '0/0';
    };

    // Create templates lazily on first render to avoid module-level template calls
    // that fail during SSR builds
    let rootTemplate: ReturnType<typeof template> | null = null;
    let tabTemplate: ReturnType<typeof template> | null = null;
    let searchTabTemplate: ReturnType<typeof template> | null = null;
    let filterTabTemplate: ReturnType<typeof template> | null = null;
    let outlineTabTemplate: ReturnType<typeof template> | null = null;
    let searchInputTemplate: ReturnType<typeof template> | null = null;
    let searchResultTemplate: ReturnType<typeof template> | null = null;
    let filterSectionTemplate: ReturnType<typeof template> | null = null;
    let filterChipTemplate: ReturnType<typeof template> | null = null;
    let outlineItemTemplate: ReturnType<typeof template> | null = null;
    let noResultsTemplate: ReturnType<typeof template> | null = null;
    let noOutlineTemplate: ReturnType<typeof template> | null = null;
    let clearButtonTemplate: ReturnType<typeof template> | null = null;

    const ensureTemplates = () => {
        if (rootTemplate) return;
        rootTemplate = template(
            '<div data-component="spacegraph-find" data-slot="graph-find" class="absolute left-2 top-2 z-10 flex w-80 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-border-base bg-background-base shadow-md" role="dialog" aria-label="">',
            false,
        );
        tabTemplate = template(
            '<div class="flex border-b border-border-weaker-base"><button type="button" class="flex-1 px-3 py-2 text-12-medium text-text-weak hover:text-text-strong hover:bg-surface-base-hover" role="tab" aria-selected="false">Search</button><button type="button" class="flex-1 px-3 py-2 text-12-medium text-text-weak hover:text-text-strong hover:bg-surface-base-hover" role="tab" aria-selected="false">Filters</button><button type="button" class="flex-1 px-3 py-2 text-12-medium text-text-weak hover:text-text-strong hover:bg-surface-base-hover" role="tab" aria-selected="false">Outline</button></div>',
            false,
        );
        searchTabTemplate = template(
            '<div class="flex-1 flex-col overflow-hidden"></div>',
            false,
        );
        filterTabTemplate = template(
            '<div class="flex-1 flex-col overflow-hidden"></div>',
            false,
        );
        outlineTabTemplate = template(
            '<div class="flex-1 flex-col overflow-hidden"></div>',
            false,
        );
        searchInputTemplate = template(
            '<div class="flex items-center gap-2 px-2 py-1.5 border-b border-border-weaker-base"><span class="shrink-0 text-text-weak"></span><input class="min-w-0 flex-1 bg-transparent text-14-regular text-text-strong outline-none placeholder:text-text-weaker" aria-label="" role="combobox" aria-expanded="false" aria-controls="graph-find-search-results" aria-activedescendant=""><button type="button" class="flex h-6 w-6 items-center justify-center rounded-sm text-text-weak hover:text-text-strong hover:bg-surface-base-hover" aria-label=""><span class="shrink-0"></span></button></div>',
            false,
        );
        searchResultTemplate = template(
            '<div class="flex-1 overflow-y-auto"><ul id="graph-find-search-results" role="listbox" aria-label=""><li><button type="button" data-index="" data-node-id="" data-active="false" role="option" aria-selected="false" class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover"><span class="truncate text-12-regular text-text-strong"></span><span class="truncate text-12-regular text-text-weak"></span></button></li></ul></div>',
            false,
        );
        filterSectionTemplate = template(
            '<div class="p-2 overflow-y-auto"><div class="mb-3"><label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1"></label><div class="flex flex-wrap gap-1"></div></div><div class="mb-3"><label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1"></label><div class="flex flex-wrap gap-1"></div></div><div class="mb-3"><label class="text-11-medium uppercase tracking-wide text-text-weak block mb-1"></label><div class="flex flex-wrap gap-1"></div></div></div>',
            false,
        );
        filterChipTemplate = template(
            '<button type="button" class="flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors" aria-pressed="false"></button>',
            false,
        );
        outlineItemTemplate = template(
            '<ul class="divide-y divide-border-weaker-base" role="tree"></ul>',
            false,
        );
        noResultsTemplate = template(
            '<div class="px-3 py-2 text-12-regular text-text-weaker text-center"></div>',
            false,
        );
        noOutlineTemplate = template(
            '<div class="text-12-regular text-text-weaker py-4 text-center"></div>',
            false,
        );
        clearButtonTemplate = template(
            '<button type="button" class="w-full rounded-sm px-3 py-1.5 text-12-regular text-text-base hover:bg-surface-base-hover transition-colors"></button>',
            false,
        );
    };

    const createRoot = () => {
        ensureTemplates();
        const el = getNextElement(rootTemplate!) as HTMLElement;
        setAttribute(el, 'aria-label', props.t('ui.find.label'));
        return el;
    };

    const createTabs = () => {
        ensureTemplates();
        const el = getNextElement(tabTemplate!) as HTMLElement;
        const tabs = ['search', 'filters', 'outline'] as const;
        const tabButtons = Array.from(el.children) as HTMLButtonElement[];
        
        tabs.forEach((tab, i) => {
            const btn = tabButtons[i];
            const label = props.t(`ui.find.tabs.${tab}`);
            btn.textContent = label;
            setAttribute(btn, 'aria-selected', String(activeTab() === tab));
            btn.onclick = () => setActiveTab(tab);
        });
        
        // Update aria-selected on tab change
        createEffect(() => {
            const currentTab = activeTab();
            tabButtons.forEach((btn, i) => {
                setAttribute(btn, 'aria-selected', String(tabs[i] === currentTab));
            });
        });
        
        return el;
    };

    const createSearchTab = () => {
        ensureTemplates();
        const container = getNextElement(searchTabTemplate!) as HTMLElement;
        
        // Search input
        const inputContainer = getNextElement(searchInputTemplate!) as HTMLElement;
        const iconSpan = inputContainer.firstChild as HTMLElement;
        const input = iconSpan.nextSibling as HTMLInputElement;
        const button = input.nextSibling as HTMLButtonElement;
        const buttonSpan = button.firstChild as HTMLElement;

        createComponent(props.Icon, { name: 'magnifying-glass', size: 'small', class: 'shrink-0 text-text-weak' });
        insert(iconSpan, () => ''); // Icon rendered via createComponent above

        setAttribute(input, 'placeholder', props.t('ui.find.search.placeholder'));
        setAttribute(input, 'aria-label', props.t('ui.find.search.placeholder'));
        setAttribute(button, 'aria-label', props.t('ui.find.search.clear'));
        createComponent(props.Icon, { name: 'close-small', size: 'small' });
        insert(buttonSpan, () => '');

        input.oninput = (e: Event) => {
            const target = e.target as HTMLInputElement;
            setQuery(target.value);
            setActiveIndex(0);
        };
        button.onclick = () => {
            setQuery('');
            setActiveIndex(0);
        };

        container.appendChild(inputContainer);

        // Results list
        const resultsContainer = getNextElement(searchResultTemplate!) as HTMLElement;
        const ul = resultsContainer.querySelector('ul')!;
        
        createEffect(() => {
            const res = searchResults();
            
            // Clear existing results
            ul.innerHTML = '';
            
            if (res.length === 0 && query().trim().length > 0) {
                const noResults = getNextElement(noResultsTemplate!) as HTMLElement;
                insert(noResults, () => props.t('ui.find.search.noResults'));
                ul.appendChild(noResults);
            } else if (res.length > 0) {
                res.forEach((node, index) => {
                    const li = document.createElement('li');
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.setAttribute('data-index', String(index));
                    btn.setAttribute('data-node-id', node.id);
                    btn.setAttribute('data-active', String(index === activeIndex()));
                    btn.setAttribute('role', 'option');
                    btn.setAttribute('aria-selected', String(index === activeIndex()));
                    btn.id = `graph-find-search-option-${index}`;
                    btn.className = 'flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-base-hover';
                    
                    const labelSpan = document.createElement('span');
                    labelSpan.className = 'truncate text-12-regular text-text-strong';
                    labelSpan.textContent = node.label;
                    
                    const summarySpan = document.createElement('span');
                    summarySpan.className = 'truncate text-12-regular text-text-weak';
                    summarySpan.textContent = node.summary ?? '';
                    summarySpan.style.display = node.summary ? '' : 'none';
                    
                    btn.appendChild(labelSpan);
                    btn.appendChild(summarySpan);
                    li.appendChild(btn);
                    ul.appendChild(li);

                    btn.onmouseenter = () => setActiveIndex(index);
                    btn.onclick = () => handleSelectResult(node);
                });
            }
        });

        container.appendChild(resultsContainer);
        return container;
    };

    const createFilterTab = () => {
        ensureTemplates();
        const container = getNextElement(filterTabTemplate!) as HTMLElement;
        const section = getNextElement(filterSectionTemplate!) as HTMLElement;
        
        // Kinds section
        const kindsLabel = section.querySelector('label')!;
        kindsLabel.textContent = props.t('ui.facets.kinds');
        const kindsContainer = section.querySelectorAll('.flex.flex-wrap.gap-1')[0] as HTMLElement;
        
        NODE_KINDS.forEach((kind) => {
            const chip = getNextElement(filterChipTemplate!) as HTMLElement;
            const isActive = props.facets.kinds.has(kind);
            chip.className = `flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors ${
                isActive ? 'bg-primary-weaker text-primary-base' : 'text-text-base hover:bg-surface-base-hover'
            }`;
            chip.textContent = props.t(props.vocabularyKeys.kind[kind] ?? kind);
            chip.setAttribute('aria-pressed', String(isActive));
            chip.onclick = () => toggleKind(kind);
            kindsContainer.appendChild(chip);
        });

        // Statuses section
        const statusesLabel = section.querySelectorAll('label')[1]!;
        statusesLabel.textContent = props.t('ui.facets.statuses');
        const statusesContainer = section.querySelectorAll('.flex.flex-wrap.gap-1')[1] as HTMLElement;
        
        NODE_STATUSES.forEach((status) => {
            const chip = getNextElement(filterChipTemplate!) as HTMLElement;
            const isActive = props.facets.statuses.has(status);
            chip.className = `flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors ${
                isActive ? 'bg-primary-weaker text-primary-base' : 'text-text-base hover:bg-surface-base-hover'
            }`;
            chip.textContent = props.t(props.vocabularyKeys.status[status] ?? status);
            chip.setAttribute('aria-pressed', String(isActive));
            chip.onclick = () => toggleStatus(status);
            statusesContainer.appendChild(chip);
        });

        // Domains section
        const domainsLabel = section.querySelectorAll('label')[2]!;
        domainsLabel.textContent = props.t('ui.facets.domains');
        const domainsContainer = section.querySelectorAll('.flex.flex-wrap.gap-1')[2] as HTMLElement;
        
        DOMAINS.forEach((domain) => {
            const chip = getNextElement(filterChipTemplate!) as HTMLElement;
            const isActive = props.facets.domains.has(domain);
            chip.className = `flex items-center gap-1 rounded-sm px-2 py-1 text-11-regular transition-colors ${
                isActive ? 'bg-primary-weaker text-primary-base' : 'text-text-base hover:bg-surface-base-hover'
            }`;
            chip.textContent = `${props.t(props.vocabularyKeys.domain[domain] ?? domain)} (${countLabel(domain, counts().domains)})`;
            chip.setAttribute('aria-pressed', String(isActive));
            if (domain === 'session') chip.setAttribute('disabled', 'true');
            chip.onclick = () => toggleDomain(domain);
            domainsContainer.appendChild(chip);
        });

        // Clear button
        const clearBtn = getNextElement(clearButtonTemplate!) as HTMLElement;
        insert(clearBtn, () => props.t('ui.facets.clear'));
        clearBtn.onclick = clearFacets;
        section.appendChild(clearBtn);

        container.appendChild(section);
        return container;
    };

    const createOutlineTab = () => {
        ensureTemplates();
        const container = getNextElement(outlineTabTemplate!) as HTMLElement;
        const outlineData = outline();
        
        if (outlineData.length === 0) {
            const noOutline = getNextElement(noOutlineTemplate!) as HTMLElement;
            insert(noOutline, () => props.t('ui.find.noOutline'));
            container.appendChild(noOutline);
            return container;
        }

        const outlineList = getNextElement(outlineItemTemplate!) as HTMLElement;
        const ul = outlineList.querySelector('ul')!;
        ul.innerHTML = '';

        outlineData.forEach((turn) => {
            turn.phases.forEach((phase) => {
                const li = document.createElement('li');
                li.setAttribute('role', 'treeitem');
                
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'flex w-full items-center gap-2 px-2 py-1.5 text-left text-12-regular hover:bg-surface-base-hover';
                btn.setAttribute('aria-expanded', 'false');
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'shrink-0 text-text-weak';
                createComponent(props.Icon, { name: 'outline-dots', size: 'small' });
                insert(iconSpan, () => '');
                
                const labelSpan = document.createElement('span');
                labelSpan.className = 'truncate text-text-strong';
                labelSpan.textContent = phase.label;
                
                const categorySpan = document.createElement('span');
                categorySpan.className = 'shrink-0 text-10-regular text-text-weaker uppercase';
                categorySpan.textContent = phase.category;
                
                btn.appendChild(iconSpan);
                btn.appendChild(labelSpan);
                btn.appendChild(categorySpan);
                li.appendChild(btn);
                ul.appendChild(li);

                btn.onclick = () => handleOutlineSelect(phase.id);
            });
        });

        container.appendChild(outlineList);
        return container;
    };

    // Handle keyboard navigation for search results
    createEffect(() => {
        if (activeTab() === 'search') {
            const results = searchResults();
            if (results.length > 0) {
                setActiveIndex(Math.min(activeIndex(), results.length - 1));
            } else {
                setActiveIndex(0);
            }
        }
    });

    // Return memoized render functions (not JSX!) to avoid SSR template hoisting
    return [
        memo(() => {
            const root = createRoot();
            const tabs = createTabs();
            root.appendChild(tabs);
            return root;
        }, false),
        memo(() => {
            const tab = activeTab();
            if (tab === 'search') return createSearchTab();
            if (tab === 'filters') return createFilterTab();
            if (tab === 'outline') return createOutlineTab();
            return null;
        }, false),
    ];
};