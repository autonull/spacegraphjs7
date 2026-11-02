import type { OutputDisplayProps } from './types';

function defaultFormatOutput(data: unknown): string | undefined {
    return typeof data === 'string' && data.length > 0 ? data : undefined;
}

export const OutputDisplay = (props: OutputDisplayProps) => {
    const format = props.formatOutput ?? defaultFormatOutput;
    const output = props.output ? format(props.output) : undefined;

    if (!output) return null;

    return (
        <div class="mb-4" data-slot="graph-inspector-output">
            <div class="flex items-center justify-between">
                <div class="text-12-regular text-text-weak">{props.t('panel.inspectorOutput')}</div>
            </div>
            <pre class="mt-1 max-h-64 overflow-auto rounded-sm bg-background-weak p-2 text-12-mono text-text-base whitespace-pre-wrap break-words">
                {output}
            </pre>
        </div>
    );
};

export { defaultFormatOutput };
