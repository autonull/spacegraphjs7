// P5.4. Reusable procedures with stop rules. Templates are inert descriptors; nothing fires them.

export interface ExperimentTemplate {
    readonly id: string;
    readonly label: string;
    readonly procedure: readonly string[];
    readonly stopRule: string;
    readonly axes: readonly string[];
}

export const EXPERIMENT_TEMPLATES: readonly ExperimentTemplate[] = [
    {
        id: 'reaction',
        label: 'Reaction test',
        procedure: [
            'Show one configuration',
            'Ask: describe what you see',
            'Record the description',
        ],
        stopRule: 'Stop when descriptions repeat or at the host-declared sample size',
        axes: [],
    },
    {
        id: 'task-study',
        label: 'Task study',
        procedure: [
            'Orient the participant with the five study questions',
            'Ask the participant to find a node, a cause and a recent change',
            'Record wrong turns and preference prompts through the metrics API',
        ],
        stopRule: 'Stop at the host-declared sample size; a negative result is a valid outcome',
        axes: [],
    },
    {
        id: 'ab-config',
        label: 'A/B configuration comparison',
        procedure: [
            'Choose two states from the same model and camera anchor',
            'Show them side by side and record which axes differ',
            'Ask for a preference and the reason',
        ],
        stopRule: 'Stop at the host-declared sample size; no configuration is a default',
        axes: ['lod', 'depth', 'salience'],
    },
];

export function templateById(id: string): ExperimentTemplate | undefined {
    return EXPERIMENT_TEMPLATES.find((template) => template.id === id);
}
