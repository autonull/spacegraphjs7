import type { I18n } from '@spacegraphjs/shared';
import { For, Show } from 'solid-js';

export type GraphBreadcrumb = { id: string; label: string };

export type GraphBreadcrumbsProps = {
    crumbs: readonly GraphBreadcrumb[];
    onSelect: (id: string) => void;
    /** i18n functions for localized strings. */
    i18n?: I18n;
    /** ARIA label for the breadcrumb navigation. */
    ariaLabel?: string;
};

/**
 * A renderer-agnostic breadcrumb trail showing the path from session to the current node.
 * The host supplies the trail (e.g., from the library `Trail`); this component only renders it.
 */
export const GraphBreadcrumbs = (props: GraphBreadcrumbsProps) => {
    const i18n = props.i18n ?? {
        t: (k: string) => k,
        plural: (k: string, _c: number, p?: Record<string, string>) =>
            p ? k.replace(/\{(\w+)\}/g, (_m, key) => p[key] ?? '') : k,
    };
    const ariaLabel = props.ariaLabel ?? i18n.t('ui.sessionGraph.breadcrumbs.label');

    return (
        <Show when={props.crumbs.length > 0}>
            <nav
                data-component="spacegraph-breadcrumbs"
                data-slot="graph-breadcrumbs"
                aria-label={ariaLabel}
                class="flex items-center gap-1 overflow-x-auto border-b border-border-weaker-base px-3 py-1 no-scrollbar"
            >
                <For each={props.crumbs}>
                    {(node, index) => (
                        <>
                            <Show when={index() > 0}>
                                <span class="text-12-regular text-text-weaker" aria-hidden="true">
                                    /
                                </span>
                            </Show>
                            <button
                                type="button"
                                class="shrink-0 rounded-sm px-1 text-12-regular text-text-weak hover:text-text-strong"
                                aria-current={
                                    index() === props.crumbs.length - 1 ? 'location' : undefined
                                }
                                onClick={() => props.onSelect(node.id)}
                            >
                                <span class="truncate">{node.label}</span>
                            </button>
                        </>
                    )}
                </For>
            </nav>
        </Show>
    );
};
