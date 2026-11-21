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
import type { ExperimentCell, PolicyExperiment, SampledExperiment } from './experiments';
import type { PolicyVector } from './schema';

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
