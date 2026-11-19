import { buildManifest } from '@spacegraphjs/config';
import { libraryManifest, LIBRARY_CONTRACT_VERSION } from '@spacegraphjs/config/library';
import { agentDomain, agentFacetAccessors, agentVocabulary } from '@spacegraphjs/agent';
import {
    changedArtifacts,
    delegationContributions,
    downstream,
    failures,
    ledHere,
    why,
} from '@spacegraphjs/agent';
import { KernelCodec, type Kernel } from '@spacegraphjs/kernel';
import { applyFacets } from '@spacegraphjs/search';
import type { GraphFacets } from '@spacegraphjs/shared';
import type { AgentView } from '@spacegraphjs/agent';
import type { RenderTheme } from '@spacegraphjs/renderer';

export type CapabilityContext = {
    readonly kernel: Kernel;
    readonly view: AgentView;
    readonly theme: RenderTheme;
};

export type Capability = {
    readonly id: string;
    readonly title: string;
    readonly summary: string;
    readonly run: (context: CapabilityContext) => readonly string[];
};

const target = (view: AgentView, kind: string): string =>
    view.nodes.find((node) => node.kind === kind)?.id ?? view.nodes[0]?.id ?? '';

const emptyFacets: GraphFacets = {
    query: '',
    kinds: new Set(),
    statuses: new Set(),
    domains: new Set(),
};

export const CAPABILITIES: readonly Capability[] = [
    {
        id: 'stream',
        title: 'Kernel op stream',
        summary: 'Pi events become kernel ops; the client folds them into a Kernel.',
        run: ({ kernel }) => [
            `${kernel.nodes.length} nodes, ${kernel.edges.length} edges`,
            `version ${kernel.version}`,
            `diagnostics: ${JSON.stringify(kernel.diagnostics())}`,
        ],
    },
    {
        id: 'vocabulary',
        title: 'Open-ended agent vocabulary',
        summary: 'String kinds and advisory role tags; no host enum.',
        run: ({ view }) => [
            `kinds: ${[...new Set(view.nodes.map((node) => node.kind))].join(', ')}`,
            `lanes: ${agentVocabulary.lanes?.join(', ')}`,
            `domain: ${agentDomain.id}`,
        ],
    },
    {
        id: 'why',
        title: 'Why did this happen?',
        summary: 'Answer nodes behind an artifact through provenance edges.',
        run: ({ view }) => {
            const id = target(view, 'artifact');
            const trace = why(view, id);
            return [`from ${id}`, `answers: ${[...trace.answerIds].join(', ') || 'none'}`];
        },
    },
    {
        id: 'led-here',
        title: 'What led here?',
        summary: 'Forward sequence from the first unit.',
        run: ({ view }) => {
            const trace = ledHere(view, target(view, 'unit'));
            return [`answers: ${[...trace.answerIds].join(', ') || 'none'}`];
        },
    },
    {
        id: 'downstream',
        title: 'What came downstream?',
        summary: 'Sequence, writes and delegation edges.',
        run: ({ view }) => {
            const trace = downstream(view, target(view, 'action'));
            return [`answers: ${[...trace.answerIds].join(', ') || 'none'}`];
        },
    },
    {
        id: 'failures',
        title: 'Which actions failed?',
        summary: 'Failed statuses and retry nodes.',
        run: ({ view }) => [`failures: ${failures(view).join(', ') || 'none'}`],
    },
    {
        id: 'artifacts',
        title: 'Which files changed?',
        summary: 'Artifacts reached through writes edges.',
        run: ({ view }) => [`changed: ${changedArtifacts(view).join(', ') || 'none'}`],
    },
    {
        id: 'delegation',
        title: 'Delegation contributions',
        summary: 'Nested actions connected by delegates edges.',
        run: ({ view }) => {
            const id = target(view, 'action');
            return [`contributions: ${delegationContributions(view, id).join(', ') || 'none'}`];
        },
    },
    {
        id: 'facets',
        title: 'Faceted filtering',
        summary: 'The library filters the agent model through host accessors.',
        run: ({ view }) => {
            const result = applyFacets({ model: view, facets: emptyFacets, accessors: agentFacetAccessors });
            return [`kept ${result.nodes.length} of ${view.nodes.length} nodes`];
        },
    },
    {
        id: 'manifest',
        title: 'Manifest negotiation',
        summary: 'Library and domain contributions share one manifest.',
        run: () => {
            const manifest = buildManifest(LIBRARY_CONTRACT_VERSION, [
                ...libraryManifest().entries,
                ...agentDomain.manifest(),
            ]);
            return [`${manifest.entries.length} entries at contract ${manifest.contractVersion}`];
        },
    },
    {
        id: 'export',
        title: 'Kernel export',
        summary: 'The stream is portable through the kernel codec.',
        run: ({ kernel }) => [`${KernelCodec.encode(kernel).length} bytes encoded`],
    },
    {
        id: 'theme',
        title: 'Theme and contrast',
        summary: 'Host tokens resolve to a RenderTheme.',
        run: ({ theme }) => [
            `background ${theme.background}`,
            `accent ${theme.accent}`,
            `direction ${theme.direction ?? 'ltr'}`,
        ],
    },
];

export const runCapability = (id: string, context: CapabilityContext): readonly string[] => {
    const capability = CAPABILITIES.find((entry) => entry.id === id);
    if (!capability) throw new Error(`unknown capability: ${id}`);
    return capability.run(context);
};

export const capabilityContext = (kernel: Kernel, view: AgentView, theme: RenderTheme): CapabilityContext => ({
    kernel,
    view,
    theme,
});
