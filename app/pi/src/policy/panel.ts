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

/** Host-side, hot control surface. Changes are reported, never applied here. */
export const mountPolicyPanel = (
    container: HTMLElement,
    schema: PolicySchema,
    resolved: ResolvedPolicy,
    actions: PolicyPanelActions,
): PolicyPanel => {
    const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
    const badges = new Map<string, HTMLElement>();

    const control = (entry: PanelControl): HTMLElement => {
        const { knob } = entry;
        const label = document.createElement('label');
        label.className = 'policy-control';
        label.title = knob.description;
        const title = document.createElement('span');
        title.className = 'policy-control-title';
        title.textContent = knob.id;
        const badge = document.createElement('span');
        badge.className = 'policy-source';
        badges.set(knob.id, badge);
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
        inputs.set(knob.id, input);
        label.append(title, badge, input);
        return label;
    };

    const familySection = (group: PanelFamily): HTMLElement => {
        const section = document.createElement('section');
        section.className = 'policy-family';
        section.dataset.family = group.family;
        const heading = document.createElement('h3');
        heading.textContent = group.family;
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
        section.append(heading, tools, ...group.controls.map(control));
        return section;
    };

    const element = document.createElement('div');
    element.className = 'policy-panel';
    element.append(...panelControls(schema, resolved).map(familySection));
    container.replaceChildren(element);

    const update = (current: ResolvedPolicy): void => {
        for (const knob of schema.knobs) {
            const input = inputs.get(knob.id);
            const badge = badges.get(knob.id);
            if (input) {
                if (input instanceof HTMLInputElement && knob.type === 'boolean')
                    input.checked = Boolean(current.values[knob.id]);
                else input.value = String(current.values[knob.id]);
            }
            if (badge) badge.textContent = current.provenance[knob.id];
        }
    };

    update(resolved);
    return { element, update };
};
