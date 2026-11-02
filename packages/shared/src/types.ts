/**
 * Generic graph types for SpaceGraphJS.
 * These are framework-agnostic types that can be used by any host.
 */

/** 2D position coordinate. */
export interface Position {
    x: number;
    y: number;
}

/** Graph node - generic version of session-ui GraphNode. */
export interface GraphNode {
    id: string;
    label: string;
    kind: string;
    status: string;
    summary?: string;
    provenance?: {
        source: string;
        asOf?: number;
    };
    data?: Record<string, unknown>;
    interactive?: boolean;
}

/** Graph edge - generic version of session-ui GraphEdge. */
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    kind: string;
    confidence?: 'explicit' | 'structural' | 'inferred';
    label?: string;
    data?: Record<string, unknown>;
}

/** Graph view data - generic version of session-ui GraphViewData. */
export interface GraphViewData {
    nodes: readonly GraphNode[];
    edges: readonly GraphEdge[];
    turns?: readonly string[];
    workspaceRoot?: string;
}

/** Renderer contract types (imported for use in this file). */
import type {
    Projection,
    DepthMode,
    NodeStatus,
    RenderNode,
    RenderEdge,
    RenderModel,
    RenderModelPatch,
    RenderTheme,
    RendererCapabilities,
    RendererViewport,
    FitInsets,
    FitOptions,
} from '@spacegraphjs/renderer';

export type {
    Projection,
    DepthMode,
    NodeStatus,
    RenderNode,
    RenderEdge,
    RenderModel,
    RenderModelPatch,
    RenderTheme,
    RendererCapabilities,
    RendererViewport,
    FitInsets,
    FitOptions,
} from '@spacegraphjs/renderer';

/** Graph facets for filtering. */
export interface GraphFacets {
    query: string;
    kinds: ReadonlySet<string>;
    statuses: ReadonlySet<string>;
    domains: ReadonlySet<string>;
}

/** Facet counts for display. */
export interface FacetCounts {
    kinds: readonly { value: string; kept: number; total: number }[];
    statuses: readonly { value: string; kept: number; total: number }[];
    domains: readonly { value: string; kept: number; total: number }[];
}

/** Zoom/semantic level. */
export type ZoomLevel = 'overview' | 'execution' | 'detail';

/** Layout type. */
export type Layout =
    'lanes' | 'timeline' | 'hierarchy' | 'tree' | 'force' | 'ribbon' | 'matrix' | 'log' | 'radial';

/** Graph side for split views. */
export type GraphSide = 'start' | 'end';

/** Graph arrangement for hybrid views. */
export type GraphArrangement = 'floating' | 'side' | 'stacked';

/** Detail mode for node detail display. */
export type DetailMode = 'panel' | 'popover' | 'inline';

/** Detail framing behavior. */
export type DetailFraming = 'off' | 'card';

/** Profile presets for facet combinations. */
export interface ProfilePreset {
    id: string;
    labelKey: string;
    domains: readonly string[];
    statuses?: readonly string[];
}

/** Vocabulary keys for i18n. */
export interface VocabularyKeys {
    level: Record<ZoomLevel, string>;
    depth: Record<DepthMode, string>;
    layout: Record<Layout, string>;
    layoutHint: Record<Layout, string>;
    side: Record<GraphSide, string>;
    arrangement: Record<GraphArrangement, string>;
    kind: Record<string, string>;
    status: Record<string, string>;
    domain: Record<string, string>;
    confidence: Record<string, string>;
    edge: Record<string, string>;
    lane: Record<string, string>;
    detailMode: Record<DetailMode, string>;
    phase: Record<string, string>;
}

/** Constants for toolbar components. */
export const ZOOM_LEVELS: readonly ZoomLevel[] = ['overview', 'execution', 'detail'] as const;
export const DEPTH_MODES: readonly DepthMode[] = [
    'flat',
    'layered',
    'depth-stack',
    'orbit',
] as const;
export const LAYOUTS: readonly Layout[] = [
    'lanes',
    'timeline',
    'hierarchy',
    'tree',
    'force',
    'ribbon',
    'matrix',
    'log',
    'radial',
] as const;
export const GRAPH_ARRANGEMENTS: readonly GraphArrangement[] = [
    'floating',
    'side',
    'stacked',
] as const;
export const DETAIL_MODES: readonly DetailMode[] = ['panel', 'popover', 'inline'] as const;

