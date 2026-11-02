/**
 * GraphZoomControl - Zoom controls for the toolbar.
 */

import type { JSX } from 'solid-js';
import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { GraphIconButton } from './GraphIconButton';

export interface GraphZoomControlProps {
    zoomPercent?: number;
    onZoomOut?: () => void;
    onZoomIn?: () => void;
    zoomOutDisabled?: boolean;
    zoomInDisabled?: boolean;
    onFit: () => void;
    i18n: I18n;
    Icon?: IconComponent;
}

export function GraphZoomControl(props: GraphZoomControlProps): JSX.Element {
    const { zoomPercent, onZoomOut, onZoomIn, zoomOutDisabled, zoomInDisabled, onFit, i18n, Icon } =
        props;
    const renderIcon = Icon ?? createIconRenderer();

    return (
        <div class="flex items-center gap-1">
            <GraphIconButton
                label={i18n.t('ui.toolbar.zoomOut')}
                icon="expand"
                disabled={zoomOutDisabled}
                onClick={() => onZoomOut?.()}
                Icon={renderIcon}
            />
            <span
                data-slot="graph-zoom-level"
                class="min-w-9 text-center text-12-regular tabular-nums text-text-weak"
                aria-label={i18n.t('ui.toolbar.zoomPercent', {
                    percent: String(zoomPercent ?? 100),
                })}
            >
                {zoomPercent ?? 100}%
            </span>
            <GraphIconButton
                label={i18n.t('ui.toolbar.zoomIn')}
                icon="plus"
                disabled={zoomInDisabled}
                onClick={() => onZoomIn?.()}
                Icon={renderIcon}
            />
        </div>
    );
}
