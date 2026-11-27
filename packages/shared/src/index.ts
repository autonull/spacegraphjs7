/**
 * @spacegraphjs/shared - Internal shared utilities for SpaceGraphJS packages.
 * Not published; used as workspace:* dependency.
 */

// i18n
export type { I18n } from './i18n';
export { noopI18n, passthroughI18n } from './i18n';

// Facet editing
export type { FacetDisplayCounts } from './facets';
export { mergeFacets, toggleFacet, facetCount } from './facets';

// Icons
export type { IconProps, IconComponent, GraphIconButtonProps } from './icons';
export { defaultIconSVGs, createIconRenderer, GraphIconButton } from './icons';

// Popover
export type { PopoverProps, PopoverComponent } from './popover';
export { DefaultPopover, createIconPopover, createPopoverRenderer } from './popover';

// Types
export type {
    GraphNode,
    GraphEdge,
    GraphViewData,
    GraphFacets,
    FacetCounts,
    ZoomLevel,
    DepthMode,
    Layout,
    GraphSide,
    GraphArrangement,
    DetailMode,
    DetailFraming,
    ProfilePreset,
    VocabularyKeys,
    ToolbarLevelOption,
    ToolbarDepthOption,
    ToolbarLayoutOption,
    SearchResult,
    NavigationProjection,
    ExportFormat,
    ExportOptions,
    CodeDiff,
    CodeDiffSource,
    CompareChanges,
    TurnStats,
    EqualizerRuleSet,
    GraphSnapshotMeta,
    ScopedOverlayOptions,
    AccessibleItem,
    AccessibleEdge,
    InlineGraphOptions,
    CardTemplate,
    BandTemplate,
    ClusterBounds,
    BuildRenderModelOptions,
    GraphDiffSource,
    UseGraphAnnotationsReturn,
    UseGraphSelectionReturn,
    UseGraphCameraReturn,
    UseGroupCollapseReturn,
    UseEdgeKindsReturn,
    LayoutResult,
    TurnSubgraphResult,
    LayoutFunction,
    TurnSubgraphFunction,
    RendererID,
    RendererFactory,
} from './types';
export {
    VOCABULARY_KEYS,
    ZOOM_LEVELS,
    DEPTH_MODES,
    LAYOUTS,
    GRAPH_ARRANGEMENTS,
    DETAIL_MODES,
    DOMAINS,
    LANES,
    PHASE_CATEGORIES,
    NODE_KINDS,
    NODE_STATUSES,
    PROFILE_PRESETS,
    supportsDepth,
    buildRenderModel,
    layoutGraph,
    turnSubgraph,
} from './types';

// Navigation
export { Navigation } from './navigation';
export type {
    MinimapBounds,
    MinimapOptions,
    MinimapPoint,
    MinimapProjection,
    MinimapViewRect,
    MinimapViewport,
} from './navigation';
export type {
    RenderTheme,
    RendererCapabilities,
    Projection,
    RenderModel,
    RendererViewport,
    Position,
} from './types';

// Animations
export type { SpringConfig } from './animations';
export { springPresets, useSpring } from './animations';

// Keyboard
export type { KeyboardShortcut } from './keyboard';
export { useKeyboardShortcuts, matchShortcut } from './keyboard';

// Tokens
export type { DesignTokenThemeOptions, DesignTokens } from './tokens';
export {
    defaultTokens,
    darkTokens,
    generateTokenCSS,
    DESIGN_TOKEN_THEME_VARS,
    readDesignTokenTheme,
    themeFromDesignTokens,
} from './tokens';

// CSS utilities
export { cx, styleVar, generateId, fixedSize, absolutePosition } from './css';

// Hooks
export { useToggle, useControlledValue, useDebounce, useLocalStorage } from './hooks';

// Utils
export { nodeByID, diffTone, formatAge, type DiffTone } from './utils';
