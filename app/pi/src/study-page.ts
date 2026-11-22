import {
    STOP_RULE,
    STUDY_ARRANGEMENTS,
    STUDY_DEPTHS,
    STUDY_TASKS,
    StudyRecorder,
    counterbalance,
    studyGraphLayout,
    studyMatrix,
    studyReport,
    studyUI,
    type StudyArrangement,
    type StudyDepth,
    type StudySurface,
} from './study';
import type { GraphLayoutMode } from './graph-layout';

interface PiHooks {
    readonly ready: boolean;
    loadFixture(): number;
    setGraphLayout(mode: GraphLayoutMode): GraphLayoutMode;
    applyUIPreset(id: string): string | undefined;
    setSurface(surface: StudySurface): void;
    setArrangement(arrangement: StudyArrangement): void;
    setDepth(depth: StudyDepth): void;
    reveal(id: string): void;
}

interface Frame {
    readonly hooks: PiHooks;
    readonly taskID: string;
    readonly surface: StudySurface;
}

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const frame = element<HTMLIFrameElement>('app');
const status = element<HTMLDivElement>('status');
const question = element<HTMLDivElement>('question');
const reportElement = element<HTMLPreElement>('report');

let assignments: readonly { taskID: string; surface: StudySurface }[] = [];
let index = 0;
let practiceDone = false;
let recorder: StudyRecorder | undefined;
let startedAt = 0;
let matrix = studyMatrix();
let graphLayout: GraphLayoutMode | undefined;
let uiPreset: string | undefined;

const preparePractice = async (): Promise<void> => {
    const graph = await hooks();
    (window as Window & { __studyHooks?: PiHooks }).__studyHooks = graph;
    graph.loadFixture();
    status.textContent = 'Practice is untimed. Press Start after you have tried the controls.';
};

const hooks = async (): Promise<PiHooks> => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = (frame.contentWindow as (Window & { __pi?: PiHooks }) | null)?.__pi;
        if (candidate?.ready) return candidate;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('flagship graph did not become ready');
};

const current = (): Frame | undefined => {
    const assignment = assignments[index];
    return assignment
        ? {
              hooks: (window as Window & { __studyHooks?: PiHooks }).__studyHooks!,
              taskID: assignment.taskID,
              surface: assignment.surface,
          }
        : undefined;
};

const show = (): void => {
    const next = current();
    if (!next) {
        question.textContent = 'Run complete. Report below; export it for the study record.';
        return;
    }
    const task = STUDY_TASKS.find((entry) => entry.id === next.taskID)!;
    question.textContent =
        `${index + 1}/${assignments.length} · ${next.surface.toUpperCase()} · ` +
        `${(graphLayout ?? 'freeform').toUpperCase()} · UI ${uiPreset ?? 'full'} · ${task.question}`;
    startedAt = performance.now();
};

const begin = async (): Promise<void> => {
    const participant = Number(element<HTMLInputElement>('participant').value) || 1;
    const graph = await hooks();
    (window as Window & { __studyHooks?: PiHooks }).__studyHooks = graph;
    graph.loadFixture();
    graphLayout = studyGraphLayout(window.location.search);
    if (graphLayout) graph.setGraphLayout(graphLayout);
    uiPreset = studyUI(window.location.search);
    if (uiPreset) graph.applyUIPreset(uiPreset);
    recorder = new StudyRecorder(participant);
    matrix = studyMatrix();
    assignments = counterbalance(participant)
        .filter((assignment) => assignment.participant === participant)
        .map((assignment) => ({ taskID: assignment.taskID, surface: assignment.surface }));
    const depths = [...STUDY_DEPTHS];
    const arrangements = [...STUDY_ARRANGEMENTS];
    graph.setDepth(depths[(participant - 1) % depths.length]!);
    graph.setArrangement(arrangements[(participant - 1) % arrangements.length]!);
    index = 0;
    show();
    status.textContent = `Participant ${participant} · graph view ${graphLayout ?? 'freeform'} · UI ${uiPreset ?? 'full'}. ${STOP_RULE}`;
};

const submit = (): void => {
    const next = current();
    if (!next || !recorder) return;
    const task = STUDY_TASKS.find((entry) => entry.id === next.taskID)!;
    next.hooks.setSurface(next.surface);
    for (const id of task.answerIDs) next.hooks.reveal(id);
    recorder.record({
        participant: Number(element<HTMLInputElement>('participant').value) || 1,
        taskID: task.id,
        surface: next.surface,
        ui: uiPreset,
        success: element<HTMLSelectElement>('answer').value === 'yes',
        elapsedMs: performance.now() - startedAt,
        wrongTurns: Number(element<HTMLInputElement>('wrong').value) || 0,
        preference: Number(element<HTMLInputElement>('preference').value) || 3,
        quote: element<HTMLTextAreaElement>('quote').value,
    });
    index += 1;
    show();
    if (index >= assignments.length) {
        const report = studyReport(recorder.trials, matrix);
        reportElement.textContent = report;
        Object.assign(window, {
            __study: {
                trials: recorder.trials,
                assignments,
                matrix,
                graphLayout,
                ui: uiPreset,
                practiceCompleted: practiceDone,
                report,
            },
        });
    }
};

element<HTMLButtonElement>('practice-done').addEventListener('click', () => {
    practiceDone = true;
    element<HTMLButtonElement>('start').disabled = false;
    status.textContent = 'Practice complete. Trial 1 timing starts when you press Start.';
});
element<HTMLButtonElement>('start').addEventListener('click', () => {
    if (practiceDone) void begin();
});
element<HTMLButtonElement>('submit').addEventListener('click', submit);
void preparePractice();
