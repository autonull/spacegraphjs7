import type {
    RenderTheme,
    Projection,
    RenderModel,
    DetailMode,
    EqualizerRuleSet,
    GraphViewData,
    GraphNode,
    GraphEdge,
    Layout,
    UseGraphAnnotationsReturn,
    UseGraphSelectionReturn,
    UseGraphCameraReturn,
    UseGroupCollapseReturn,
    UseEdgeKindsReturn,
    GraphDiffSource,
} from '@spacegraphjs/shared';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { JSX } from 'solid-js';
import { createEffect } from 'solid-js';
import { useSpring, springPresets } from '@spacegraphjs/shared';
import { createComponent } from 'solid-js/web';
import { GraphPeek } from './GraphPeek';
import { GraphPopover } from './GraphPopover';

export type GraphOverlayManagerProps = {
    // Model & theme
    model: () => GraphViewData;
    theme: RenderTheme;
    projection: Projection;
    depth: 'flat' | 'layered' | 'depth-stack' | 'orbit';
    detailMode: DetailMode;
    effectiveDetailMode: DetailMode;
    layout: Layout;

    // Selection & navigation
    selection: () => readonly string[];
    select: (id: string | undefined, add?: boolean) => void;
    graphSelection: UseGraphSelectionReturn;

    // Peek
    peekFrame: { node: GraphNode; left: number; top: number } | undefined;
    peekEdge: GraphEdge | undefined;

    // Popover
    popoverVisible: GraphNode | undefined;
    popoverNode: GraphNode | undefined;
    popoverPlacement: { left: number; top: number };
    setPopoverDismissed: (dismissed: boolean) => void;

    // Annotations (notes + trace)
    annotations: UseGraphAnnotationsReturn;
    noteTargetNode: () => GraphNode | undefined;
    noteAnchor: { x: number; y: number } | undefined;

    // Search
    searchOpen: () => boolean;
    searchInitial: string;
    setSearchOpen: (open: boolean) => void;
    jumpTo: (node: GraphNode) => void;

    // Legend
    legendOpen: () => boolean;
    setLegendOpen: (open: boolean) => void;
    edgeKinds: UseEdgeKindsReturn;
    rules: EqualizerRuleSet | undefined;

    // Gallery
    galleryOpen: () => boolean;
    setGalleryOpen: (open: boolean) => void;
    changeLayout: (next: Layout) => void;

    // Group menu
    groupMenu: () => { id: string; x: number; y: number } | undefined;
    setGroupMenu: (menu: { id: string; x: number; y: number } | undefined) => void;
    groupCollapse: UseGroupCollapseReturn;
    camera: UseGraphCameraReturn;
    toggleGroupByID: (id: string) => void;
    modelForGroupMenu: () => GraphViewData;

    // Error/Empty states
    error: string | undefined;
    onBack: (() => void) | undefined;

    // Diff
    diffSource: GraphDiffSource | undefined;
    link: string | undefined;
    onOpenTranscript: ((id: string) => void) | undefined;
    onOpenSession: ((sessionID: string) => void) | undefined;
    onOpenWindow: ((kind: string, nodeID?: string) => void) | undefined;
    onCopyView: () => void;
    renderSummary: ((node: GraphNode) => JSX.Element | undefined) | undefined;

    // A11y
    ordered: RenderModel;
    viewAnnouncement: string;
    a11yInstructionsId: string;
    announce: (message: string) => void;
    i18n: I18n;

    // Optional host-provided components (render props for OpenCode-specific components)
    renderA11y?: (props: {
        model: RenderModel;
        selection: readonly string[];
        instructionsId: string;
        announcement: string;
        onSelect: (id: string | undefined, add?: boolean) => void;
        onEscape: () => void;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderNoteComposer?: (props: {
        targetLabel: string;
        initialValue: string | undefined;
        anchor: { x: number; y: number } | undefined;
        onSave: (body: string) => void;
        onClose: () => void;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderSearch?: (props: {
        model: GraphViewData;
        initialQuery: string;
        onSelect: (node: GraphNode) => void;
        onClose: () => void;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderLegend?: (props: {
        theme: RenderTheme;
        layout: Layout;
        rules: EqualizerRuleSet | undefined;
        edgeKinds: readonly { kind: string; label: string; color: string; visible: boolean }[];
        onToggleEdgeKind: (kind: string) => void;
        onClose: () => void;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderGallery?: (props: {
        model: GraphViewData;
        theme: RenderTheme;
        current: Layout;
        onOpen: (layout: Layout) => void;
        onClose: () => void;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderGroupMenu?: (props: {
        id: string;
        x: number;
        y: number;
        model: () => GraphViewData;
        collapsedGroups: ReadonlySet<string>;
        onToggleGroup: (id: string) => void;
        onCollapseOthers: (groupId: string) => void;
        onFrame: (id: string) => void;
        onClose: () => void;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderError?: (props: {
        error: string | undefined;
        onBack: (() => void) | undefined;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;
    renderEmpty?: (props: {
        model: () => GraphViewData;
        error: string | undefined;
        i18n: I18n;
        Icon?: IconComponent;
    }) => JSX.Element;

    // Optional host-provided Icon component
    Icon?: IconComponent;
};

/**
 * The overlay manager for the graph canvas — all floating overlays that live
 * on or above the canvas (peek, popover, note composer, search, legend, gallery, group menu, A11y, error/empty states).
 *
 * This component is generic and accepts render props for host-specific components.
 * The host (e.g., @opencode/session-graph) provides the render props for components
 * that use OpenCode-specific UI components.
 *
 * This component uses imperative DOM creation with deferred template creation to avoid SolidJS
 * template hoisting which causes "Client-only API called on the server side" errors during SSR builds.
 * Templates are created on first render using a function that returns the template function,
 * preventing the SolidJS compiler from hoisting template calls to module level.
 */
export const GraphOverlayManager = (props: GraphOverlayManagerProps): JSX.Element => {
    const { i18n, Icon } = props;

    // Spring animations for smooth peek positioning
    const [peekLeft, setPeekLeft] = useSpring(0, springPresets.smooth);
    const [peekTop, setPeekTop] = useSpring(0, springPresets.smooth);
    createEffect(() => {
        const frame = props.peekFrame;
        if (frame) {
            setPeekLeft(frame.left);
            setPeekTop(frame.top);
        }
    });

    const createDivPlaceholder = () => document.createElement('div');

    const createPeekAnchor = () => {
        const el = document.createElement('div');
        el.setAttribute('data-slot', 'graph-peek-anchor');
        el.className = 'absolute z-20 -translate-x-1/2';
        return el;
    };

    const createEdgePeekAnchor = () => {
        const el = document.createElement('div');
        el.setAttribute('data-slot', 'graph-edge-peek-anchor');
        el.className = 'absolute bottom-2 left-2 z-20';
        return el;
    };

    const createPopoverAnchor = () => {
        const el = document.createElement('div');
        el.setAttribute('data-slot', 'graph-popover-anchor');
        el.className = 'absolute z-20';
        el.style.display = 'none';
        return el;
    };

    // Render host component or a slotted placeholder div
    const renderHostOrDefault = <T extends Record<string, unknown>>(
        hasHostRenderer: boolean,
        hostRenderer: (p: T) => JSX.Element,
        hostProps: T,
        placeholderSlot: string,
    ) => {
        if (hasHostRenderer) {
            return hostRenderer(hostProps);
        }
        const el = createDivPlaceholder();
        el.setAttribute('data-slot', placeholderSlot);
        return el;
    };

    // Peek node anchor
    const renderPeekNodeAnchor = () => {
        const frame = props.peekFrame;
        if (!frame) return null;
        const el = createPeekAnchor();
        el.style.left = `${peekLeft()}px`;
        el.style.top = `${peekTop()}px`;
        const peekComponent = createComponent(GraphPeek, {
            node: frame.node,
            i18n,
            Icon,
        });
        if (peekComponent) el.appendChild(peekComponent as unknown as Node);
        return el;
    };

    // Peek edge anchor
    const renderPeekEdgeAnchor = () => {
        const peekEdge = props.peekEdge;
        if (!peekEdge) return null;
        const el = createEdgePeekAnchor();
        const peekComponent = createComponent(GraphPeek, {
            edge: peekEdge,
            i18n,
            Icon,
        });
        if (peekComponent) el.appendChild(peekComponent as unknown as Node);
        return el;
    };

    // Popover anchor
    const renderPopoverAnchor = () => {
        if (props.effectiveDetailMode !== 'popover') return null;
        const el = createPopoverAnchor();
        const placement = props.popoverPlacement;
        el.style.left = `${placement.left}px`;
        el.style.top = `${placement.top}px`;
        el.style.display = props.popoverVisible ? 'block' : 'none';
        const popoverComponent = createComponent(GraphPopover, {
            i18n,
            Icon,
            model: props.model(),
            node: props.popoverNode,
            diffSource: props.diffSource,
            renderSummary: props.renderSummary,
            link: props.link,
            onCopyView: props.onCopyView,
            onSelect: props.select,
            onOpenTranscript: props.onOpenTranscript,
            onOpenSession: props.onOpenSession,
            onOpenWindow: props.onOpenWindow
                ? (nodeID?: string) => props.onOpenWindow!('node', nodeID)
                : undefined,
            onClose: () => props.setPopoverDismissed(true),
            traceKind: props.annotations.traceKind(),
            onTraceWhy: props.annotations.traceWhy,
            onTraceLedHere: props.annotations.traceLedHere,
            onTraceRelated: props.annotations.traceRelated,
            onClearTrace: props.annotations.clearTrace,
            onCopyTraceOutline: props.annotations.copyTraceOutline,
            onEditNote: props.annotations.editNote,
            onDeleteNote: props.annotations.deleteNote,
            onCopyNote: props.annotations.copyNote,
        });
        if (popoverComponent) el.appendChild(popoverComponent as unknown as Node);
        return el;
    };

    return (
        <>
            {/* A11y */}
            {renderHostOrDefault(
                !!props.renderA11y,
                (p) => p.renderA11y!(p.props),
                {
                    renderA11y: props.renderA11y,
                    props: {
                        model: props.ordered,
                        selection: props.selection(),
                        instructionsId: props.a11yInstructionsId,
                        announcement: props.viewAnnouncement,
                        onSelect: props.select,
                        onEscape: () => props.select(undefined),
                        i18n,
                        Icon,
                    },
                },
                'graph-a11y-placeholder',
            )}

            {/* Peek node */}
            {renderPeekNodeAnchor()}

            {/* Peek edge */}
            {renderPeekEdgeAnchor()}

            {/* Note composer */}
            {props.annotations.noteTarget() && renderHostOrDefault(
                !!props.renderNoteComposer,
                (p) => p.renderNoteComposer!(p.props),
                {
                    renderNoteComposer: props.renderNoteComposer,
                    props: {
                        targetLabel:
                            props.noteTargetNode()?.label ?? props.annotations.noteTarget() ?? '',
                        initialValue: props.annotations.editingNote()
                            ? (
                                  props.annotations.notes as unknown as Record<
                                      string,
                                      { body: string }
                                  >
                              )[props.annotations.editingNote()!]?.body
                            : undefined,
                        anchor: props.noteAnchor,
                        onSave: props.annotations.saveNote,
                        onClose: props.annotations.closeNoteComposer,
                        i18n,
                        Icon,
                    },
                },
                'graph-note-composer-placeholder',
            )}

            {/* Popover */}
            {renderPopoverAnchor()}

            {/* Error state */}
            {renderHostOrDefault(
                !!props.renderError,
                (p) => p.renderError!(p.props),
                {
                    renderError: props.renderError,
                    props: {
                        error: props.error,
                        onBack: props.onBack,
                        i18n,
                        Icon,
                    },
                },
                'graph-error-placeholder',
            )}

            {/* Empty state */}
            {renderHostOrDefault(
                !!props.renderEmpty,
                (p) => p.renderEmpty!(p.props),
                {
                    renderEmpty: props.renderEmpty,
                    props: {
                        model: props.model,
                        error: props.error,
                        i18n,
                        Icon,
                    },
                },
                'graph-empty-placeholder',
            )}

            {/* Search */}
            {props.searchOpen() && renderHostOrDefault(
                !!props.renderSearch,
                (p) => p.renderSearch!(p.props),
                {
                    renderSearch: props.renderSearch,
                    props: {
                        model: props.model(),
                        initialQuery: props.searchInitial,
                        onSelect: (node: GraphNode) => {
                            props.jumpTo(node);
                            props.setSearchOpen(false);
                        },
                        onClose: () => props.setSearchOpen(false),
                        i18n,
                        Icon,
                    },
                },
                'graph-search-placeholder',
            )}

            {/* Legend */}
            {props.legendOpen() && renderHostOrDefault(
                !!props.renderLegend,
                (p) => p.renderLegend!(p.props),
                {
                    renderLegend: props.renderLegend,
                    props: {
                        theme: props.theme,
                        layout: props.layout,
                        rules: props.rules,
                        edgeKinds: props.edgeKinds.edgeKinds(),
                        onToggleEdgeKind: props.edgeKinds.toggleEdgeKind,
                        onClose: () => props.setLegendOpen(false),
                        i18n,
                        Icon,
                    },
                },
                'graph-legend-placeholder',
            )}

            {/* Gallery */}
            {props.galleryOpen() && renderHostOrDefault(
                !!props.renderGallery,
                (p) => p.renderGallery!(p.props),
                {
                    renderGallery: props.renderGallery,
                    props: {
                        model: props.model(),
                        theme: props.theme,
                        current: props.layout,
                        onOpen: props.changeLayout,
                        onClose: () => props.setGalleryOpen(false),
                        i18n,
                        Icon,
                    },
                },
                'graph-gallery-placeholder',
            )}

            {/* Group menu */}
            {props.groupMenu() && (() => {
                const menuData = props.groupMenu()!;
                return renderHostOrDefault(
                    !!props.renderGroupMenu,
                    (p) => p.renderGroupMenu!(p.props),
                    {
                        renderGroupMenu: props.renderGroupMenu,
                        props: {
                            id: menuData.id,
                            x: menuData.x,
                            y: menuData.y,
                            model: props.modelForGroupMenu,
                            collapsedGroups: props.groupCollapse.collapsedGroups(),
                            onToggleGroup: props.toggleGroupByID,
                            onCollapseOthers: props.groupCollapse.collapseOtherGroups,
                            onFrame: (id: string) => props.camera.frame([id]),
                            onClose: () => props.setGroupMenu(undefined),
                            i18n,
                            Icon,
                        },
                    },
                    'graph-group-menu-placeholder',
                );
            })()}
        </>
    );
};