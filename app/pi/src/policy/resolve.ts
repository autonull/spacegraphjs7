import {
    decodePolicyVector as decode,
    type PolicySchema,
    type PolicyVector,
} from 'spacegraphjs/policy';

export {
    POLICY_LAYERS,
    encodePolicyVector,
    policyChange,
    resolvePolicy,
    withLayer,
    type PolicyChangeEvent,
    type PolicyLayer,
    type PolicyLayers,
    type PolicySource,
    type ResolvedPolicy,
} from 'spacegraphjs/policy';

/** Pi still accepts its v1 vector shape for the v2 schema. */
export const decodePolicyVector = (schema: PolicySchema, encoded: string): PolicyVector | null =>
    decode(schema, encoded, { legacyVersions: schema.version === 2 ? [1] : [] });
