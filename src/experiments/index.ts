// `spacegraphjs/experiments` — pure cartesian capture, neutral metrics, inert templates and honest
// reporting. No renderer, capture gate or host protocol dependency (P5).

export { findShotByID, type ShotRef } from './shot';
export { catalogEntries, type CatalogEntry, type CatalogSource } from './catalog';
export {
    axisValues,
    cartesianMatrix,
    hasCombination,
    type CaptureMatrix,
    type MatrixAxis,
    type MatrixCell,
    type SamplingPolicy,
} from './matrix';
export {
    fromCounterRecord,
    MetricsHarness,
    STUDY_COUNTER_KINDS,
    type MetricEvent,
    type MetricsSnapshot,
    type StudyCounterKind,
} from './metrics';
export { EXPERIMENT_TEMPLATES, templateById, type ExperimentTemplate } from './templates';
export { reportMarkdown, type ReportInput, type ReportResult } from './report';