export const DOMAINS: readonly string[] = [
    'session',
    'directories',
    'history',
    'code',
    'verification',
    'runtime',
    'work',
] as const;
export const LANES: readonly string[] = [
    'phases',
    'prompt',
    'narrative',
    'explore',
    'edit',
    'verify',
    'delegate',
    'artifacts',
] as const;
export const PHASE_CATEGORIES: readonly string[] = [
    'explore',
    'edit',
    'verify',
    'delegate',
    'result',
] as const;
export const NODE_KINDS: readonly string[] = [
    'session',
    'turn',
    'phase',
    'message',
    'reasoning',
    'tool',
    'file',
    'directory',
    'subagent',
    'result',
    'error',
    'retry',
    'compaction',
    'notice',
    'diff',
    'package',
    'commit',
    'branch',
    'symbol',
    'test',
    'test-run',
    'process',
    'port',
    'issue',
    'note',
] as const;
export const NODE_STATUSES: readonly string[] = [
    'pending',
    'running',
    'success',
    'failed',
    'interrupted',
    'neutral',
] as const;

export const PROFILE_PRESETS: readonly {
    id: string;
    labelKey: string;
    domains: readonly string[];
    statuses?: readonly string[];
}[] = [
    {
        id: 'all',
        labelKey: 'ui.toolbar.profile.all',
        domains: ['session', 'filesystem', 'code', 'terminal', 'browser'],
    },
    { id: 'code', labelKey: 'ui.toolbar.profile.code', domains: ['code'] },
    { id: 'files', labelKey: 'ui.toolbar.profile.files', domains: ['filesystem'] },
] as const;

/** Layout types. */
export interface LayoutResult {
    positions: ReadonlyMap<string, Position>;
    bounds: { x: number; y: number; width: number; height: number };
}

/** Turn subgraph result. */
export interface TurnSubgraphResult {
    nodes: readonly GraphNode[];
    edges: readonly GraphEdge[];
}

/** Layout function type. */
export type LayoutFunction = (model: GraphViewData, options: { level: ZoomLevel }) => LayoutResult;

/** Turn subgraph function type. */
export type TurnSubgraphFunction = (
    model: GraphViewData,
    turnID: string,
    limit: number,
) => TurnSubgraphResult;

/** Renderer ID type - hosts should extend with their renderer IDs. */
export type RendererID = string;

/** Renderer factory type - hosts should provide their own factory functions. */
export type RendererFactory = () => Promise<unknown>;

/** Toolbar-specific types. */
export interface ToolbarLevelOption {
    value: ZoomLevel;
    label: string;
}

export interface ToolbarDepthOption {
    value: DepthMode;
    label: string;
    disabled?: boolean;
    title?: string;
}

export interface ToolbarLayoutOption {
    value: Layout;
    label: string;
}

/** Search types. */
export interface SearchResult {
    node: GraphNode;
    score: number;
}

/** Navigation types (from spacegraphjs/navigation). */
export interface NavigationProjection {
    project: (point: { x: number; y: number }) => { x: number; y: number };
    unproject: (point: { x: number; y: number }) => { x: number; y: number };
    viewRect?: { x: number; y: number; width: number; height: number };
}

/** Export types. */
export type ExportFormat = 'svg' | 'json' | 'html';

export interface ExportOptions {
    theme: RenderTheme;
    sessionTitle?: string;
    testedCommit?: string;
    timestamp?: string;
}

/** Diff types. */
export interface CodeDiff {
    file: string;
    additions: number;
    deletions: number;
    patch: string;
}

export interface CodeDiffSource {
    load: (from: string) => void;
    get: (from: string) => readonly CodeDiff[] | undefined;
}

/** Compare types. */
export interface CompareChanges {
    added: ReadonlySet<string>;
    removed: ReadonlySet<string>;
    changed: ReadonlySet<string>;
    turnStats?: readonly TurnStats[];
}

export interface TurnStats {
    turnNumber: number;
    filesTouched: number;
    toolsRun: number;
    errors: number;
    retries: number;
    durationMs: number;
}

/** Legend types. */
export interface EqualizerRuleSet {
    [key: string]: unknown;
}

export interface GraphSnapshotMeta {
    asOf?: Record<string, number>;
    missing?: readonly { source: string; reason: string }[];
}

/** Overlay types. */
export interface ScopedOverlayOptions {
    container: HTMLElement;
    onClose: () => void;
    useCapture?: boolean;
}

/** Graph diff source type. */
export interface GraphDiffSource {
    load: (from: string) => void;
    get: (from: string) => readonly CodeDiff[] | undefined;
}

/** Annotation types for notes and traces. */
export interface UseGraphAnnotationsReturn {
    notes: Record<string, { body: string }>;
    editingNote: () => string | undefined;
    noteTarget: () => string | undefined;
    traceKind: () => 'why' | 'led-here' | 'related' | undefined;
    traceWhy: (node: GraphNode) => void;
    traceLedHere: (node: GraphNode) => void;
    traceRelated: (node: GraphNode) => void;
    clearTrace: () => void;
    copyTraceOutline: () => void;
    saveNote: (body: string) => void;
    closeNoteComposer: () => void;
    editNote: (node: GraphNode) => void;
    deleteNote: (node: GraphNode) => void;
    copyNote: (node: GraphNode) => void;
}

