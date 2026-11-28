// The single catalogue of the seventeen console experiments. Demo paths come from the generated
// registry, so adding or moving an HTML page never leaves a stale link in the labs index.

import { demoPath } from './registry';

export interface LabExperiment {
    readonly id: string;
    readonly application: string;
    readonly metaphor: string;
    readonly job: string;
    readonly lift: readonly string[];
    readonly primitives: string;
}

export const LAB_EXPERIMENTS: readonly LabExperiment[] = [
    {
        id: 'console-margins',
        application: 'Reading & comparison',
        metaphor: 'A focused line has a causal chapter rail and a local graph rail.',
        job: 'A reader refocuses one console line and sees aligned chapter and graph rails; proof: a rail chip click changes the console focus.',
        lift: ['terminalRailModel', 'GraphConsoleRails'],
        primitives: 'terminalLineHTML, terminalChapters, terminalGrow, terminalLODFor',
    },
    {
        id: 'graph-portal',
        application: 'Reading & comparison',
        metaphor: 'A graph node opens into a console of its own lines.',
        job: 'An explorer descends from a node into its lines and returns; proof: clicking a line pushes a Trail entry and Back pops it.',
        lift: ['GraphPortal'],
        primitives: 'Trail, extractSubgraph, terminalLineHTML',
    },
    {
        id: 'facet-monitor',
        application: 'Reading & comparison',
        metaphor: 'One facet selector drives lines, counts and replay.',
        job: 'An operator filters a live log and replays a committed prefix; proof: facet pills, meter and sparkline agree with the visible lines.',
        lift: ['LogMonitor'],
        primitives: 'terminalFacets, terminalFacetMatch, terminalReplaySteps, playTerminalReplay',
    },
    {
        id: 'diff-console',
        application: 'Reading & comparison',
        metaphor: 'A diff is one model rendered as text and as graph tone.',
        job: 'A reviewer selects a changed line and sees matching nodes in both snapshots; proof: the diff row highlights both graphs.',
        lift: ['DiffView'],
        primitives: 'terminalDiff, terminalLineHTML',
    },
    {
        id: 'breadcrumb-console',
        application: 'Reading & comparison',
        metaphor: 'Navigation history is the console scope.',
        job: 'A reader descends scope levels and follows the breadcrumb trail back; proof: scope lines and the trail graph stay in step.',
        lift: ['TrailScopedConsole'],
        primitives: 'Trail, terminalLineHTML',
    },
    {
        id: 'vector-console',
        application: 'Reading & comparison',
        metaphor: 'The camera is the scroll through a terminal projection.',
        job: 'A reader wheels through a vector log and sees one fidelity band; proof: text, chapter frames and LOD swap together.',
        lift: ['VectorConsole'],
        primitives: 'terminalSpec, terminalLODFor, terminalGroup, HtmlNode',
    },
    {
        id: 'scale-narrative',
        application: 'Scale & density',
        metaphor: 'One scene holds five nested scales.',
        job: 'A presenter explains a system from service to line; proof: scale buttons set zoom and the ruler follows zoom:change.',
        lift: ['ScaleRuler'],
        primitives: 'GroupNode, ScaleDomain, zoom:change',
    },
    {
        id: 'morph-layout',
        application: 'Scale & density',
        metaphor: 'Layout is a continuous function of zoom.',
        job: 'An explorer zooms between ring, columns and lanes; proof: interpolated positions move only the ids reported by diffPositions.',
        lift: ['ZoomMorphLayout'],
        primitives: 'diffPositions, interpolatedPositions, playRepresentationChanges',
    },
    {
        id: 'vector-lens',
        application: 'Scale & density',
        metaphor: 'A magnifier is a second camera over a scoped neighbourhood.',
        job: 'An inspector hovers a dense node and reads its neighbourhood; proof: click pins the lens and Escape releases it.',
        lift: ['GraphLens'],
        primitives: 'extractSubgraph, SpaceGraph, camera projection',
    },
    {
        id: 'gravity-focus',
        application: 'Scale & density',
        metaphor: 'Attention is geometry, not a color overlay.',
        job: 'An operator hovers one node among many and sees neighbours gather; proof: moving away restores the committed layout.',
        lift: ['GatherFocus'],
        primitives: 'diffPositions, playRepresentationChanges',
    },
    {
        id: 'lasso-scope',
        application: 'Scale & density',
        metaphor: 'A brushed rectangle is a graph scope.',
        job: 'An operator brushes a region and reads scoped nodes and internal edges; proof: Escape clears the frame without changing the graph.',
        lift: ['GraphLasso'],
        primitives: 'GroupNode, pointer geometry, scoped read model',
    },
    {
        id: 'edge-travel',
        application: 'Navigation & structure',
        metaphor: 'Edges are roads and the camera is the vehicle.',
        job: 'A navigator clicks an edge and travels to its target; proof: Backspace returns along the Trail.',
        lift: ['EdgeTravel'],
        primitives: 'edgePath, Trail, playRepresentationChanges',
    },
    {
        id: 'fold-unfold',
        application: 'Navigation & structure',
        metaphor: 'A node is a folded subgraph.',
        job: 'A reader unfolds a container and refolds it; proof: outer edges keep their ids through the animation.',
        lift: ['FoldableNode'],
        primitives: 'innerTree, innerPlacements, playRepresentationChanges',
    },
    {
        id: 'window-desktop',
        application: 'Windows & widgets',
        metaphor: 'A node is a window with tabs and an inner widget area.',
        job: 'An operator switches tabs, resizes a window and sees content scale; proof: far zoom collapses the window to a title card.',
        lift: ['GraphWindow'],
        primitives: 'HtmlNode drag/resize, setSize, innerPlacements, terminalLODFor',
    },
    {
        id: 'widget-detach',
        application: 'Windows & widgets',
        metaphor: 'An inner widget can become a first-class node.',
        job: 'An operator detaches a widget and reattaches it; proof: the contains edge appears and disappears with the node.',
        lift: ['InnerWidget'],
        primitives: 'innerPlacements, HtmlNode, contains edge',
    },
    {
        id: 'agent-team',
        application: 'Agentic development',
        metaphor: 'Steering is an edge from the operator.',
        job: 'An operator steers one agent, approves another and brushes a team scope; proof: the log and team edges reflect both transitions.',
        lift: ['AgentTeamView', 'SteerEdge', 'TeamScope'],
        primitives: 'GroupNode, edge read model, taskbar tabs',
    },
    {
        id: 'dev-session',
        application: 'Agentic development',
        metaphor: 'A session is a graph you can replay and steer.',
        job: 'A developer scrubs a committed prefix, travels an edge and opens an event window; proof: the replay prefix and inspector agree.',
        lift: ['SessionAtlas', 'ReplayScrubber', 'EventWindow'],
        primitives: 'terminalChapters, terminalReplaySteps, edgePath, Trail',
    },
];

export const LAB_APPLICATIONS: readonly string[] = [
    ...new Set(LAB_EXPERIMENTS.map((entry) => entry.application)),
];

export const labExperimentsFor = (application: string) =>
    LAB_EXPERIMENTS.filter((entry) => entry.application === application);

export const labHref = (experiment: LabExperiment) => demoPath(experiment.id);
