import type { PolicySource, ResolvedPolicy } from './resolve';
import {
    POLICY_FAMILIES,
    type KnobValue,
    type PolicyKnob,
    type PolicySchema,
} from './schema';

export interface PanelControl {
    readonly knob: PolicyKnob;
    readonly value: KnobValue;
    readonly source: PolicySource;
}

export interface PanelFamily {
    readonly family: string;
    readonly controls: readonly PanelControl[];
}

/** A pure view of the schema: every knob, its current value, and who chose it. */
export const panelControls = (schema: PolicySchema, resolved: ResolvedPolicy): readonly PanelFamily[] =>
    POLICY_FAMILIES.map((family) => ({
        family,
        controls: schema.knobs
            .filter((knob) => knob.family === family)
            .map((knob) => ({ knob, value: resolved.values[knob.id], source: resolved.provenance[knob.id] })),
    })).filter((group) => group.controls.length > 0);

export interface PolicyPanelActions {
    readonly onChange: (id: string, value: KnobValue) => void;
    readonly onReset: (ids: readonly string[]) => void;
    readonly onCopy: () => void;
}

export interface PolicyPanel {
    readonly element: HTMLElement;
    update(resolved: ResolvedPolicy): void;
}

/** Every schema knob carries a default, so leaving it is the deterministic definition of "changed". */
const isChanged = (knob: PolicyKnob, resolved: ResolvedPolicy): boolean =>
    resolved.values[knob.id] !== knob.default;

interface PanelEntry {
    readonly knob: PolicyKnob;
    readonly label: HTMLLabelElement;
    readonly input: HTMLInputElement | HTMLSelectElement;
    readonly badge: HTMLElement;
}

/** Host-side, hot control surface. Changes are reported, never applied here. Filtering is a local view concern. */
export const mountPolicyPanel = (
    container: HTMLElement,
    schema: PolicySchema,
    resolved: ResolvedPolicy,
    actions: PolicyPanelActions,
): PolicyPanel => {
    const entries = new Map<string, PanelEntry>();

    const control = (entry: PanelControl): HTMLElement => {
        const { knob } = entry;
        const label = document.createElement('label');
        label.className = 'policy-control';
        label.dataset.knob = knob.id;
        label.title = knob.description;
        const title = document.createElement('span');
        title.className = 'policy-control-title';
        title.textContent = knob.id;
        const badge = document.createElement('span');
        badge.className = 'policy-source';
        let input: HTMLInputElement | HTMLSelectElement;
        if (knob.type === 'enum') {
            const select = document.createElement('select');
            for (const option of knob.options) {
                const item = document.createElement('option');
                item.value = option;
                item.textContent = option;
                select.append(item);
            }
            select.addEventListener('change', () => actions.onChange(knob.id, select.value));
            input = select;
        } else {
            const field = document.createElement('input');
            field.type = knob.type === 'boolean' ? 'checkbox' : 'number';
            if (knob.type === 'number') {
                field.min = String(knob.min);
                field.max = String(knob.max);
                field.step = String(knob.step);
            }
            field.addEventListener(knob.type === 'boolean' ? 'change' : 'input', () =>
                actions.onChange(knob.id, knob.type === 'boolean' ? field.checked : field.valueAsNumber),
            );
            input = field;
        }
        input.dataset.policyKnob = knob.id;
        entries.set(knob.id, { knob, label, input, badge });
        label.append(title, badge, input);
        return label;
    };

    const familySection = (group: PanelFamily): HTMLElement => {
        const section = document.createElement('details');
        section.className = 'policy-family';
        section.dataset.family = group.family;
        const summary = document.createElement('summary');
        summary.textContent = group.family;
        const tools = document.createElement('div');
        tools.className = 'policy-family-tools';
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.textContent = 'reset';
        reset.addEventListener('click', () => actions.onReset(group.controls.map((item) => item.knob.id)));
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'copy URL';
        copy.addEventListener('click', () => actions.onCopy());
        tools.append(reset, copy);
        section.append(summary, tools, ...group.controls.map(control));
        return section;
    };

    const element = document.createElement('div');
    element.className = 'policy-panel';

    const tools = document.createElement('div');
    tools.className = 'policy-tools';
    const search = document.createElement('input');
    search.className = 'policy-search';
    search.type = 'search';
    search.placeholder = 'Filter knobs';
    search.setAttribute('aria-label', 'Filter policy knobs');
    const provenance = document.createElement('select');
    provenance.className = 'policy-provenance';
    provenance.setAttribute('aria-label', 'Filter by provenance');
    const changed = document.createElement('button');
    changed.type = 'button';
    changed.textContent = 'changed only';
    changed.setAttribute('data-changed-only', '');
    changed.setAttribute('aria-pressed', 'false');
    tools.append(search, provenance, changed);

    const empty = document.createElement('p');
    empty.className = 'policy-empty';
    empty.textContent = 'No knobs match the current filters.';
    empty.hidden = true;

    element.append(tools, ...panelControls(schema, resolved).map(familySection), empty);

    const syncProvenance = (current: ResolvedPolicy): void => {
        const selected = provenance.value;
        const sources = [...new Set<string>(schema.knobs.map((knob) => current.provenance[knob.id]))].sort();
        provenance.replaceChildren(
            ...['all', ...sources].map((value) => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                return option;
            }),
        );
        provenance.value = sources.includes(selected) ? selected : 'all';
    };

    const apply = (): void => {
        const query = search.value.trim().toLowerCase();
        const source = provenance.value;
        const changedOnly = changed.getAttribute('aria-pressed') === 'true';
        const visibleByFamily = new Map<string, boolean>();
        for (const [id, entry] of entries) {
            const matchesQuery = id.toLowerCase().includes(query);
            const matchesSource = source === 'all' || entry.label.dataset.provenance === source;
            const matchesChanged = !changedOnly || entry.label.dataset.changed === 'true';
            const visible = matchesQuery && matchesSource && matchesChanged;
            entry.label.hidden = !visible;
            visibleByFamily.set(entry.knob.family, (visibleByFamily.get(entry.knob.family) ?? false) || visible);
        }
        const families = [...element.querySelectorAll<HTMLDetailsElement>('.policy-family')];
        for (const family of families) {
            family.hidden = !visibleByFamily.get(family.dataset.family ?? '');
        }
        empty.hidden = families.some((family) => !family.hidden);
    };

    search.addEventListener('input', apply);
    provenance.addEventListener('change', apply);
    changed.addEventListener('click', () => {
        changed.setAttribute('aria-pressed', String(changed.getAttribute('aria-pressed') !== 'true'));
        apply();
    });

    container.replaceChildren(element);

    const update = (current: ResolvedPolicy): void => {
        syncProvenance(current);
        for (const knob of schema.knobs) {
            const entry = entries.get(knob.id);
            if (!entry) continue;
            const { input, badge, label } = entry;
            if (input instanceof HTMLInputElement && knob.type === 'boolean')
                input.checked = Boolean(current.values[knob.id]);
            else input.value = String(current.values[knob.id]);
            const source = current.provenance[knob.id];
            badge.textContent = source;
            label.dataset.provenance = source;
            label.dataset.changed = String(isChanged(knob, current));
        }
        apply();
    };

    update(resolved);
    return { element, update };
};
