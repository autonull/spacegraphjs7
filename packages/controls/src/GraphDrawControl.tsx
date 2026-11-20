import {
    VOCABULARY_KEYS,
    type GraphArrangement,
    type GraphSide,
    type RendererCapabilities,
} from '@spacegraphjs/shared';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { JSX } from 'solid-js';
import { GraphDrawControl as ToolbarDrawControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphDrawControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Renderer capabilities. */
    capabilities?: RendererCapabilities;
    /** Whether billboard mode is enabled. */
    billboard?: boolean;
    /** Callback to toggle billboard. */
    onToggleBillboard?: () => void;
    /** Detail framing mode. */
    detailFraming?: 'off' | 'card';
    /** Callback when detail framing changes. */
    onDetailFramingChange?: (framing: 'off' | 'card') => void;
    /** Whether files are shown. */
    files?: boolean;
    /** Callback to toggle files. */
    onToggleFiles?: () => void;
    /** Callback to open equalizer. */
    onOpenEqualizer?: () => void;
    /** Current arrangement. */
    arrangement?: GraphArrangement;
    /** Callback when arrangement changes. */
    onArrangementChange?: (arrangement: GraphArrangement) => void;
    /** Current arrangement side. */
    arrangementSide?: GraphSide;
    /** Callback when arrangement side changes. */
    onArrangementSideChange?: (side: GraphSide) => void;
    /** Optional vocabulary keys for custom i18n keys. */
    vocabularyKeys?: Partial<typeof VOCABULARY_KEYS>;
};
export const GraphDrawControl = (props: GraphDrawControlProps): JSX.Element => {
    const { i18n, vocabularyKeys, ...rest } = props;
    return <ToolbarDrawControl {...rest} i18n={legacyI18n(i18n, vocabularyKeys)} />;
};