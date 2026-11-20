import {
    MetricsHarness,
    cartesianMatrix,
    reportMarkdown,
    templateById,
    type CaptureMatrix,
    type MetricEvent,
} from 'spacegraphjs/experiments';

export type StudySurface = 'log' | 'map' | 'hybrid';
export type StudyDepth = 'flat' | 'layered' | 'depth-stack' | 'orbit';
export type StudyArrangement = 'stacked' | 'side' | 'floating';

export const STUDY_SURFACES: readonly StudySurface[] = ['log', 'map', 'hybrid'];
export const STUDY_DEPTHS: readonly StudyDepth[] = ['flat', 'layered', 'depth-stack', 'orbit'];
export const STUDY_ARRANGEMENTS: readonly StudyArrangement[] = ['stacked', 'side', 'floating'];

export interface StudyTask {
    readonly id: string;
    readonly question: string;
    readonly expected: string;
    readonly answerIDs: readonly string[];
}

/** The five questions from the product claim, with pinned answers from the canonical fixture. */
export const STUDY_TASKS: readonly StudyTask[] = [
    {
        id: 'question-1',
        question: 'Why did the agent change src/auth/session.ts?',
        expected: 'The delegated edit step wrote the file after the failing test.',
        answerIDs: ['pi:local:subagent-fix', 'pi:local:delegate'],
    },
    {
        id: 'question-2',
        question: 'Which tool calls led to the failing test?',
        expected: 'The read of src/auth/session.ts preceded the failing test run.',
        answerIDs: ['pi:local:read-auth', 'pi:local:run-tests'],
    },
    {
        id: 'question-3',
        question: 'What did the subagent contribute?',
        expected: 'The delegated edit produced src/auth/session.ts.',
        answerIDs: ['pi:local:subagent-fix', 'pi:local:f-session'],
    },
    {
        id: 'question-4',
        question: 'Which changes were made after the failing test?',
        expected: 'src/auth/session.ts and test-report.md were written after the failure.',
        answerIDs: ['pi:local:f-session', 'pi:local:f-report'],
    },
    {
        id: 'question-5',
        question: 'Where did the agent retry or change direction?',
        expected: 'The direction change is recorded in turn two after the failing test.',
        answerIDs: ['pi:local:direction'],
    },
];

export const STOP_RULE =
    'Stop at n >= 5 counterbalanced participants; a negative result is a valid outcome.';

/** Deterministic capture matrix for the geometry axes the study compares. */
export function studyMatrix(): CaptureMatrix {
    return cartesianMatrix(
        [
            { id: 'surface', values: [...STUDY_SURFACES] },
            { id: 'depth', values: [...STUDY_DEPTHS] },
            { id: 'arrangement', values: [...STUDY_ARRANGEMENTS] },
        ],
        { seed: 7, maxCells: 18, pairWith: ['surface', 'depth'] },
    );
}

/** Latin-square rotation: each participant sees each surface once per task position. */
export interface StudyAssignment {
    readonly participant: number;
    readonly taskID: string;
    readonly surface: StudySurface;
    readonly position: number;
}

export function counterbalance(participants: number): readonly StudyAssignment[] {
    const count = Math.max(0, Math.floor(participants));
    return Array.from({ length: count }, (_, participant) =>
        STUDY_TASKS.map((task, position) => ({
            participant: participant + 1,
            taskID: task.id,
            surface: STUDY_SURFACES[(position + participant) % STUDY_SURFACES.length]!,
            position,
        })),
    ).flat();
}

export interface StudyTrial {
    readonly participant: number;
    readonly taskID: string;
    readonly surface: StudySurface;
    readonly success: boolean;
    readonly elapsedMs: number;
    readonly wrongTurns: number;
    readonly preference: number;
    readonly quote: string;
    readonly events: readonly MetricEvent[];
}

export interface TrialInput {
    readonly participant: number;
    readonly taskID: string;
    readonly surface: StudySurface;
    readonly success: boolean;
    readonly elapsedMs: number;
    readonly wrongTurns: number;
    readonly preference: number;
    readonly quote: string;
}

/** One host-agnostic recorder per participant; the surface is host policy, never a counter. */
export class StudyRecorder {
    readonly #harness = new MetricsHarness();
    readonly #participant: number;
    readonly #trials: StudyTrial[] = [];

    constructor(participant: number) {
        this.#participant = participant;
    }

    get trials(): readonly StudyTrial[] {
        return [...this.#trials];
    }

    mark(kind: string, meta?: MetricEvent['meta']): void {
        this.#harness.record({
            id: `${this.#participant}:${this.#harness.snapshot().total + 1}`,
            kind,
            at: Date.now(),
            meta,
        });
    }

    record(input: TrialInput): StudyTrial {
        this.#harness.record({
            id: `${this.#participant}:${input.taskID}`,
            kind: input.success ? 'answer' : 'wrong-turn',
            at: Date.now(),
            meta: { surface: input.surface, wrongTurns: input.wrongTurns },
        });
        const trial: StudyTrial = {
            ...input,
            participant: this.#participant,
            events: this.#harness.snapshot().events,
        };
        this.#trials.push(trial);
        return trial;
    }
}

const average = (values: readonly number[]): number =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function studyReport(trials: readonly StudyTrial[], matrix: CaptureMatrix): string {
    const bySurface = (surface: StudySurface) =>
        trials.filter((trial) => trial.surface === surface);
    const result = (surface: StudySurface) => {
        const rows = bySurface(surface);
        const success = average(rows.map((row) => (row.success ? 1 : 0)));
        const seconds = average(rows.map((row) => row.elapsedMs)) / 1000;
        const wrongTurns = average(rows.map((row) => row.wrongTurns));
        const preference = average(rows.map((row) => row.preference));
        return {
            name: `${surface}: ${rows.length} trials`,
            value: `${(success * 100).toFixed(0)}% success, ${seconds.toFixed(1)}s, ${wrongTurns.toFixed(1)} wrong turns, ${preference.toFixed(1)} preference`,
            negative:
                surface !== 'log' &&
                success < average(bySurface('log').map((row) => (row.success ? 1 : 0))),
        };
    };
    const participants = new Set(trials.map((trial) => trial.participant)).size;
    return reportMarkdown({
        title: 'Five-task spatial navigation study',
        matrix,
        template: templateById('task-study'),
        samplingNote: `n=${participants} counterbalanced participants; Latin-square surface rotation; local fixture only`,
        results: STUDY_SURFACES.map(result),
    });
}
