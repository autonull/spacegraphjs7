/** The configuration spine: one typed, serializable catalog of every host choice. */

export const POLICY_FAMILIES = [
    'bands',
    'ladder',
    'salience',
    'emphasis',
    'camera',
    'depth',
    'widgets',
    'geometry',
    'guardrails',
    'surface',
    'navigation',
    'orchestration',
    'theme',
] as const;
export type PolicyFamily = (typeof POLICY_FAMILIES)[number];

export type KnobValue = number | string | boolean;

interface KnobBase<T extends KnobValue> {
    readonly id: string;
    readonly family: PolicyFamily;
    readonly default: T;
    /** What the knob controls, in one sentence. */
    readonly description: string;
    /** The open question in `docs/not-decided.md` this knob answers. */
    readonly rationale: string;
}

export interface NumberKnob extends KnobBase<number> {
    readonly type: 'number';
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

export interface EnumKnob<T extends string = string> extends KnobBase<T> {
    readonly type: 'enum';
    readonly options: readonly T[];
}

export interface BooleanKnob extends KnobBase<boolean> {
    readonly type: 'boolean';
}

export type PolicyKnob = NumberKnob | EnumKnob | BooleanKnob;

export type PolicyVector = Readonly<Record<string, KnobValue>>;

export interface PolicySchema {
    readonly version: number;
    readonly knobs: readonly PolicyKnob[];
}

const number = (
    id: string,
    family: PolicyFamily,
    def: number,
    min: number,
    max: number,
    step: number,
    description: string,
    rationale: string,
): NumberKnob => ({ id, family, type: 'number', default: def, min, max, step, description, rationale });

const enumeration = <T extends string>(
    id: string,
    family: PolicyFamily,
    def: T,
    options: readonly T[],
    description: string,
    rationale: string,
): EnumKnob<T> => ({ id, family, type: 'enum', default: def, options, description, rationale });

const flag = (
    id: string,
    family: PolicyFamily,
    def: boolean,
    description: string,
    rationale: string,
): BooleanKnob => ({ id, family, type: 'boolean', default: def, description, rationale });

export const POLICY_SCHEMA: PolicySchema = {
    version: 1,
    knobs: [
        number('bands.overviewMax', 'bands', 0.45, 0.1, 1, 0.01, 'Zoom below this enters overview.', '1'),
        number('bands.overviewEnter', 'bands', 0.7, 0.2, 1.5, 0.01, 'Zoom above this leaves overview.', '1'),
        number('bands.detailMin', 'bands', 1.8, 1, 4, 0.01, 'Zoom above this enters detail.', '1'),
        number('bands.detailExit', 'bands', 1.5, 0.8, 3, 0.01, 'Zoom below this leaves detail.', '1'),
        number('ladder.promoteAt', 'ladder', 0.6, 0, 1, 0.01, 'Activity that promotes a rung.', '2'),
        number('ladder.legibilityGate', 'ladder', 0.7, 0, 1, 0.01, 'Legibility required to promote.', '2'),
        number('ladder.demoteBelow', 'ladder', 0.5, 0, 1, 0.01, 'Legibility below which detail demotes.', '2'),
        number('ladder.blendMs', 'ladder', 120, 0, 1000, 20, 'Rung crossfade duration.', '2'),
        number('ladder.minLabelPx', 'ladder', 14, 8, 32, 1, 'Minimum on-screen label size at any rung.', '2'),
        number('salience.decayRate', 'salience', 1.6, 0.1, 6, 0.1, 'Exponential activity decay rate.', '3'),
        number('emphasis.cap', 'emphasis', 1, 0.2, 1, 0.05, 'Upper bound on node emphasis.', '4'),
        number('emphasis.trace', 'emphasis', 1, 0.2, 1, 0.05, 'Emphasis given to traced nodes.', '4'),
        number('emphasis.focusScale', 'emphasis', 1, 1, 3, 0.1, 'Size multiplier on the focused node; 1 disables focus scaling.', '4'),
        number('emphasis.neighborScale', 'emphasis', 1, 0.8, 1.6, 0.05, 'Size multiplier on its neighborhood; 1 disables.', '4'),
        number('emphasis.contextScale', 'emphasis', 1, 0.5, 1, 0.05, 'Size multiplier on context while focused; 1 disables.', '4'),
        number('emphasis.innerDepth', 'emphasis', 1, 0, 3, 1, 'Recursion depth of the detail-node inner layout.', '4'),
        number('emphasis.ribbonWidth', 'emphasis', 1.5, 0, 12, 0.5, 'Maximum faceted ribbon width; 0 disables ribbons.', '4'),
        enumeration(
            'emphasis.ribbonKinds',
            'emphasis',
            'causal',
            ['causal', 'all', 'none'] as const,
            'Which causal relations get a ranked ribbon; context edges stay thin and dim.',
            '4',
        ),
        number(
            'emphasis.salienceSize',
            'emphasis',
            1.15,
            1,
            3,
            0.05,
            'Upper bound on salience-driven node size; 1 disables, 3 is the opt-in scale.',
            '4',
        ),
        enumeration(
            'emphasis.innerLayout',
            'emphasis',
            'grid',
            ['grid', 'row', 'column', 'radial', 'lane'] as const,
            'Placement of chips in the detail-node inner layout.',
            '4',
        ),
        number('camera.verbMs', 'camera', 900, 100, 3000, 50, 'Camera flight duration.', '5'),
        number('camera.traceMs', 'camera', 200, 50, 1500, 50, 'Trace sweep duration.', '5'),
        number('depth.step', 'depth', 40, 40, 600, 10, 'Depth separation per axis unit.', '6'),
        enumeration('depth.mode', 'depth', 'flat', ['flat', 'layered', 'depth-stack', 'orbit'] as const, 'Depth treatment.', '6'),
        enumeration('widgets.dock', 'widgets', 'rail', ['rail', 'float'] as const, 'Where pinned instruments dock.', '7'),
        number('geometry.gap', 'geometry', 190, 40, 500, 10, 'Base gap between scopes.', '9'),
        number('geometry.padding', 'geometry', 36, 0, 160, 2, 'Node padding inside a scope.', '9'),
        number('geometry.repulsion', 'geometry', 1800, 0, 8000, 50, 'Transient force repulsion.', '9'),
        number('guardrails.window', 'guardrails', 60, 1, 500, 1, 'Newest turns drawn.', '9'),
        number('guardrails.overviewCards', 'guardrails', 12, 1, 200, 1, 'Overview DOM card budget.', '9'),
        number('guardrails.executionCards', 'guardrails', 40, 1, 400, 1, 'Execution DOM card budget.', '9'),
        number('guardrails.detailCards', 'guardrails', 24, 1, 200, 1, 'Detail DOM card budget.', '9'),
        enumeration('surface.mode', 'surface', 'hybrid', ['log', 'map', 'hybrid'] as const, 'Default surface.', '8'),
        enumeration('surface.arrangement', 'surface', 'side', ['stacked', 'side', 'floating'] as const, 'Transcript arrangement.', '8'),
        flag('navigation.minimap', 'navigation', true, 'Show the minimap.', '8'),
        flag('navigation.breadcrumbs', 'navigation', true, 'Show the portal breadcrumb.', '8'),
        flag('navigation.trail', 'navigation', true, 'Show the navigation trail.', '8'),
        enumeration(
            'navigation.touch',
            'navigation',
            'default',
            ['default', 'minimal', 'off'] as const,
            'Touch gesture map preset for the navigation verbs.',
            'B1',
        ),
        enumeration('orchestration.verbs', 'orchestration', 'full', ['full', 'minimal'] as const, 'Which orchestration verbs appear.', '8'),
        enumeration('theme.variant', 'theme', 'dark', ['dark', 'light'] as const, 'Resolved theme variant.', '10'),
        enumeration(
            'theme.palette',
            'theme',
            'mono',
            ['mono', 'neon', 'ember', 'aurora', 'circuit'] as const,
            'View color palette for nodes, edges and accents; the HUD stays grayscale.',
            '10',
        ),
        enumeration(
            'theme.backdrop',
            'theme',
            'grid',
            ['flat', 'grid', 'starfield'] as const,
            'Subtle backdrop treatment behind the canvas.',
            '10',
        ),
        number('theme.glow', 'theme', 0, 0, 1, 0.1, 'Emissive glow strength on node cards.', '10'),
    ],
};

export const knobByID = (schema: PolicySchema, id: string): PolicyKnob | undefined =>
    schema.knobs.find((knob) => knob.id === id);

export const defaultVector = (schema: PolicySchema): PolicyVector =>
    Object.fromEntries(schema.knobs.map((knob) => [knob.id, knob.default]));

/** Coerce one untrusted value at the boundary; invalid values are dropped, numbers are clamped. */
export const coerceValue = (knob: PolicyKnob, value: unknown): KnobValue | undefined => {
    if (knob.type === 'boolean') {
        if (typeof value === 'boolean') return value;
        if (value === 'true') return true;
        if (value === 'false') return false;
        return undefined;
    }
    if (knob.type === 'number') {
        const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
        if (!Number.isFinite(parsed)) return undefined;
        return Math.min(knob.max, Math.max(knob.min, parsed));
    }
    return typeof value === 'string' && knob.options.includes(value) ? value : undefined;
};

export const sanitizeVector = (schema: PolicySchema, values: Readonly<Record<string, unknown>>): PolicyVector => {
    const result: Record<string, KnobValue> = {};
    for (const knob of schema.knobs) {
        const value = coerceValue(knob, values[knob.id]);
        if (value !== undefined) result[knob.id] = value;
    }
    return result;
};
