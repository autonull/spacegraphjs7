import { VOCABULARY_KEYS, type DetailMode } from '@spacegraphjs/shared/types';
import type { GraphViewData } from '@spacegraphjs/shared';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { JSX } from 'solid-js';
import { GraphShowControl as ToolbarShowControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphShowControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Manual history length for undo button. */
    manualHistoryLength?: number;
    /** Manual future length for redo button. */
    manualFutureLength?: number;
    /** Callback for undo. */
    onUndoManual?: () => void;
    /** Callback for redo. */
    onRedoManual?: () => void;
    /** Current detail mode. */
    detailMode?: DetailMode;
    /** Callback when detail mode changes. */
    onDetailModeChange?: (mode: DetailMode) => void;
    /** Whether peek is enabled. */
    peek?: boolean;
    /** Callback to toggle peek. */
    onTogglePeek?: () => void;
    /** Whether follow log is enabled. */
    followLog?: boolean;
    /** Callback when follow log changes. */
    onFollowLogChange?: (follow: boolean) => void;
    /** Callback to open a window. */
    onOpenWindow?: (kind: string, nodeID?: string) => void;
    /** The graph model (for filesystem button). */
    model?: { workspaceRoot?: string };
    /** Whether legend is open. */
    legend?: boolean;
    /** Callback to toggle legend. */
    onToggleLegend?: () => void;
    /** Whether gallery is open. */
    gallery?: boolean;
    /** Callback to toggle gallery. */
    onToggleGallery?: () => void;
    /** Callback for turn map. */
    onTurnMap?: () => void;
    /** Callback to expand graph. */
    onExpandGraph?: () => void;
    /** Optional vocabulary keys for custom i18n keys. */
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