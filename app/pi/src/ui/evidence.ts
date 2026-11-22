/** Machine-filled ADR 0008 scaffolding. Human verdicts are never produced here. */
import { UI_PRESETS, type UIPreset } from './presets';

export interface UIComparisonDecision {
    readonly id: string;
    readonly status: string;
    readonly incumbent: string;
    readonly variant: string;
    readonly data: string;
    readonly gates: readonly string[];
    readonly images: string;
    readonly decision: string;
}

export interface UIComparison {
    readonly recorded: string;
    readonly rule: string;
    readonly decisions: readonly UIComparisonDecision[];
}

export const uiComparison = (
    presets: readonly UIPreset[] = UI_PRESETS,
    recorded: string = new Date().toISOString().slice(0, 10),
): UIComparison => ({
    recorded,
    rule: 'ADR 0008 — a default visual change needs incumbent/variant evidence and a logged human decision',
    decisions: presets
        .filter((entry) => entry.id !== 'full')
        .map((entry) => ({
            id: `ui-preset-${entry.id}`,
            status: 'experiment; default not flipped',
            incumbent: 'full — shipped knobs and full chrome (?ui=full)',
            variant: `${entry.title} (?ui=${entry.id}, chrome ${entry.chrome ?? 'full'})`,
            data: 'docs/screenshots/ui-presets/comparison.json',
            gates: entry.gates,
            images: `pending — capture ?shot=ui-${entry.id}&ui=full and ?shot=ui-${entry.id}&ui=${entry.id}`,
            decision: 'pending human review; ADR 0008 default gate not closed',
        })),
});
