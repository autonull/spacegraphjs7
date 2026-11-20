import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { JSX } from 'solid-js';
import { GraphZoomControl as ToolbarZoomControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphZoomControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Current zoom percentage. */
    zoomPercent?: number;
    /** Callback to zoom out. */
    onZoomOut?: () => void;
    /** Callback to zoom in. */
    onZoomIn?: () => void;
    /** Whether zoom out is disabled. */
    zoomOutDisabled?: boolean;
    /** Whether zoom in is disabled. */
    zoomInDisabled?: boolean;
    /** Callback to fit to view. */
    onFit: () => void;
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