// P5.5. Reports state the matrix and its sampling so a negative result is readable as evidence.

import type { CaptureMatrix } from './matrix';
import type { ExperimentTemplate } from './templates';

export interface ReportResult {
    readonly name: string;
    readonly value?: string | number;
    readonly negative?: boolean;
    readonly note?: string;
}

export interface ReportInput {
    readonly title: string;
    readonly matrix: CaptureMatrix;
    readonly template?: ExperimentTemplate;
    readonly samplingNote?: string;
    readonly results: readonly ReportResult[];
}

export function reportMarkdown(input: ReportInput): string {
    const results = input.results.map((result) => {
        const value = result.value === undefined ? '' : ` — ${result.value}`;
        const note = result.note ? ` (${result.note})` : '';
        return `- ${result.negative ? 'Negative result' : 'Result'}: ${result.name}${value}${note}`;
    });
    const negatives = input.results.filter((result) => result.negative);
    return [
        `# ${input.title}`,
        '',
        `- Template: ${input.template?.label ?? 'none'}`,
        `- Stop rule: ${input.template?.stopRule ?? 'host-declared'}`,
        `- Axes: ${input.matrix.axes.join(', ') || 'none'}`,
        `- Matrix: ${input.matrix.total} possible, ${input.matrix.sampled} captured (${input.matrix.strategy}, seed ${input.matrix.seed}, cap ${input.matrix.maxCells})`,
        `- Sampling: ${input.samplingNote ?? 'full product when under the cap; baseline, pairwise coverage and seeded fill otherwise'}`,
        '',
        '## Results',
        ...(results.length ? results : ['- No results recorded.']),
        '',
        '## Negative results',
        ...(negatives.length
            ? negatives.map((result) => `- ${result.name}`)
            : ['- None recorded.']),
        '',
    ].join('\n');
}
