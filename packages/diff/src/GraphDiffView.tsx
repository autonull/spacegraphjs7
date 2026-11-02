import type { CodeDiff, CodeDiffSource, I18n } from '@spacegraphjs/shared';
import { For, Show, createEffect, createMemo } from 'solid-js';
import { diffTone, type DiffTone, TONE_CLASS } from './diff';

export type GraphDiffViewProps = {
    from: string;
    source?: CodeDiffSource;
    /** i18n functions for localized strings. */
    i18n?: I18n;
};

/**
 * The on-demand diff for one turn. Loads through the host source when a diff node is inspected
 * and renders each file's unified patch as selectable DOM text, so the change is readable in the panel
 * without pulling the transcript's diff renderer into the graph chunk.
 */
export const GraphDiffView = (props: GraphDiffViewProps) => {
    const i18n = props.i18n ?? {
        t: (k: string) => k,
        plural: (k: string, _c: number, p?: Record<string, string | number>) =>
            p ? k.replace(/\{(\w+)\}/g, (_m, key) => String(p[key] ?? '')) : k,
    };
    createEffect(() => {
        if (props.from) props.source?.load(props.from);
    });
    const diffs = createMemo(() => props.source?.get(props.from));

    return (
        <div class="mt-3" data-slot="graph-inspector-diff">
            <div class="text-12-regular text-text-weak">
                {i18n.t('ui.sessionGraph.inspector.diff')}
            </div>
            <Show
                when={diffs()}
                fallback={
                    <div class="mt-1 text-12-regular text-text-weaker">
                        {i18n.t('ui.sessionGraph.inspector.diffLoading')}
                    </div>
                }
            >
                {(list) => (
                    <For each={list()}>
                        {(diff) => (
                            <div class="mt-2" data-slot="graph-inspector-diff-file">
                                <div class="flex items-center gap-2">
                                    <span
                                        class="min-w-0 flex-1 truncate text-12-mono text-text-base"
                                        title={diff.file}
                                    >
                                        {diff.file}
                                    </span>
                                    <span class="text-12-regular text-text-on-success-base tabular-nums">
                                        +{diff.additions}
                                    </span>
                                    <span class="text-12-regular text-text-on-critical-base tabular-nums">
                                        -{diff.deletions}
                                    </span>
                                </div>
                                <pre class="mt-1 max-h-64 overflow-auto rounded-sm bg-background-weak p-2 text-12-mono">
                                    <For each={diff.patch.split('\n')}>
                                        {(line) => (
                                            <div class={TONE_CLASS[diffTone(line) as DiffTone]}>
                                                {line || ' '}
                                            </div>
                                        )}
                                    </For>
                                </pre>
                            </div>
                        )}
                    </For>
                )}
            </Show>
        </div>
    );
};
