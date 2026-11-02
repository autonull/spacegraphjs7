import type { Provenance, ProvenanceDisplayProps } from './types';

function sourceLabel(source: string): string {
    switch (source) {
        case 'tree':
            return 'filesystem';
        case 'vcs':
            return 'git';
        case 'packages':
            return 'packages';
        case 'symbols':
            return 'symbols';
        case 'issues':
            return 'issues';
        case 'processes':
            return 'processes';
        case 'coverage':
            return 'coverage';
        default:
            return source;
    }
}

function formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

function defaultFormatProvenance(
    provenance: Provenance | undefined,
    now: number,
): string | undefined {
    if (!provenance) return undefined;
    const { source, asOf } = provenance;
    const age = asOf !== undefined ? formatAge(now - asOf) : undefined;
    return age ? `${sourceLabel(source)}, ${age}` : sourceLabel(source);
}

export const ProvenanceDisplay = (props: ProvenanceDisplayProps) => {
    const format = props.formatProvenance ?? defaultFormatProvenance;
    const formatted = format(props.provenance, props.now);

    if (!formatted) return null;

    return (
        <div class="mb-4">
            <div class="mb-2 text-12-medium text-text-weak">
                {props.t('panel.inspectorProvenance')}
            </div>
            <div class="text-12-regular text-text-base">{formatted}</div>
        </div>
    );
};

export { sourceLabel, formatAge, defaultFormatProvenance };
