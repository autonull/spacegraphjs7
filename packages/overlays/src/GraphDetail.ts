import type { GraphNode, GraphViewData, GraphDiffSource } from '@spacegraphjs/shared/types';
import type { I18n } from '@spacegraphjs/shared/i18n';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import type { JSX } from 'solid-js';

export type GraphDetailProps = {
    /** The graph model. */
    model: GraphViewData;
    /** The diff source for showing diffs. */
    diffSource?: GraphDiffSource;
    /** Custom summary renderer. */
    renderSummary?: (node: GraphNode) => JSX.Element | undefined;
    /** Link to the session. */
    link?: string;
    /** Callback to copy the view. */
    onCopyView?: () => void;
    /** Callback when a node is selected. */
    onSelect?: (id: string | undefined) => void;
    /** Callback to open a transcript. */
    onOpenTranscript?: (id: string) => void;
    /** Callback to open a session. */
    onOpenSession?: (sessionID: string) => void;
    /** Callback to open a window. */
    onOpenWindow?: (kind: string, nodeID?: string) => void;
    /** The kind of trace to show. */
    traceKind?: 'why' | 'led-here' | 'related';
    /** Callback for trace why. */
    onTraceWhy?: (node: GraphNode) => void;
    /** Callback for trace led here. */
    onTraceLedHere?: (node: GraphNode) => void;
    /** Callback for trace related. */
    onTraceRelated?: (node: GraphNode) => void;
    /** Callback to clear trace. */
    onClearTrace?: () => void;
    /** Callback to copy trace outline. */
    onCopyTraceOutline?: () => void;
    /** Callback to edit a note. */
    onEditNote?: (node: GraphNode) => void;
    /** Callback to delete a note. */
    onDeleteNote?: (node: GraphNode) => void;
    /** Callback to copy a note. */
    onCopyNote?: (node: GraphNode) => void;
};

export type GraphDetailSurfaceProps = GraphDetailProps & {
    node: GraphNode;
    Icon?: IconComponent;
    i18n: I18n;
};
