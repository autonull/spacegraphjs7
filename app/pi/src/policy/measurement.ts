// Offline measurement tier. Replays one recorded session under every sampled policy cell, scores it
// with the same neutral scorer, and records a shortlist plus the verbatim comparison. Nothing is
// auto-promoted: the report carries the decision rule and a pending human decision.

import {
    replaySession,
    type ErgonomicScore,
    type EventScorer,
    type ReplayStrategy,
    type SessionRecording,
} from '../recorder';
import { adaptiveInsets } from './adaptive-fit';
import { denseType } from './density';
import type { ExperimentCell, PolicyExperiment, SampledExperiment } from './experiments';
import { labelFontPx } from './host';
import type { PolicyVector } from './schema';

/** Visual presence is an offline projection of solved positions, not a pixel snapshot. */
export interface PresenceNode {
    readonly id: string;
    readonly kind: string;
    readonly label: string;
}

export interface PresenceInput {
    readonly id: string;
    readonly nodes: readonly PresenceNode[];
    readonly positions: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
    readonly viewport: { readonly width: number; readonly height: number };
    readonly values: PolicyVector;
    readonly sizeOf: (kind: string, dense: boolean) => readonly [number, number];
    readonly octave?: number;
    readonly padding?: number;
}

export interface PresenceSample {
    readonly id: string;
    readonly octave: number;
    /** Sum of clipped projected card areas divided by viewport area. */
    readonly occupancy: number;
    /** Fraction of nodes whose projected label reaches the policy label floor. */
    readonly labelCoverage: number;
    readonly nodes: number;
}

export interface PresenceReport {
    readonly version: 1;
    readonly method: string;
    readonly samples: readonly PresenceSample[];
}

const round = (value: number): number => Number(value.toFixed(4));

export const measurePresence = (input: PresenceInput): PresenceSample => {
    const octave = input.octave ?? 0;
    const padding = input.padding ?? 40;
    const minPx = Number(input.values['ladder.minLabelPx']);
    const insets = adaptiveInsets(input.viewport.width, input.viewport.height, padding);
    const usableWidth = input.viewport.width - insets.left - insets.right;
    const usableHeight = input.viewport.height - insets.top - insets.bottom;
    const empty = { id: input.id, octave, occupancy: 0, labelCoverage: 0, nodes: 0 };
    if (usableWidth <= 0 || usableHeight <= 0) return empty;

    const dense = denseType(input.values);
    const placed = input.nodes.flatMap((node) => {
        const position = input.positions.get(node.id);
        if (!position) return [];
        const [width, height] = input.sizeOf(node.kind, dense);
        return [{ node, position, width, height }];
    });
    if (placed.length === 0) return empty;

    const left = Math.min(...placed.map((entry) => entry.position.x - entry.width / 2));
    const right = Math.max(...placed.map((entry) => entry.position.x + entry.width / 2));
    const top = Math.max(...placed.map((entry) => entry.position.y + entry.height / 2));
    const bottom = Math.min(...placed.map((entry) => entry.position.y - entry.height / 2));
    const fit = Math.min(
        usableWidth / (right - left + 2 * padding),
        usableHeight / (top - bottom + 2 * padding),
    );
    const pixelsPerWorld = fit * 2 ** octave;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const screenX = insets.left + usableWidth / 2;
    const screenY = insets.top + usableHeight / 2;

    let area = 0;
    let legible = 0;
    for (const entry of placed) {
        const x = screenX + (entry.position.x - centerX) * pixelsPerWorld;
        const y = screenY - (entry.position.y - centerY) * pixelsPerWorld;
        const halfWidth = (entry.width * pixelsPerWorld) / 2;
        const halfHeight = (entry.height * pixelsPerWorld) / 2;
        const clippedWidth =
            Math.min(input.viewport.width, x + halfWidth) - Math.max(0, x - halfWidth);
        const clippedHeight =
            Math.min(input.viewport.height, y + halfHeight) - Math.max(0, y - halfHeight);
        if (clippedWidth > 0 && clippedHeight > 0) area += clippedWidth * clippedHeight;
        const labelPx =
            labelFontPx(minPx, pixelsPerWorld, entry.width, entry.node.label.length) *
            pixelsPerWorld;
        if (labelPx >= minPx - 0.001) legible += 1;
    }

    return {
        id: input.id,
        octave,
        occupancy: round(area / (input.viewport.width * input.viewport.height)),
        labelCoverage: round(legible / placed.length),
        nodes: placed.length,
    };
};

const SCORE_KEYS = ['success', 'legibility', 'wrongTurns', 'travel'] as const;

export interface CellMeasurement {
    readonly cell: ExperimentCell;
    readonly score: ErgonomicScore;
    readonly deltas: Readonly<Record<keyof ErgonomicScore, number>>;
    readonly shortlisted: boolean;
    /** Negative results are published verbatim, never silently dropped. */
    readonly reasons: readonly string[];
}

export interface DecisionRecord {
    readonly cellID: string;
    readonly decision: 'graduate' | 'keep-incumbent' | 'inconclusive';
    readonly note: string;
}

export interface ExperimentMeasurement {
    readonly version: 1;
    readonly experiment: PolicyExperiment;
    readonly seed: number;
    readonly incumbent: ErgonomicScore;
    readonly cells: readonly CellMeasurement[];
    readonly shortlist: readonly string[];
    readonly decisionRule: string;
    readonly humanDecision: DecisionRecord | undefined;
}

