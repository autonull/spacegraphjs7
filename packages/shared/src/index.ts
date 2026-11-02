/**
 * @spacegraphjs/shared - Internal shared utilities for SpaceGraphJS packages.
 * Not published; used as workspace:* dependency.
 */

// i18n
export type { I18n } from './i18n';
export { noopI18n } from './i18n';

// Icons
export type { IconProps, IconComponent } from './icons';
export { defaultIconSVGs, createIconRenderer } from './icons';

// Popover
export type { PopoverProps, PopoverComponent } from './popover';
export { DefaultPopover, createPopoverRenderer } from './popover';

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
    RenderTheme,
    RendererCapabilities,
    Projection,
    RenderModel,
    RendererViewport,
    Position,
} from './types';

// Animations
export type { SpringConfig, TransitionConfig } from './animations';
export { springPresets, transitionPresets, useSpring, useTransition } from './animations';

// Keyboard
export type { KeyboardShortcut } from './keyboard';
export {
    useKeyboardShortcuts,
    useArrowNavigation,
    useFocusTrap,
    createGraphKeyboardHandler,
    matchShortcut,
} from './keyboard';

// Tokens
export type { DesignTokens } from './tokens';
export { defaultTokens, darkTokens, generateTokenCSS } from './tokens';

// CSS utilities
export {
    cx,
    cn,
    styleVar,
    styleVars,
    generateId,
    fixedSize,
    absolutePosition,
    mediaQueries,
    media,
} from './css';

// Portal
export type { PortalProps } from './portal';
export { Portal, usePortal } from './portal';

// Hooks
export {
    useClickOutside,
    useResizeObserver,
    useIntersectionObserver,
    useMediaQuery,
    useToggle,
    useControlledValue,
    useDebounce,
    useThrottledCallback,
    useLocalStorage,
    useElementSize,
    useSyncedState,
} from './hooks';

// Utils
export { nodeByID, edgeByID, getConnectedNodes, getIncomingEdges, getOutgoingEdges, diffTone, type DiffTone } from './utils';
