import { VOCABULARY_KEYS } from '@spacegraphjs/shared';
import type { I18n } from '@spacegraphjs/shared/i18n';

/** Maps the toolbar's i18n keys back to the legacy session-graph namespace. */
export const legacyI18n = (
    i18n: I18n,
    vocabularyKeys?: Partial<typeof VOCABULARY_KEYS>,
): I18n => {
    const overrides: Record<string, string> = {};
    const add = (prefix: string, values?: Record<string, string>) => {
        if (!values) return;
        for (const [name, value] of Object.entries(values)) overrides[`${prefix}.${name}`] = value;
    };
    add('ui.sessionGraph.arrangement', vocabularyKeys?.arrangement);
    add('ui.sessionGraph.arrangement.side', vocabularyKeys?.side);
    add('ui.sessionGraph.detailMode', vocabularyKeys?.detailMode);

    const key = (input: string) =>
        input.startsWith('ui.toolbar.questions.')
            ? input.replace('ui.toolbar.', 'ui.sessionGraph.')
            : input.replace(/^ui\.toolbar\./, 'ui.sessionGraph.toolbar.');

    return {
        t: (input, values) => i18n.t(overrides[input] ?? key(input), values),
        plural: (input, count, values) => i18n.plural(overrides[input] ?? key(input), count, values),
    };
};