const deltas = (score: ErgonomicScore, incumbent: ErgonomicScore): ErgonomicScore =>
    SCORE_KEYS.reduce(
        (result, key) => ({ ...result, [key]: score[key] - incumbent[key] }),
        {} as ErgonomicScore,
    );

/** A cell shortlists when it is no worse on any guardrail and strictly better on one measure. */
const evaluate = (
    cell: ExperimentCell,
    score: ErgonomicScore,
    incumbent: ErgonomicScore,
): CellMeasurement => {
    const delta = deltas(score, incumbent);
    const reasons: string[] = [];
    if (delta.success < 0) reasons.push('task success regressed');
    if (delta.wrongTurns > 0) reasons.push('wrong turns increased');
    if (delta.travel > 0) reasons.push('navigation travel increased');
    if (delta.legibility < -0.1) reasons.push('legibility regressed beyond tolerance');
    const improved = SCORE_KEYS.some((key) =>
        key === 'success' || key === 'legibility' ? delta[key] > 0 : delta[key] < 0,
    );
    if (!reasons.length && !improved) reasons.push('no measure improved');
    return { cell, score, deltas: delta, shortlisted: reasons.length === 0, reasons };
};

export const measureExperiment = (
    sampled: SampledExperiment,
    recording: SessionRecording,
    scorer: EventScorer,
    incumbentVector: PolicyVector,
    replay: ReplayStrategy = replaySession,
): ExperimentMeasurement => {
    const incumbent = replay(recording, incumbentVector, scorer);
    const cells = sampled.cells.map((cell) =>
        evaluate(cell, replay(recording, cell.vector, scorer), incumbent),
    );
    return {
        version: 1,
        experiment: sampled.experiment,
        seed: sampled.experiment.seed,
        incumbent,
        cells,
        shortlist: cells.filter((cell) => cell.shortlisted).map((cell) => cell.cell.id),
        decisionRule: sampled.experiment.decisionRule,
        humanDecision: undefined,
    };
};

/** Attaches the human decision. The system proposes; only this record can promote a variant. */
export const recordDecision = (
    measurement: ExperimentMeasurement,
    cellID: string,
    decision: DecisionRecord['decision'],
    note: string,
): ExperimentMeasurement => ({
    ...measurement,
    humanDecision: { cellID, decision, note },
});

export interface OnlineOutcomes {
    readonly version: 1;
    readonly fixture: string;
    readonly exposures: readonly { readonly cell: string; readonly atMs: number }[];
    readonly outcomes: readonly {
        readonly kind: 'answer' | 'wrong-turn';
        readonly atMs: number;
        readonly success: number;
    }[];
    readonly counts: Readonly<Record<string, number>>;
}

/** Online tier export: cell exposure and outcomes only — no prompt text, targets or raw metadata. */
export const exportOnlineOutcomes = (recording: SessionRecording): OnlineOutcomes => {
    const exposures = recording.events
        .filter((event) => event.kind === 'experiment:exposure')
        .map((event) => ({ cell: String(event.meta.cell ?? ''), atMs: event.atMs }));
    const outcomes = recording.events
        .filter((event) => event.kind === 'answer' || event.kind === 'wrong-turn')
        .map((event) => ({
            kind: event.kind as 'answer' | 'wrong-turn',
            atMs: event.atMs,
            success: event.kind === 'answer' ? 1 : 0,
        }));
    const answers = outcomes.filter((outcome) => outcome.success).length;
    const counts = exposures.reduce<Record<string, number>>(
        (result, exposure) => ({ ...result, [exposure.cell]: (result[exposure.cell] ?? 0) + 1 }),
        { answers, wrongTurns: outcomes.length - answers },
    );
    return { version: 1, fixture: recording.fixture, exposures, outcomes, counts };
};

const cellLine = (cell: CellMeasurement): string =>
    `| ${cell.cell.id} | ${cell.cell.policy} | ${cell.deltas.success.toFixed(3)} | ` +
    `${cell.deltas.wrongTurns.toFixed(3)} | ${cell.deltas.travel.toFixed(3)} | ` +
    `${cell.deltas.legibility.toFixed(3)} | ${cell.shortlisted ? 'shortlisted' : cell.reasons.join('; ')} |`;

/** Portable, self-contained report artifact: reproducible from its experiment + recording export. */
export const experimentReportMarkdown = (measurement: ExperimentMeasurement): string =>
    [
        `# ${measurement.experiment.title}`,
        '',
        `Experiment \`${measurement.experiment.id}\` · seed ${measurement.seed} · ${measurement.cells.length} cells`,
        '',
        measurement.decisionRule,
        '',
        `Shortlist: ${measurement.shortlist.join(', ') || 'none'}`,
        '',
        '| Cell | Policy | Δ success | Δ wrong turns | Δ travel | Δ legibility | Outcome |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        ...measurement.cells.map(cellLine),
        '',
        `Human decision: ${measurement.humanDecision ? `${measurement.humanDecision.cellID} · ${measurement.humanDecision.decision} · ${measurement.humanDecision.note}` : 'pending'}`,
        '',
    ].join('\n');
