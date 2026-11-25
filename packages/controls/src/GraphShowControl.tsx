import type { GraphViewData, VOCABULARY_KEYS } from '@spacegraphjs/shared/types';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { ComponentProps, JSX } from 'solid-js';
import { GraphShowControl as ToolbarShowControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphShowControlProps = Omit<
    ComponentProps<typeof ToolbarShowControl>,
    'i18n' | 'vocabularyKeys' | 'model'
> & {
    i18n: I18n;
    model?: { workspaceRoot?: string };
    vocabularyKeys?: Partial<typeof VOCABULARY_KEYS>;
};
export const GraphShowControl = (props: GraphShowControlProps): JSX.Element => {
    const { i18n, vocabularyKeys, model, ...rest } = props;
    return (
        <ToolbarShowControl
            {...rest}
            model={model as GraphViewData | undefined}
            i18n={legacyI18n(i18n, vocabularyKeys)}
        />
    );
};