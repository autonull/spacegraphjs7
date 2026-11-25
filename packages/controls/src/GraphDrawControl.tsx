import { VOCABULARY_KEYS } from '@spacegraphjs/shared';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { ComponentProps, JSX } from 'solid-js';
import { GraphDrawControl as ToolbarDrawControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphDrawControlProps = Omit<
    ComponentProps<typeof ToolbarDrawControl>,
    'i18n' | 'vocabularyKeys'
> & {
    i18n: I18n;
    vocabularyKeys?: Partial<typeof VOCABULARY_KEYS>;
};
export const GraphDrawControl = (props: GraphDrawControlProps): JSX.Element => {
    const { i18n, vocabularyKeys, ...rest } = props;
    return <ToolbarDrawControl {...rest} i18n={legacyI18n(i18n, vocabularyKeys)} />;
};