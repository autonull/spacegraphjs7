/** Host-owned policy catalogs: typed knobs, one serializable vector, and boundary coercion. */

import { clamp } from '../utils/math';

export type KnobValue = number | string | boolean;

interface KnobBase<T extends KnobValue> {
    readonly id: string;
    readonly family: string;
    readonly default: T;
    readonly description: string;
    readonly rationale: string;
}

export interface NumberKnob extends KnobBase<number> {
    readonly type: 'number';
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

export interface EnumKnob<T extends string = string> extends KnobBase<T> {
    readonly type: 'enum';
    readonly options: readonly T[];
}

export interface BooleanKnob extends KnobBase<boolean> {
    readonly type: 'boolean';
}

export type PolicyKnob = NumberKnob | EnumKnob | BooleanKnob;

export type PolicyVector = Readonly<Record<string, KnobValue>>;

export interface PolicySchema {
    readonly version: number;
    readonly knobs: readonly PolicyKnob[];
}

export const knobByID = (schema: PolicySchema, id: string): PolicyKnob | undefined =>
    schema.knobs.find((knob) => knob.id === id);

export const defaultVector = (schema: PolicySchema): PolicyVector =>
    Object.fromEntries(schema.knobs.map((knob) => [knob.id, knob.default]));

/** Coerce one untrusted value at the boundary; invalid values are dropped, numbers are clamped. */
export const coerceValue = (knob: PolicyKnob, value: unknown): KnobValue | undefined => {
    if (knob.type === 'boolean') {
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return undefined;
    }
    if (knob.type === 'number') {
        const parsed =
            typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        if (!Number.isFinite(parsed)) return undefined;
        return clamp(parsed, knob.min, knob.max);
    }
    return typeof value === 'string' && knob.options.includes(value) ? value : undefined;
};

export const sanitizeVector = (
    schema: PolicySchema,
    values: Readonly<Record<string, unknown>>,
): PolicyVector => {
    const result: Record<string, KnobValue> = {};
    for (const knob of schema.knobs) {
        const value = coerceValue(knob, values[knob.id]);
        if (value !== undefined) result[knob.id] = value;
    }
    return result;
};
