/**
 * Generated experiment spine. One typed knob set, one resolver with provenance, one preset gallery,
 * one recorder, and one permalink codec. Host-owned; the library never learns these choices.
 */

export type KnobValue = string | number | boolean;
export type KnobType = 'enum' | 'number' | 'boolean';

export interface Knob {
    readonly id: string;
    readonly type: KnobType;
    readonly default: KnobValue;
    readonly options?: readonly string[];
    readonly min?: number;
    readonly max?: number;
    readonly description: string;
}

export const KNOBS: readonly Knob[] = [
    { id: 'surface', type: 'enum', default: 'hybrid', options: ['log', 'map', 'hybrid'], description: 'Default surface.' },
    { id: 'window', type: 'number', default: 60, min: 1, max: 500, description: 'Newest turns drawn.' },
    { id: 'emphasis', type: 'number', default: 1, min: 0.2, max: 1, description: 'Emphasis cap.' },
    { id: 'minimap', type: 'boolean', default: true, description: 'Show orientation aids.' },
];

export type Vector = Readonly<Record<string, KnobValue>>;
export type Source = 'defaults' | 'preset' | 'url' | 'panel';
export interface Resolved {
    readonly values: Vector;
    readonly provenance: Readonly<Record<string, Source>>;
}

const coerce = (knob: Knob, value: unknown): KnobValue | undefined => {
    if (knob.type === 'boolean') return typeof value === 'boolean' ? value : value === 'true' ? true : value === 'false' ? false : undefined;
    if (knob.type === 'number') {
        const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(number) ? Math.min(knob.max ?? number, Math.max(knob.min ?? number, number)) : undefined;
    }
    return typeof value === 'string' && knob.options?.includes(value) ? value : undefined;
};

export const defaults = (): Vector => Object.fromEntries(KNOBS.map((knob) => [knob.id, knob.default]));

export const resolve = (preset: Vector = {}, url: Vector = {}, panel: Vector = {}): Resolved => {
    const values: Record<string, KnobValue> = defaults();
    const provenance: Record<string, Source> = Object.fromEntries(KNOBS.map((knob) => [knob.id, 'defaults' as Source]));
    for (const [source, layer] of [['preset', preset], ['url', url], ['panel', panel]] as const) {
        for (const knob of KNOBS) {
            const value = coerce(knob, layer[knob.id]);
            if (value === undefined) continue;
            values[knob.id] = value;
            provenance[knob.id] = source;
        }
    }
    return { values, provenance };
};

export interface Preset {
    readonly id: string;
    readonly question: string;
    readonly vector: Vector;
}

export const PRESETS: readonly Preset[] = [
    { id: 'baseline', question: 'What do the current choices do?', vector: {} },
    { id: 'quiet', question: 'Do fewer orientation aids still support the tasks?', vector: { minimap: false, emphasis: 0.6 } },
    { id: 'dense', question: 'How many turns are usable before legibility drops?', vector: { window: 160 } },
];

export const preset = (id: string): Vector | undefined => PRESETS.find((entry) => entry.id === id)?.vector;

const PREFIX = 'p1.';

export const encode = (values: Vector): string => {
    const packed = KNOBS.map((knob) => values[knob.id] ?? knob.default);
    return PREFIX + encodeURIComponent(JSON.stringify(packed));
};

export const decode = (encoded: string): Vector | undefined => {
    if (!encoded.startsWith(PREFIX)) return undefined;
    try {
        const packed: unknown = JSON.parse(decodeURIComponent(encoded.slice(PREFIX.length)));
        if (!Array.isArray(packed) || packed.length !== KNOBS.length) return undefined;
        const layer: Record<string, unknown> = {};
        KNOBS.forEach((knob, index) => {
            layer[knob.id] = packed[index];
        });
        return resolve({}, layer).values;
    } catch {
        return undefined;
    }
};

export interface Event {
    readonly seq: number;
    readonly kind: string;
    readonly values: Vector;
}

export class Recorder {
    readonly #events: Event[] = [];

    get events(): readonly Event[] {
        return [...this.#events];
    }

    record(kind: string, values: Vector): Event {
        const event = { seq: this.#events.length + 1, kind, values: { ...values } };
        this.#events.push(event);
        return event;
    }

    replay(): Readonly<Record<string, number>> {
        return this.#events.reduce<Record<string, number>>((counts, event) => {
            counts[event.kind] = (counts[event.kind] ?? 0) + 1;
            return counts;
        }, {});
    }
}

/** Auto-generated, hot control surface. Changes are reported; the host decides what to repaint. */
export const mountPanel = (
    container: HTMLElement,
    current: Resolved,
    onChange: (id: string, value: KnobValue) => void,
): void => {
    const panel = document.createElement('div');
    panel.className = 'experiment-panel';
    for (const knob of KNOBS) {
        const label = document.createElement('label');
        label.title = knob.description;
        const title = document.createElement('span');
        title.textContent = knob.id + ' · ' + current.provenance[knob.id];
        let input: HTMLInputElement | HTMLSelectElement;
        if (knob.type === 'enum') {
            const select = document.createElement('select');
            for (const option of knob.options ?? []) {
                const item = document.createElement('option');
                item.value = option;
                item.textContent = option;
                select.append(item);
            }
            select.value = String(current.values[knob.id]);
            select.addEventListener('change', () => onChange(knob.id, select.value));
            input = select;
        } else {
            const field = document.createElement('input');
            field.type = knob.type === 'boolean' ? 'checkbox' : 'number';
            if (knob.type === 'number') {
                field.min = String(knob.min);
                field.max = String(knob.max);
            }
            if (knob.type === 'boolean') field.checked = Boolean(current.values[knob.id]);
            else field.value = String(current.values[knob.id]);
            field.addEventListener('change', () => onChange(knob.id, knob.type === 'boolean' ? field.checked : field.valueAsNumber));
            input = field;
        }
        label.append(title, input);
        panel.append(label);
    }
    container.replaceChildren(panel);
};
