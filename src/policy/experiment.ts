import { cartesianMatrix, type CaptureMatrix } from '../experiments';
import { decodePolicyVector, encodePolicyVector } from './resolve';
import {
    defaultVector,
    sanitizeVector,
    type KnobValue,
    type PolicySchema,
    type PolicyVector,
} from './schema';

export interface PolicyExperiment {
    readonly id: string;
    readonly title: string;
    readonly families: readonly string[];
    /** Knob id -> named variant values. Every axis is a runtime choice, never a code branch. */
    readonly variants: Readonly<Record<string, readonly KnobValue[]>>;
    readonly seed: number;
    readonly maxCells: number;
    readonly metrics: readonly string[];
    readonly decisionRule: string;
}

export interface ExperimentCell {
    readonly id: string;
    readonly vector: PolicyVector;
    /** Compact `p<version>.<base64url>` vector: append as `#s=...` or `?policy=...` to launch this cell. */
    readonly policy: string;
}

export interface SampledExperiment {
    readonly experiment: PolicyExperiment;
    readonly matrix: CaptureMatrix;
    readonly cells: readonly ExperimentCell[];
}

/** Seeded pairwise coverage over any policy families; each cell is a launchable URL vector. */
export const sampleExperiment = (
    schema: PolicySchema,
    experiment: PolicyExperiment,
): SampledExperiment => {
    const axes = schema.knobs
        .filter(
            (knob) =>
                experiment.families.includes(knob.family) && experiment.variants[knob.id]?.length,
        )
        .map((knob) => ({
            id: knob.id,
            values: experiment.variants[knob.id].map(String),
        }));
    const matrix = cartesianMatrix(axes, {
        seed: experiment.seed,
        maxCells: experiment.maxCells,
        pairWith: axes.slice(0, 2).map((axis) => axis.id),
    });
    const cells = matrix.cells.map((cell) => {
        const vector = { ...defaultVector(schema), ...sanitizeVector(schema, cell.values) };
        return { id: cell.id, vector, policy: encodePolicyVector(schema, vector) };
    });
    return { experiment, matrix, cells };
};

/** A cell round-trips byte-identically, so an experiment result is reproducible from its link. */
export const cellFromPolicy = (schema: PolicySchema, policy: string): PolicyVector | undefined =>
    decodePolicyVector(schema, policy) ?? undefined;
