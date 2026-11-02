import type { RenderTheme, EqualizerRuleSet } from '@spacegraphjs/shared';

/** How an edge of each confidence is drawn; the adapter decides the same. */
export const CONFIDENCE_STYLE = {
    explicit: 'solid',
    structural: 'dashed',
    inferred: 'dashed',
} as const;

export interface AccentColors {
    solid: string;
    muted: string;
    subtle: string;
}

/** Returns the accent colors for a node kind, respecting equalizer rules. */
export function kindAccent(kind: string, rules?: EqualizerRuleSet): AccentColors {
    // Default kind colors
    const defaults: Record<string, AccentColors> = {
        session: { solid: '#6b7280', muted: '#9ca3af', subtle: '#e5e7eb' },
        turn: { solid: '#3b82f6', muted: '#60a5fa', subtle: '#dbeafe' },
        phase: { solid: '#8b5cf6', muted: '#a78bfa', subtle: '#ede9fe' },
        message: { solid: '#10b981', muted: '#34d399', subtle: '#d1fae5' },
        reasoning: { solid: '#f59e0b', muted: '#fbbf24', subtle: '#fef3c7' },
        tool: { solid: '#ec4899', muted: '#f472b6', subtle: '#fce7f3' },
        file: { solid: '#06b6d4', muted: '#22d3ee', subtle: '#cffafe' },
        directory: { solid: '#84cc16', muted: '#a3e635', subtle: '#f7fee7' },
        subagent: { solid: '#f97316', muted: '#fb923c', subtle: '#ffedd5' },
        result: { solid: '#14b8a6', muted: '#2dd4bf', subtle: '#ccfbf1' },
        error: { solid: '#ef4444', muted: '#f87171', subtle: '#fee2e2' },
        retry: { solid: '#f97316', muted: '#fb923c', subtle: '#ffedd5' },
        compaction: { solid: '#6366f1', muted: '#818cf8', subtle: '#e0e7ff' },
        notice: { solid: '#6b7280', muted: '#9ca3af', subtle: '#e5e7eb' },
        diff: { solid: '#8b5cf6', muted: '#a78bfa', subtle: '#ede9fe' },
        package: { solid: '#06b6d4', muted: '#22d3ee', subtle: '#cffafe' },
        commit: { solid: '#8b5cf6', muted: '#a78bfa', subtle: '#ede9fe' },
        branch: { solid: '#ec4899', muted: '#f472b6', subtle: '#fce7f3' },
        symbol: { solid: '#f59e0b', muted: '#fbbf24', subtle: '#fef3c7' },
        test: { solid: '#10b981', muted: '#34d399', subtle: '#d1fae5' },
        'test-run': { solid: '#14b8a6', muted: '#2dd4bf', subtle: '#ccfbf1' },
        process: { solid: '#f97316', muted: '#fb923c', subtle: '#ffedd5' },
        port: { solid: '#06b6d4', muted: '#22d3ee', subtle: '#cffafe' },
        issue: { solid: '#ef4444', muted: '#f87171', subtle: '#fee2e2' },
        note: { solid: '#6b7280', muted: '#9ca3af', subtle: '#e5e7eb' },
    };

    // Check for equalizer rule override
    const kinds = rules?.kinds as
        Record<string, { color?: string; colorMuted?: string; colorSubtle?: string }> | undefined;
    if (kinds?.[kind]) {
        const rule = kinds[kind];
        return {
            solid: rule.color ?? defaults[kind]?.solid ?? '#6b7280',
            muted: rule.colorMuted ?? defaults[kind]?.muted ?? '#9ca3af',
            subtle: rule.colorSubtle ?? defaults[kind]?.subtle ?? '#e5e7eb',
        };
    }

    return defaults[kind] ?? { solid: '#6b7280', muted: '#9ca3af', subtle: '#e5e7eb' };
}

/** Returns the accent colors for a phase category, respecting equalizer rules. */
export function categoryAccent(category: string, rules?: EqualizerRuleSet): AccentColors {
    const defaults: Record<string, AccentColors> = {
        explore: { solid: '#3b82f6', muted: '#60a5fa', subtle: '#dbeafe' },
        edit: { solid: '#f97316', muted: '#fb923c', subtle: '#ffedd5' },
        verify: { solid: '#10b981', muted: '#34d399', subtle: '#d1fae5' },
        delegate: { solid: '#8b5cf6', muted: '#a78bfa', subtle: '#ede9fe' },
        result: { solid: '#14b8a6', muted: '#2dd4bf', subtle: '#ccfbf1' },
    };

    const phases = rules?.phases as
        Record<string, { color?: string; colorMuted?: string; colorSubtle?: string }> | undefined;
    if (phases?.[category]) {
        const rule = phases[category];
        return {
            solid: rule.color ?? defaults[category]?.solid ?? '#6b7280',
            muted: rule.colorMuted ?? defaults[category]?.muted ?? '#9ca3af',
            subtle: rule.colorSubtle ?? defaults[category]?.subtle ?? '#e5e7eb',
        };
    }

    return defaults[category] ?? { solid: '#6b7280', muted: '#9ca3af', subtle: '#e5e7eb' };
}

/** Returns the color for a node status. */
export function statusAccent(theme: RenderTheme, status: string): string {
    const statusColors: Record<string, keyof RenderTheme> = {
        pending: 'textMuted',
        running: 'accent',
        success: 'success',
        failed: 'error',
        interrupted: 'warning',
        neutral: 'textMuted',
    };
    const themeKey = statusColors[status] ?? 'textMuted';
    const value = theme[themeKey];
    return typeof value === 'string' ? value : theme.textMuted;
}

/** Formats a timestamp as a relative age string. */
export function formatAge(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

/** Returns a human-readable label for a provenance source. */
export function sourceLabel(source: string): string {
    const labels: Record<string, string> = {
        session: 'ui.sessionGraph.source.session',
        filesystem: 'ui.sessionGraph.source.filesystem',
        git: 'ui.sessionGraph.source.git',
        lsp: 'ui.sessionGraph.source.lsp',
        terminal: 'ui.sessionGraph.source.terminal',
        browser: 'ui.sessionGraph.source.browser',
    };
    return labels[source] ?? source;
}
