import { createSignal, createMemo, Accessor } from 'solid-js';
import { useDebounce, type GraphViewData } from '@spacegraphjs/shared';

/** Band identifier from the renderer's ZoomBandsPlugin. */
export type GraphBand = 'overview' | 'execution' | 'detail';

export type UseGroupCollapseOptions = {
    /** Accessor for the graph model. */
    model: Accessor<GraphViewData>;
    /** Accessor for the selection (array of node IDs). */
    selection: Accessor<readonly string[]>;
    /** Current zoom band from the renderer (overview | execution | detail). */
    band?: Accessor<GraphBand | undefined>;
    /** Whether a descendant of a group is currently selected. */
    descendantSelected?: Accessor<boolean>;
    /** Whether a drag operation is in progress on a group descendant. */
    draggingDescendant?: Accessor<boolean>;
    /** Unique instance ID for isolating pointer state across multiple graphs. */
    instanceId?: string;
    /** Controlled group collapse state (external shared state). */
    explicitlyCollapsedGroups?: Accessor<ReadonlySet<string>>;
    /** Callback when explicitly collapsed groups change. */
    onExplicitlyCollapsedGroupsChange?: (groups: ReadonlySet<string>) => void;
};

export type UseGroupCollapseReturn = {
    /** Groups that are collapsed (explicit user action OR ambient band-driven fold). */
    collapsedGroups: Accessor<ReadonlySet<string>>;
    /** Groups that are explicitly collapsed by the user (excludes ambient folds). */
    explicitlyCollapsedGroups: Accessor<ReadonlySet<string>>;
    /** Groups that are folded due to the current band (ambient, not explicit). */
    ambientFoldedGroups: Accessor<ReadonlySet<string>>;
    /** The selected group node, if it has clusterOf members. */
    selectedGroup: Accessor<{ id: string; clusterOf?: readonly string[] } | undefined>;
    /** Toggle explicit collapse state for a group by ID. */
    toggleGroupByID: (id: string) => void;
    /** Toggle explicit collapse state for the selected group. */
    toggleGroup: () => void;
    /** Collapse all other groups explicitly. */
    collapseOtherGroups: () => void;
    /** Called when pointer goes down on a group or its descendant. */
    onPointerDown: () => void;
    /** Called when pointer goes up. */
    onPointerUp: () => void;
};

const DWELL_MS = 150;

export function useGroupCollapse(options: UseGroupCollapseOptions): UseGroupCollapseReturn {
    const [localExplicitlyCollapsed, setLocalExplicitlyCollapsed] = createSignal<ReadonlySet<string>>(new Set());
    const [pointerDownOnGroup, setPointerDownOnGroup] = createSignal(false);

    // Use controlled explicitlyCollapsedGroups when provided, otherwise local state
    const explicitlyCollapsed = options.explicitlyCollapsedGroups ?? localExplicitlyCollapsed;

    // Resolve functional updates against whichever accessor owns the visible state
    const setExplicitlyCollapsed = (
        updater: ReadonlySet<string> | ((prev: ReadonlySet<string>) => ReadonlySet<string>),
    ) => {
        const newGroups = typeof updater === 'function' ? updater(explicitlyCollapsed()) : updater;
        setLocalExplicitlyCollapsed(newGroups);
        options.onExplicitlyCollapsedGroupsChange?.(newGroups);
    };

    const selectedGroup = createMemo(() => {
        const id = options.selection()[0];
        if (!id) return undefined;
        const model = options.model();
        const node = model.nodes.find((n) => n.id === id);
        return node && (node.clusterOf?.length ?? 0) > 0 ? { id: node.id, clusterOf: node.clusterOf } : undefined;
    });

    // Compute ambient folded groups based on band
    const computeAmbientFolded = createMemo(() => {
        const band = options.band?.();
        if (!band) return new Set<string>();

        // At overview band, all groups are ambient-folded
        if (band === 'overview') {
            const model = options.model();
            const groups = new Set<string>();
            for (const node of model.nodes) {
                if (node.clusterOf && node.clusterOf.length > 0) {
                    groups.add(node.id);
                }
            }
            return groups;
        }

        // At execution/detail, no ambient folding (groups are expanded by default)
        return new Set<string>();
    });

    // Dwell before applying ambient folds to prevent flapping
    const ambientFolded = useDebounce(computeAmbientFolded, DWELL_MS);

    // Combined collapsed groups: explicit OR ambient, but never fold if pointer down / descendant selected / dragging
    const collapsedGroups = createMemo(() => {
        const explicit = explicitlyCollapsed();
        const ambient = ambientFolded();
        const descendantSel = options.descendantSelected?.() ?? false;
        const dragging = options.draggingDescendant?.() ?? false;

        // Never fold while pointer is down on a group, a descendant is selected, or dragging
        if (pointerDownOnGroup() || descendantSel || dragging) {
            return explicit; // Only explicit collapse respected during interaction
        }

        // Union of explicit and ambient
        const combined = new Set<string>(explicit);
        for (const id of ambient) combined.add(id);
        return combined;
    });

    const toggleGroupByID = (id: string) =>
        setExplicitlyCollapsed((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleGroup = () => {
        const group = selectedGroup();
        if (!group) return;
        toggleGroupByID(group.id);
    };

    const collapseOtherGroups = () => {
        const group = selectedGroup();
        if (!group) return;
        setExplicitlyCollapsed(
            new Set(
                options
                    .model()
                    .nodes.filter((node) => node.id !== group.id && (node.clusterOf?.length ?? 0) > 0)
                    .map((node) => node.id),
            ),
        );
    };

    const onPointerDown = () => {
        setPointerDownOnGroup(true);
    };

    const onPointerUp = () => {
        setPointerDownOnGroup(false);
    };

    return {
        collapsedGroups,
        explicitlyCollapsedGroups: explicitlyCollapsed,
        ambientFoldedGroups: ambientFolded,
        selectedGroup,
        toggleGroupByID,
        toggleGroup,
        collapseOtherGroups,
        onPointerDown,
        onPointerUp,
    };
}