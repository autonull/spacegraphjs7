/** Named bundles of existing knobs and view flags. A preset never defines a knob. */
import type { GraphLayoutMode } from '../graph-layout';
import type { PolicyLayer, PolicyVector } from '../policy';

export type UIChrome = 'full' | 'compact' | 'minimal' | 'readable';

export interface UIPresetFlags {
    readonly graphLayout?: GraphLayoutMode;
    readonly graphAligned?: boolean;
    readonly ribbonCorridor?: boolean;
    readonly graphMorph?: boolean;
    readonly continuity?: boolean;
    readonly fieldTargets?: boolean;
    readonly collapseTranscript?: boolean;
}

export interface UIPreset {
    readonly id: string;
    readonly title: string;
    readonly hypothesis: string;
    readonly knobs: PolicyVector;
    readonly flags?: UIPresetFlags;
    readonly chrome?: UIChrome;
    readonly gates: readonly string[];
}

const preset = (
    id: string,
    title: string,
    hypothesis: string,
    knobs: PolicyVector,
    options: {
        readonly flags?: UIPresetFlags;
        readonly chrome?: UIChrome;
        readonly gates?: readonly string[];
    } = {},
): UIPreset => ({
    id,
    title,
    hypothesis,
    knobs,
    flags: options.flags,
    chrome: options.chrome ?? 'full',
    gates: options.gates ?? ['shell', 'grammar', 'vision', 'screenshots'],
});

export const UI_PRESETS: readonly UIPreset[] = [
    preset('full', 'Full chrome', 'Does the shipped arrangement still win?', {}),
    preset(
        'readable',
        'Readable chrome',
        'Does comfortable type, plain labels and an on-demand rail beat the dense instrument?',
        {},
        { chrome: 'readable', gates: ['shell', 'vision', 'screenshots'] },
    ),
    preset(
        'compact',
        'Compact chrome',
        'How little chrome is usable before the five tasks break?',
        {
            'navigation.minimap': false,
            'navigation.trail': false,
            'navigation.breadcrumbs': false,
        },
        { chrome: 'compact' },
    ),
    preset(
        'reading',
        'Reading type',
        'Is a larger label floor worth the density cost?',
        { 'ladder.minLabelPx': 16, 'geometry.padding': 60 },
        { chrome: 'compact', gates: ['grammar', 'vision', 'screenshots'] },
    ),
    preset(
        'presentation',
        'Presentation',
        'Does a quiet frame and a collapsed transcript improve demo clarity?',
        {
            'ladder.minLabelPx': 18,
            'theme.glow': 0.6,
            'emphasis.ribbonWidth': 100,
        },
        {
            chrome: 'minimal',
            flags: { collapseTranscript: true },
            gates: ['shell', 'vision', 'screenshots'],
        },
    ),
    preset(
        'one-index',
        'One index',
        'Does one primary index beat five?',
        {
            'navigation.minimap': false,
            'navigation.trail': false,
            'navigation.breadcrumbs': false,
            'orchestration.verbs': 'minimal',
        },
        { flags: { collapseTranscript: false } },
    ),
    preset(
        'scale-aware',
        'Scale-aware packing',
        'Does measured coverage tightening the mid/near graph beat the shipped sparse fit?',
        { 'geometry.occupancyTarget': 0.12 },
        { gates: ['grammar', 'vision', 'screenshots'] },
    ),
    preset(
        'continuity',
        'Continuous grammar',
        'Do collar, tapered core, side sheath and one accent make a run read as one strand?',
        {
            'theme.backdrop': 'flat',
            'ladder.minLabelPx': 16,
            'emphasis.ribbonWidth': 82,
            'theme.glow': 0.28,
        },
        { flags: { continuity: true }, gates: ['grammar', 'vision', 'screenshots'] },
    ),
    preset(
        'field-targets',
        'Solved scope fields',
        'Do scope fields anchored to solved targets read as one run while cards settle?',
        {},
        { flags: { fieldTargets: true }, gates: ['grammar', 'vision', 'screenshots'] },
    ),
    preset(
        'light-shell',
        'Light view',
        'Does the light view need the shell themed too?',
        { 'theme.variant': 'light' },
        { gates: ['shell', 'vision', 'screenshots'] },
    ),
    preset(
        'mono',
        'Mono chrome',
        'Is semantic status color in the chrome signal or noise?',
        { 'theme.glow': 0, 'theme.palette': 'mono' },
    ),
    preset(
        'morph',
        'Morph',
        'Does animated graph transition aid orientation or cost time?',
        {},
        { flags: { graphMorph: true }, gates: ['graph-layout', 'motion', 'screenshots'] },
    ),
    preset(
        'failure-first',
        'Failure first',
        'Does one dominant failure node improve accuracy?',
        {
            'emphasis.cap': 1,
            'emphasis.salienceSize': 3,
            'emphasis.focusScale': 2,
            'theme.palette': 'ember',
        },
        { chrome: 'compact' },
    ),
];

export const uiPresetById = (id: string | null | undefined): UIPreset | undefined =>
    id ? UI_PRESETS.find((entry) => entry.id === id) : undefined;

export const isUIPresetID = (id: string | null | undefined): boolean => Boolean(uiPresetById(id));

export interface UIPresetTarget {
    setPolicyLayer(layer: PolicyLayer, values: PolicyVector): void;
    setGraphLayout(mode: GraphLayoutMode): void;
    setGraphLayoutAligned(aligned: boolean): void;
    setRibbonCorridor(enabled: boolean): void;
    setGraphMorph(enabled: boolean): void;
    setContinuity(enabled: boolean): void;
    setFieldTargets(enabled: boolean): void;
    setTranscriptCollapsed(collapsed: boolean): void;
}

/** Apply a named preset through existing setters; the knob layer and DOM flag carry the state. */
export function applyUIPreset(
    id: string | null | undefined,
    target: UIPresetTarget,
): UIPreset | undefined {
    const found = uiPresetById(id);
    if (!found) return undefined;
    target.setPolicyLayer('experiment', found.knobs);
    if (found.flags) {
        const flags = found.flags;
        if (flags.graphLayout) target.setGraphLayout(flags.graphLayout);
        if (flags.graphAligned !== undefined) target.setGraphLayoutAligned(flags.graphAligned);
        if (flags.ribbonCorridor !== undefined) target.setRibbonCorridor(flags.ribbonCorridor);
        if (flags.graphMorph !== undefined) target.setGraphMorph(flags.graphMorph);
        if (flags.continuity !== undefined) target.setContinuity(flags.continuity);
        if (flags.fieldTargets !== undefined) target.setFieldTargets(flags.fieldTargets);
        if (flags.collapseTranscript !== undefined)
            target.setTranscriptCollapsed(flags.collapseTranscript);
    }
    if (typeof document !== 'undefined') document.body.dataset.uiChrome = found.chrome ?? 'full';
    return found;
}
