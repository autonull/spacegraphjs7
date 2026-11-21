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

const group = (title: string, children: readonly HTMLElement[]): HTMLElement => {
    const details = document.createElement('details');
    details.open = true;
    const summary = document.createElement('summary');
    summary.textContent = `${title} (${children.length})`;
    details.append(summary, ...children);
    return details;
};

/** Capabilities stay in `#gallery`; presets and experiments launch from `#catalog`. */
export const mountCatalog = (container: HTMLElement, catalog: Catalog): void => {
    const experiments = catalog.experiments.map((experiment) => {
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = experiment.title;
        const rule = document.createElement('p');
        rule.className = 'catalog-note';
        rule.textContent = experiment.rule;
        details.append(summary, rule, ...experiment.cells.map((cell) => link(cell, 'cell')));
        return details;
    });
    container.replaceChildren(
        group(
            'Presets · what each explores',
            catalog.presets.map((preset) => link(preset, 'preset')),
        ),
        group('Experiments · launchable cells', experiments),
    );
};
