import {
    STOP_RULE,
    STUDY_ARRANGEMENTS,
    STUDY_DEPTHS,
    STUDY_TASKS,
    StudyRecorder,
    counterbalance,
    studyMatrix,
    studyReport,
    type StudyArrangement,
    type StudyDepth,
    type StudySurface,
} from './study';

interface PiHooks {
    readonly ready: boolean;
    loadFixture(): number;
    setSurface(surface: StudySurface): void;
    setArrangement(arrangement: StudyArrangement): void;
    setDepth(depth: StudyDepth): void;
    reveal(id: string): void;
}

interface Frame {
    readonly hooks: PiHooks;
    readonly surface: StudySurface;
}

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const frame = element<HTMLIFrameElement>('app');
const status = element<HTMLDivElement>('status');
const question = element<HTMLDivElement>('question');
const reportElement = element<HTMLPreElement>('report');

let assignments: readonly { taskID: string; surface: StudySurface }[] = [];
let index = 0;
let recorder: StudyRecorder | undefined;
let startedAt = 0;
let matrix = studyMatrix();

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
    question.textContent = `${index + 1}/${assignments.length} · ${next.surface.toUpperCase()} · ${task.question}`;
    startedAt = performance.now();
};

const begin = async (): Promise<void> => {
    const participant = Number(element<HTMLInputElement>('participant').value) || 1;
    const graph = await hooks();
    (window as Window & { __studyHooks?: PiHooks }).__studyHooks = graph;
    graph.loadFixture();
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
    status.textContent = `Participant ${participant}. ${STOP_RULE}`;
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
            __study: { trials: recorder.trials, assignments, matrix, report },
        });
    }
};

element<HTMLButtonElement>('start').addEventListener('click', () => void begin());
element<HTMLButtonElement>('submit').addEventListener('click', submit);
