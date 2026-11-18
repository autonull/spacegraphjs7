// `spacegraphjs/experiments` — pure cartesian capture, neutral metrics, inert templates and honest
// reporting. No renderer, capture gate or host protocol dependency (P5).

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
