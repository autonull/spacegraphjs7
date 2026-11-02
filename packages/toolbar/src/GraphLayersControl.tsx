/**
 * GraphLayersControl - Controls for level, facets (lens), and depth.
 */

import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import { createPopoverRenderer, type PopoverComponent } from '@spacegraphjs/shared/popover';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { RendererCapabilities } from '@spacegraphjs/renderer';
import type {
    GraphViewData,
    GraphFacets,
    FacetCounts,
    ZoomLevel,
    DepthMode,
} from '@spacegraphjs/shared/types';
import { ToolbarMenu } from './ToolbarMenu';
import {
    DEPTH_MODES,
    supportsDepth,
    ZOOM_LEVELS,
    DOMAINS,
    NODE_KINDS,
    NODE_STATUSES,
    PROFILE_PRESETS,
    VOCABULARY_KEYS,
} from '@spacegraphjs/shared/types';

export interface GraphLayersControlProps {
    capabilities?: RendererCapabilities;
    renderer?: string;
    level?: ZoomLevel;
    onLevel?: (level: ZoomLevel) => void;
    facets?: GraphFacets;
    facetCounts?: FacetCounts;
    onFacetsChange?: (facets: GraphFacets) => void;
    depth?: DepthMode;
    onDepth?: (depth: DepthMode) => void;
    depthModes?: readonly DepthMode[];
    model?: GraphViewData;
    i18n: I18n;
    Icon?: IconComponent;
    Popover?: PopoverComponent;
}

