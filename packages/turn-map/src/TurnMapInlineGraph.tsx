import type { RenderTheme } from '@spacegraphjs/renderer';
import { InlineGraph } from '@spacegraphjs/svg-renderer';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { GraphViewData } from '@spacegraphjs/shared/types';
import { createEffect, createMemo, onCleanup, onMount, type JSX } from 'solid-js';
import { buildTurnRenderModel } from './turnMap';

export type TurnMapInlineGraphProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The graph model. */
    model: GraphViewData;
    /** The turn to summarize. */
    turnID: string;
    /** Partial theme override for the static SVG; the library fills the rest from its own defaults. */
    theme?: Partial<RenderTheme>;
    /** Maximum nodes shown, including the turn itself. */
    limit?: number;
    /** Width of the inline graph. */
    width?: number;
    /** Height of the inline graph. */
    height?: number;
    /** Accessible name; defaults to the localized label. */
    ariaLabel?: string;
};

/**
 * The generic inline subgraph: a thin, non-interactive wrapper over the library
 * `@spacegraphjs/svg-renderer` `InlineGraph`. It adds no graph logic of its own, is theme-aware, and
 * renders a turn-scoped execution subset as static SVG, so it can sit inside the log without pan or
 * zoom. The whole-frame rebuild on `theme`/size change is a host remount concern; only the model
 * updates in place.
 */
export const TurnMapInlineGraph = (props: TurnMapInlineGraphProps): JSX.Element => {
    const { i18n, model, turnID, theme, limit, width, height, ariaLabel } = props;
    let host!: HTMLDivElement;
    let graph: InlineGraph | undefined;

    const renderModel = createMemo(() =>
        buildTurnRenderModel(model, turnID, { limit: limit ?? 5 }),
    );

    onMount(() => {
        graph = new InlineGraph(host, { theme, width, height });
        graph.setModel(renderModel());
    });

    createEffect(() => graph?.setModel(renderModel()));

    onCleanup(() => {
        graph?.dispose();
        graph = undefined;
    });

    return (
        <div
            ref={host}
            data-slot="graph-turn-inline"
            role="img"
            aria-label={ariaLabel ?? i18n.t('ui.sessionGraph.inline.label')}
        />
    );
};
