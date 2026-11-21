import {
    coerceValue,
    defaultVector,
    sanitizeVector,
    type KnobValue,
    type PolicySchema,
    type PolicyVector,
} from './schema';

export const POLICY_LAYERS = ['preset', 'experiment', 'url', 'panel'] as const;
export type PolicyLayer = (typeof POLICY_LAYERS)[number];
export type PolicySource = 'defaults' | PolicyLayer;

export type PolicyLayers = Partial<Record<PolicyLayer, PolicyVector>>;

export interface ResolvedPolicy {
    readonly values: PolicyVector;
    readonly provenance: Readonly<Record<string, PolicySource>>;
    readonly vector: PolicyVector;
}

/** Fixed precedence: defaults → preset → experiment → URL → live panel. */
export const resolvePolicy = (schema: PolicySchema, layers: PolicyLayers = {}): ResolvedPolicy => {
    const values: Record<string, KnobValue> = defaultVector(schema);
    const provenance: Record<string, PolicySource> = Object.fromEntries(
        schema.knobs.map((knob) => [knob.id, 'defaults' as PolicySource]),
    );
    for (const source of POLICY_LAYERS) {
        const layer = layers[source];
        if (!layer) continue;
        for (const knob of schema.knobs) {
            const value = coerceValue(knob, layer[knob.id]);
            if (value === undefined) continue;
            values[knob.id] = value;
            provenance[knob.id] = source;
        }
    }
    return { values, provenance, vector: { ...values } };
};

export const withLayer = (
    schema: PolicySchema,
    layers: PolicyLayers,
    layer: PolicyLayer,
    values: PolicyVector,
): PolicyLayers => ({
    ...layers,
    [layer]: { ...layers[layer], ...sanitizeVector(schema, values) },
});

/** Compact, order-stable, URL-safe encoding: `p1.<base64url(json array)>`. */
export const encodePolicyVector = (schema: PolicySchema, values: PolicyVector): string => {
    const packed = schema.knobs.map((knob) => values[knob.id] ?? knob.default);
    const json = JSON.stringify(packed);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `p${schema.version}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
};

export const decodePolicyVector = (schema: PolicySchema, encoded: string): PolicyVector | null => {
    const match = /^p(\d+)\.([A-Za-z0-9_-]+)$/.exec(encoded);
    if (!match || Number(match[1]) !== schema.version) return null;
    try {
        const binary = atob(match[2].replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const packed: unknown = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(packed) || packed.length !== schema.knobs.length) return null;
        const values: Record<string, unknown> = {};
        schema.knobs.forEach((knob, index) => {
            values[knob.id] = packed[index];
        });
        return sanitizeVector(schema, values);
    } catch {
        return null;
    }
};

export interface PolicyChangeEvent {
    readonly type: 'policy:change';
    readonly id: string;
    readonly source: PolicySource;
    readonly value: KnobValue | undefined;
}

export const policyChange = (id: string, source: PolicySource, resolved: ResolvedPolicy): PolicyChangeEvent => ({
    type: 'policy:change',
    id,
    source,
    value: resolved.values[id],
});