export function GraphLayersControl(props: GraphLayersControlProps): JSX.Element {
    const { i18n, Icon, Popover, ...rest } = props;
    const renderIcon = Icon ?? createIconRenderer();
    const PopoverComponent = Popover ?? createPopoverRenderer();

    const facets = () => rest.facets;
    const presetStatuses = (preset: (typeof PROFILE_PRESETS)[number]) =>
        'statuses' in preset ? preset.statuses : undefined;
    const activeProfile = () =>
        PROFILE_PRESETS.find((preset) => {
            const statuses = presetStatuses(preset) ?? [];
            return (
                preset.domains.length === (facets()?.domains.size ?? 0) &&
                preset.domains.every((domain) => facets()?.domains.has(domain)) &&
                statuses.length === (facets()?.statuses.size ?? 0) &&
                statuses.every((status) => facets()?.statuses.has(status))
            );
        })?.id;
    const changeFacets = (next: Partial<GraphFacets>) => {
        const current = facets();
        if (!current) return;
        rest.onFacetsChange?.({
            query: next.query ?? current.query,
            kinds: next.kinds ?? current.kinds,
            statuses: next.statuses ?? current.statuses,
            domains: next.domains ?? current.domains,
        });
    };
    const toggleDomain = (domain: string) => {
        const current = new Set(facets()?.domains ?? []);
        if (current.has(domain)) {
            if (domain === 'session') return;
            current.delete(domain);
        } else {
            current.add(domain);
        }
        changeFacets({ domains: current });
    };
    const toggleKind = (kind: string) => {
        const current = new Set(facets()?.kinds ?? []);
        if (current.has(kind)) current.delete(kind);
        else current.add(kind);
        changeFacets({ kinds: current });
    };
    const toggleStatus = (status: string) => {
        const current = new Set(facets()?.statuses ?? []);
        if (current.has(status)) current.delete(status);
        else current.add(status);
        changeFacets({ statuses: current });
    };
    const countOf = (
        value: string,
        counts: readonly { value: string; kept: number; total: number }[],
    ) => counts.find((entry) => entry.value === value);
    const countLabel = (
        value: string,
        counts: readonly { value: string; kept: number; total: number }[],
    ) => {
        const count = countOf(value, counts);
        return count
            ? i18n.t('ui.toolbar.facets.count', {
                  kept: String(count.kept),
                  total: String(count.total),
              })
            : undefined;
    };
    const applyPreset = (preset: (typeof PROFILE_PRESETS)[number]) =>
        changeFacets({
            domains: new Set(preset.domains),
            statuses: new Set(presetStatuses(preset) ?? []),
        });
    const depthAvailable = (depth: DepthMode) =>
        !rest.capabilities || supportsDepth(rest.capabilities, depth);
    const depthReason = (depth: DepthMode) =>
        depthAvailable(depth)
            ? undefined
            : i18n.t('ui.toolbar.capability.depthUnavailable', {
                  depth: i18n.t(VOCABULARY_KEYS.depth[depth]),
                  renderer: rest.renderer ?? '',
              });

    const option = (input: {
        label: string;
        onClick: () => void;
        pressed?: boolean;
        disabled?: boolean;
        title?: string;
        slot?: string;
        value?: string;
        ariaLabel?: string;
        keepOpen?: boolean;
    }) => (
        <button
            type="button"
            data-slot={input.slot}
            data-value={input.value}
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover disabled:opacity-50"
            aria-pressed={input.pressed}
            aria-label={input.ariaLabel ?? input.label}
            disabled={input.disabled}
            title={input.title}
            onClick={(event) => {
                if (!input.keepOpen) {
                    const menu = event.currentTarget.closest('details');
                    if (menu) menu.open = false;
                }
                input.onClick();
            }}
        >
            {input.label}
        </button>
    );

    const levelControl = () => (
        <Show when={rest.onLevel}>
            <div
                data-slot="graph-layers-level"
                onClick={(event) => {
                    const menu = event.currentTarget.closest('details');
                    if (menu) menu.open = false;
                }}
            >
                <div
                    class="flex items-center gap-1"
                    role="group"
                    aria-label={i18n.t('ui.toolbar.level')}
                >
                    {ZOOM_LEVELS.map((level) => (
                        <button
                            type="button"
                            class={`rounded-sm px-2 py-1 text-12-regular transition-colors ${rest.level === level ? 'bg-primary-weaker text-primary-base' : 'text-text-base hover:bg-surface-base-hover'}`}
                            aria-pressed={rest.level === level}
                            onClick={() => rest.onLevel?.(level)}
                        >
                            {i18n.t(VOCABULARY_KEYS.level[level])}
                        </button>
                    ))}
                </div>
            </div>
        </Show>
    );

    const lensControl = () => (
        <Show when={rest.onFacetsChange}>
            <div data-slot="graph-lens" class="flex w-full flex-col gap-1">
                <div class="px-2 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                    {i18n.t('ui.toolbar.lens')}
                </div>
                <div class="flex flex-wrap gap-1 px-1">
                    {PROFILE_PRESETS.map((preset) =>
                        option({
                            label: i18n.t(preset.labelKey),
                            onClick: () => applyPreset(preset),
                            pressed: activeProfile() === preset.id,
                            slot: 'graph-lens-preset',
                            value: preset.id,
                            keepOpen: true,
                        }),
                    )}
                </div>
                <div class="flex flex-col">
                    {DOMAINS.map((domain) =>
                        option({
                            label: i18n.t(VOCABULARY_KEYS.domain[domain]),
                            onClick: () => toggleDomain(domain),
                            pressed: facets()?.domains.has(domain),
                            disabled: domain === 'session',
                            slot: 'graph-domain-option',
                            value: domain,
                            keepOpen: true,
                        }),
                    )}
                </div>
                <Show when={rest.facetCounts}>
                    {(counts) => (
                        <div
                            data-slot="graph-facet-domain-counts"
                            class="flex flex-col px-2 py-1 text-11-regular text-text-weaker"
                        >
                            {DOMAINS.map((domain) => {
                                const count = countOf(domain, counts().domains);
                                return (
                                    <span data-domain={domain}>
                                        {i18n.t(VOCABULARY_KEYS.domain[domain])} ·{' '}
                                        {count ? `${count.kept}/${count.total}` : '0/0'}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </Show>
            </div>
        </Show>
    );

    const depthControl = () => (
        <Show when={rest.onDepth}>
            <label class="flex items-center gap-1 text-12-regular text-text-weak">
                <span>{i18n.t('ui.toolbar.depth')}</span>
                <select
                    data-slot="graph-layers-depth"
                    class="h-6 rounded-sm border border-border-weaker-base bg-surface-base px-1 text-12-regular text-text-base"
                    aria-label={i18n.t('ui.toolbar.depth')}
                    value={rest.depth}
                    onChange={(event) => rest.onDepth?.(event.currentTarget.value as DepthMode)}
                >
                    {(rest.depthModes ?? DEPTH_MODES).map((depth) => (
                        <option
                            value={depth}
                            disabled={!depthAvailable(depth)}
                            title={depthReason(depth)}
                        >
                            {i18n.t(VOCABULARY_KEYS.depth[depth])}
                        </option>
                    ))}
                </select>
            </label>
        </Show>
    );

    const layersControl = () => (
        <Show when={rest.onLevel || rest.onFacetsChange || rest.onDepth}>
            <ToolbarMenu
                slot="graph-toolbar-layers"
                label={i18n.t('ui.toolbar.layers.title')}
                icon="outline-eye"
                align="start"
                value={
                    rest.onLevel
                        ? i18n.t(VOCABULARY_KEYS.level[rest.level ?? 'execution'])
                        : undefined
                }
                valueSlot="graph-layers-level-name"
                Popover={PopoverComponent}
            >
                {levelControl()}
                {lensControl()}
                {depthControl()}
            </ToolbarMenu>
        </Show>
    );

    const facetsControl = () => (
        <Show when={rest.onFacetsChange}>
            <ToolbarMenu
                slot="graph-toolbar-facets"
                label={i18n.t('ui.toolbar.facets.title')}
                icon="outline-sliders"
                align="start"
                value={i18n.t('ui.toolbar.facets.title')}
                valueSlot="graph-facets-name"
                Popover={PopoverComponent}
            >
                <div class="flex w-72 flex-col gap-2">
                    <input
                        data-slot="graph-facet-query"
                        value={facets()?.query ?? ''}
                        class="h-6 w-full rounded-sm border border-border-weaker-base bg-surface-base px-2 text-12-regular text-text-base outline-none placeholder:text-text-weaker"
                        placeholder={i18n.t('ui.toolbar.facets.placeholder')}
                        aria-label={i18n.t('ui.toolbar.facets.placeholder')}
                        onInput={(event) => changeFacets({ query: event.currentTarget.value })}
                    />
                    <div class="flex max-h-72 flex-col gap-2 overflow-y-auto">
                        <div data-slot="graph-facet-kinds" class="flex flex-col">
                            <div class="px-1 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                                {i18n.t('ui.toolbar.facets.kinds')}
                            </div>
                            {NODE_KINDS.map((kind) =>
                                option({
                                    label: `${i18n.t(VOCABULARY_KEYS.kind[kind])} · ${countLabel(kind, rest.facetCounts?.kinds ?? []) ?? '0/0'}`,
                                    onClick: () => toggleKind(kind),
                                    pressed: facets()?.kinds.has(kind),
                                    slot: 'graph-facet-kind',
                                    value: kind,
                                    keepOpen: true,
                                    ariaLabel: i18n.t(VOCABULARY_KEYS.kind[kind]),
                                }),
                            )}
                        </div>
                        <div data-slot="graph-facet-statuses" class="flex flex-col">
                            <div class="px-1 py-1 text-11-medium uppercase tracking-wide text-text-weak">
                                {i18n.t('ui.toolbar.facets.statuses')}
                            </div>
                            {NODE_STATUSES.map((status) =>
                                option({
                                    label: `${i18n.t(VOCABULARY_KEYS.status[status])} · ${countLabel(status, rest.facetCounts?.statuses ?? []) ?? '0/0'}`,
                                    onClick: () => toggleStatus(status),
                                    pressed: facets()?.statuses.has(status),
                                    slot: 'graph-facet-status',
                                    value: status,
                                    keepOpen: true,
                                    ariaLabel: i18n.t(VOCABULARY_KEYS.status[status]),
                                }),
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        data-slot="graph-facet-clear"
                        class="rounded-sm px-2 py-1 text-start text-12-regular text-text-base hover:bg-surface-base-hover"
                        onClick={() =>
                            changeFacets({ query: '', kinds: new Set(), statuses: new Set() })
                        }
                    >
                        {i18n.t('ui.toolbar.facets.clear')}
                    </button>
                </div>
            </ToolbarMenu>
        </Show>
    );

    return (
        <>
            {layersControl()}
            {facetsControl()}
        </>
    );
}
