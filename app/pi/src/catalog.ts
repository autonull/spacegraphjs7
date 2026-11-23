import { catalogEntries, type CatalogEntry } from 'spacegraphjs/experiments';
import { POLICY_EXPERIMENTS, POLICY_PRESETS, sampleExperiment, type PolicySchema } from './policy';
import { STUDY_TASKS } from './study';

export type { CatalogEntry };

export interface CatalogExperiment {
    readonly id: string;
    readonly title: string;
    readonly rule: string;
    readonly cells: readonly CatalogEntry[];
}

export interface Catalog {
    readonly presets: readonly CatalogEntry[];
    readonly experiments: readonly CatalogExperiment[];
    readonly questions: readonly CatalogEntry[];
}

/** Presets and sampled cells are launchable alternatives; the question is shown, never a recommendation. */
export const buildCatalog = (schema: PolicySchema): Catalog => ({
    presets: catalogEntries(
        POLICY_PRESETS.map((preset) => ({
            id: preset.id,
            label: preset.title,
            title: preset.question,
        })),
        (id) => `?preset=${encodeURIComponent(id)}`,
    ),
    experiments: POLICY_EXPERIMENTS.map((experiment) => ({
        id: experiment.id,
        title: experiment.title,
        rule: experiment.decisionRule,
        cells: catalogEntries(
            sampleExperiment(schema, experiment).cells.map((cell) => ({
                id: cell.id,
                label: cell.id,
                policy: cell.policy,
            })),
            (_id, cell) => `?policy=${encodeURIComponent(cell.policy)}`,
            (id) => `Launch ${experiment.id}: ${id}`,
        ),
    })),
    questions: catalogEntries(
        STUDY_TASKS.map((task) => ({ id: task.id, label: task.question })),
        (id) => `#question-${id}`,
        (id) => `Open the evidence for ${id}`,
    ),
});

const link = (entry: CatalogEntry, dataKey: 'preset' | 'cell' | 'question'): HTMLAnchorElement => {
    const anchor = document.createElement('a');
    anchor.href = entry.href;
    anchor.textContent = entry.label;
    anchor.title = entry.title;
    anchor.dataset[dataKey] = entry.id;
    if (dataKey === 'question') anchor.id = entry.href.slice(1);
    return anchor;
};

const card = (title: string, question: string, children: readonly HTMLElement[], kind: string): HTMLElement => {
    const details = document.createElement('details');
    details.className = 'catalog-card';
    details.dataset.card = kind;
    const summary = document.createElement('summary');
    const heading = document.createElement('span');
    heading.className = 'catalog-card-title';
    heading.textContent = title;
    const note = document.createElement('p');
    note.className = 'catalog-note';
    note.textContent = question;
    summary.append(heading);
    details.append(summary, note, ...children);
    return details;
};

const group = (id: string, title: string, cards: readonly HTMLElement[]): HTMLElement => {
    const section = document.createElement('section');
    section.className = 'catalog-group';
    section.dataset.group = id;
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading, ...cards);
    return section;
};

/** Capabilities stay in `#gallery`; the three catalog groups launch or open evidence from `#catalog`. */
export const mountCatalog = (container: HTMLElement, catalog: Catalog): void => {
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'catalog-search';
    search.placeholder = 'Filter catalog';
    search.setAttribute('aria-label', 'Filter catalog');

    const sections = [
        group('presets', 'Presets', catalog.presets.map((preset) =>
            card(preset.label, preset.title, [link(preset, 'preset')], 'preset'))),
        group('experiments', 'View experiments', catalog.experiments.map((experiment) =>
            card(experiment.title, experiment.rule, experiment.cells.map((cell) => link(cell, 'cell')), 'experiment'))),
        group('questions', 'Study questions', catalog.questions.map((question) =>
            card(question.label, 'Open the evidence for this task.', [link(question, 'question')], 'question'))),
    ];
    container.replaceChildren(search, ...sections);

    const cards = sections.flatMap((section) => [...section.querySelectorAll<HTMLElement>('.catalog-card')]);
    search.addEventListener('input', () => {
        const term = search.value.trim().toLowerCase();
        for (const entry of cards) entry.hidden = !entry.textContent?.toLowerCase().includes(term);
    });
};
