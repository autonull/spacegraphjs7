import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { JSX } from 'solid-js';

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
    const { i18n, Icon, ...rest } = props;
    const renderIcon = createIconRenderer(Icon);

    return (
        <div class="flex items-center gap-1">
            <GraphIconButton
                label={i18n.t('ui.sessionGraph.toolbar.zoomOut')}
                icon="expand"
                disabled={rest.zoomOutDisabled}
                onClick={() => rest.onZoomOut?.()}
                Icon={Icon}
            />
            <span
                data-slot="graph-zoom-level"
                class="min-w-9 text-center text-12-regular tabular-nums text-text-weak"
                aria-label={i18n.t('ui.sessionGraph.toolbar.zoomPercent', {
                    percent: String(rest.zoomPercent ?? 100),
                })}
            >
                {rest.zoomPercent ?? 100}%
            </span>
            <GraphIconButton
                label={i18n.t('ui.sessionGraph.toolbar.zoomIn')}
                icon="plus"
                disabled={rest.zoomInDisabled}
                onClick={() => rest.onZoomIn?.()}
                Icon={Icon}
            />
            <GraphIconButton
                label={i18n.t('ui.sessionGraph.toolbar.fit')}
                icon="outline-rotate-clockwise"
                onClick={() => rest.onFit?.()}
                Icon={Icon}
            />
        </div>
    );
};

const GraphIconButton = (props: {
    label: string;
    icon: string;
    disabled?: boolean;
    onClick: () => void;
    Icon?: IconComponent;
}): JSX.Element => {
    const renderIcon = createIconRenderer(props.Icon);
    return (
        <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-sm text-text-base hover:bg-surface-base-hover"
            aria-label={props.label}
            disabled={props.disabled}
            onClick={props.onClick}
        >
            {renderIcon({ name: props.icon, size: 'small' })}
        </button>
    );
};