/** Selection types. */
export interface UseGraphSelectionReturn {
    selectedIds: readonly string[];
    setSelectedIds: (ids: readonly string[]) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
}

/** Camera types. */
export interface UseGraphCameraReturn {
    frame: (ids: readonly string[]) => void;
    fit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setZoom: (zoom: number) => void;
    setProjection: (projection: Projection) => void;
}

/** Group collapse types. */
export interface UseGroupCollapseReturn {
    collapsedGroups: () => ReadonlySet<string>;
    collapseOtherGroups: (groupId: string) => void;
    toggleGroup: (groupId: string) => void;
}

/** Edge kinds types. */
export interface UseEdgeKindsReturn {
    edgeKinds: () => readonly { kind: string; label: string; color: string; visible: boolean }[];
    toggleEdgeKind: (kind: string) => void;
}

/** A11y types. */
export interface AccessibleItem {
    id: string;
    label: string;
    kind: string;
    status: string;
    interactive: boolean;
}

export interface AccessibleEdge {
    id: string;
    source: string;
    target: string;
    kind: string;
    label: string;
}

/** Inline graph types. */
export interface InlineGraphOptions {
    theme?: Partial<RenderTheme>;
    width?: number;
    height?: number;
}

/** Host-owned, sanitized markup for a `card`. Text must be escaped by the template. */
export type CardTemplate = (node: GraphNode, level: ZoomLevel) => string;

/** Host-owned markup for a turn/phase swimlane band. */
export type BandTemplate = (node: GraphNode, count: number, bounds: ClusterBounds) => string;

/** Cluster bounds for swimlane bands. */
export interface ClusterBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type BuildRenderModelOptions = {
    level: ZoomLevel;
    positions: ReadonlyMap<string, Position>;
    /** Enables turn/phase swimlane bands; their bounds wrap the members visible at the level. */
    bands?: boolean;
    /** Emits edges; the ribbon/matrix representations are edge-free summaries. */
    edges?: boolean;
    /** Bundles per-activity provenance edges to their owning turn node. */
    bundle?: boolean;
    /** Overrides the per-level DOM card budget; cards above it fall back to labels. */
    cardBudget?: number;
    /** Replaces the default card markup, e.g. with localized copy. */
    renderCard?: CardTemplate;
    /** Replaces the default swimlane band markup. */
    renderBand?: BandTemplate;
    /** Localized lane labels drawn as a non-interactive gutter. */
    laneLabels?: readonly { id: string; label: string; y: number; anchorNodeId?: string }[];
    /** Non-interactive row/column captions for summary representations. */
    axisLabels?: readonly {
        id: string;
        label: string;
        x: number;
        y: number;
        role: 'row' | 'column';
    }[];
};

/**
 * Builds a RenderModel from GraphViewData. This is a minimal implementation;
 * hosts should provide their own implementation via the adapter pattern.
 */
export function buildRenderModel(
    model: GraphViewData,
    options: BuildRenderModelOptions,
): RenderModel {
    // Minimal implementation - hosts should override with their adapter
    return {
        nodes: model.nodes.map((node) => ({
            id: node.id,
            kind: node.kind,
            label: node.label,
            summary: node.summary,
            position: [
                options.positions.get(node.id)?.x ?? 0,
                options.positions.get(node.id)?.y ?? 0,
                0,
            ] as [number, number, number],
            status: node.status as RenderNode['status'],
            shape: 'card' as const,
        })),
        edges: options.edges
            ? model.edges.map((edge, index) => ({
                  id: edge.id ?? `edge-${index}`,
                  source: edge.source,
                  target: edge.target,
                  kind: edge.kind,
                  label: edge.label,
                  confidence: edge.confidence,
              }))
            : [],
        extent: { width: 1000, height: 1000 },
    };
}

/** Minimal layout function - hosts should provide their own implementation. */
export function layoutGraph(model: GraphViewData, options: { level: ZoomLevel }): LayoutResult {
    // Placeholder - hosts should override with their layout implementation
    const positions = new Map<string, Position>();
    for (const node of model.nodes) {
        positions.set(node.id, { x: 0, y: 0 });
    }
    return { positions, bounds: { x: 0, y: 0, width: 1000, height: 1000 } };
}

/** Minimal turn subgraph function - hosts should provide their own implementation. */
export function turnSubgraph(
    model: GraphViewData,
    turnID: string,
    limit: number,
): TurnSubgraphResult {
    // Placeholder - hosts should override with their turn subgraph implementation
    const turnNode = model.nodes.find((n) => n.id === turnID);
    if (!turnNode) return { nodes: [], edges: [] };
    return { nodes: [turnNode], edges: [] };
}

/** Checks if a renderer supports a given depth mode. Re-exported from @spacegraphjs/renderer */
export { supportsDepth } from '@spacegraphjs/renderer';
