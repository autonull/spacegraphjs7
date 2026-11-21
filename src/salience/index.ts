// `@spacegraphjs/salience` — host-composed importance with an explainable score and a host-chosen
// visual channel mapping. Pure, dependency-free and safe to import from any host (P2).

export {
    SALIENCE_SIGNAL_IDS,
    centralitySignal,
    createSalience,
    kindSignal,
    recencySignal,
    selectionSignal,
    statusSignal,
} from './signals';
export type {
    SalienceContribution,
    SalienceInput,
    SalienceResult,
    SalienceSignal,
    SalienceSignalId,
} from './signals';
export {
    EMPHASIS_RANGES,
    applyEdgeEmphasis,
    applyEmphasis,
    applyModelEmphasis,
    mappingFor,
} from './channels';
export type { EmphasisMapping, EmphasisRange } from './channels';
export { DEFAULT_THRESHOLDS, representationRung, representationWeights } from './representation';
export type {
    RepresentationInput,
    RepresentationRung,
    RepresentationThresholds,
    RepresentationWeights,
} from './representation';
