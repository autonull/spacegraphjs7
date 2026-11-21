import { POLICY_EXPERIMENTS, POLICY_PRESETS, sampleExperiment, type PolicySchema } from './policy';

export interface CatalogEntry {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly title: string;
}

export interface CatalogExperiment {
    readonly id: string;
    readonly title: string;
    readonly rule: string;
    readonly cells: readonly CatalogEntry[];
}

export interface Catalog {
    readonly presets: readonly CatalogEntry[];
    readonly experiments: readonly CatalogExperiment[];
}

/** Presets and sampled cells are launchable alternatives; the question is shown, never a recommendation. */
export const buildCatalog = (schema: PolicySchema): Catalog => ({
    presets: POLICY_PRESETS.map((preset) => ({
        id: preset.id,
        label: preset.title,
        href: `?preset=${encodeURIComponent(preset.id)}`,
        title: preset.question,
    })),
    experiments: POLICY_EXPERIMENTS.map((experiment) => ({
        id: experiment.id,
        title: experiment.title,
        rule: experiment.decisionRule,
        cells: sampleExperiment(schema, experiment).cells.map((cell) => ({
            id: cell.id,
            label: cell.id,
            href: `?policy=${encodeURIComponent(cell.policy)}`,
            title: `Launch ${experiment.id}: ${cell.id}`,
        })),
    })),
});

const link = (entry: CatalogEntry, dataKey: 'preset' | 'cell'): HTMLAnchorElement => {
    const anchor = document.createElement('a');
    anchor.href = entry.href;
    anchor.textContent = entry.label;
    anchor.title = entry.title;
    anchor.dataset[dataKey] = entry.id;
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
    const note = document.createElement('span');
    note.className = 'catalog-note';
    note.textContent = question;
    summary.append(heading, note);
    details.append(summary, ...children);
    return details;
};

/** Capabilities stay in `#gallery`; presets and experiments launch from `#catalog`. */
export const mountCatalog = (container: HTMLElement, catalog: Catalog): void => {
    const presets = catalog.presets.map((preset) =>
        card(preset.label, preset.title, [link(preset, 'preset')], 'preset'),
    );
    const experiments = catalog.experiments.map((experiment) =>
        card(
            experiment.title,
            experiment.rule,
            experiment.cells.map((cell) => link(cell, 'cell')),
            'experiment',
        ),
    );
    container.replaceChildren(...presets, ...experiments);
};
