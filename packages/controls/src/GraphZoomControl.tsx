import { createIconRenderer } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { ComponentProps, JSX } from 'solid-js';
import { GraphZoomControl as ToolbarZoomControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphZoomControlProps = Omit<ComponentProps<typeof ToolbarZoomControl>, 'i18n'> & {
    i18n: I18n;
};
export const GraphZoomControl = (props: GraphZoomControlProps): JSX.Element => {
    const { i18n, Icon, onFit, ...rest } = props;
    const t = legacyI18n(i18n);
    const renderIcon = createIconRenderer(Icon);
    return (
        <div class="flex items-center gap-1">
            <ToolbarZoomControl {...rest} Icon={Icon} i18n={t} onFit={onFit} />
            <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
                aria-label={t.t('ui.toolbar.fit')}
                onClick={() => onFit()}
            >
                {renderIcon({ name: 'outline-rotate-clockwise', size: 'small' })}
            </button>
        </div>
    );
};