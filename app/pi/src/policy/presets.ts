import { sanitizeVector, type PolicySchema, type PolicyVector } from './schema';

export interface PolicyPreset {
    readonly id: string;
    readonly title: string;
    /** The question this preset explores, so a gallery entry is an experiment, not a recommendation. */
    readonly question: string;
    readonly vector: PolicyVector;
}

const preset = (
    id: string,
    title: string,
    question: string,
    vector: PolicyVector,
): PolicyPreset => ({ id, title, question, vector });

export const POLICY_PRESETS: readonly PolicyPreset[] = [
    preset('baseline', 'Baseline', 'What do the current host choices do?', {}),
    preset(
        'quiet',
        'Quiet cockpit',
        'Does less motion and fewer orientation aids still support the five tasks? (5, 8)',
        { 'camera.verbMs': 250, 'camera.traceMs': 100, 'emphasis.cap': 0.6, 'navigation.minimap': false },
    ),
    preset(
        'wide-bands',
        'Wide bands',
        'Where should the zoom bands actually sit? (1)',
        { 'bands.overviewMax': 0.3, 'bands.overviewEnter': 0.5, 'bands.detailMin': 2.4, 'bands.detailExit': 2 },
    ),
    preset(
        'dense',
        'Dense inspector',
        'How many cards and turns can a developer use before legibility drops? (2, 9)',
        { 'guardrails.window': 160, 'guardrails.executionCards': 120, 'geometry.gap': 120 },
    ),
    preset(
        'flat-map',
        'Flat map',
        'Is depth worth a default at all? (6)',
        { 'depth.mode': 'flat', 'surface.mode': 'map', 'surface.arrangement': 'floating' },
    ),
    preset(
        'full-cockpit',
        'Full cockpit',
        'Do more orchestration verbs and visible orientation aids help? (8)',
        { 'orchestration.verbs': 'full', 'navigation.breadcrumbs': true, 'navigation.trail': true, 'widgets.dock': 'float' },
    ),
    preset('light', 'Light theme', 'Which theme variant is legible for the canonical fixture? (10)', {
        'theme.variant': 'light',
    }),
    preset(
        'neon',
        'Neon cockpit',
        'Does an emissive palette make targets easier to find without hiding the HUD? (10)',
        { 'theme.palette': 'neon', 'theme.backdrop': 'grid', 'theme.glow': 0.6, 'geometry.gap': 60 },
    ),
    preset(
        'ember',
        'Ember incident',
        'Does a warm severity palette make failure nodes easier to spot? (10)',
        { 'theme.palette': 'ember', 'theme.backdrop': 'grid', 'theme.glow': 0.4 },
    ),
    preset(
        'aurora',
        'Aurora map',
        'Is a cool low-glare palette legible on the full-scope map? (10)',
        { 'theme.palette': 'aurora', 'theme.backdrop': 'starfield', 'geometry.gap': 120 },
    ),
    preset(
        'circuit',
        'Circuit map',
        'Does a PCB-style palette keep edges distinct at floating density? (10)',
        { 'theme.palette': 'circuit', 'theme.backdrop': 'grid', 'theme.glow': 0.3 },
    ),
    preset(
        'focus-lens',
        'Focus lens',
        'Does scaling the focused node and dimming context help or annoy? (4)',
        {
            'emphasis.focusScale': 1.6,
            'emphasis.neighborScale': 1.1,
            'emphasis.contextScale': 0.85,
            'theme.palette': 'neon',
            'theme.glow': 0.7,
            'theme.backdrop': 'grid',
        },
    ),
    preset(
        'fractal',
        'Fractal lens',
        'Does a two-level inner layout make scope recursion legible at detail zoom? (4)',
        {
            'emphasis.innerDepth': 2,
            'emphasis.innerLayout': 'grid',
            'theme.palette': 'aurora',
            'theme.backdrop': 'starfield',
        },
    ),
    preset(
        'showcase',
        'Showcase',
        'How compact can a multi-turn run stay while every node remains legible? (2, 9)',
        {
            'geometry.gap': 40,
            'geometry.padding': 0,
            'geometry.repulsion': 200,
            'depth.step': 40,
            'guardrails.window': 40,
        },
    ),
];

export const presetById = (id: string): PolicyPreset | undefined =>
    POLICY_PRESETS.find((entry) => entry.id === id);

export const presetVector = (schema: PolicySchema, id: string): PolicyVector | undefined => {
    const found = presetById(id);
    return found ? sanitizeVector(schema, found.vector) : undefined;
};
