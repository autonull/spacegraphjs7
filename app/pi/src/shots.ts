import { findShotByID } from 'spacegraphjs/experiments';
import type { PolicyVector } from './policy';
import { FIT_OCTAVES } from './policy/adaptive-fit';
import type { Arrangement, Rung, Surface } from './view-modes';

/** Pi keeps its one-argument adapter; the lookup itself is host-neutral. */
export const shotById = (id: string | null | undefined): Shot | undefined =>
    findShotByID(SHOTS, id);

export type ShotSurface = Surface;
export type ShotArrangement = Arrangement;
export type ShotLevel = Rung;

/** A deterministic view of the flagship. Pure data: one URL launches exactly this state. */
export interface Shot {
    readonly id: string;
    readonly file: string;
    readonly title: string;
    readonly question: string;
    readonly scenario: 'canonical' | 'rich';
    /** Deterministic fixture declared by the shot, not inferred from its id. */
    readonly fixture?: 'octaves' | 'chapters' | 'rich';
    readonly preset?: string;
    /** Named UI preset applied after the shot's own vector, so a shot stays reproducible. */
    readonly ui?: string;
    readonly vector?: PolicyVector;
    readonly surface?: ShotSurface;
    readonly arrangement?: ShotArrangement;
    /** Opt-in graph arrangement applied before capture. */
    readonly graphLayout?: string;
    /** Opt-in per-octave card colouring; only applies with the octaves layout. */
    readonly octavePalette?: boolean;
    /** Opt-in cap on packed chapter columns; the viewport still caps it further. */
    readonly graphColumns?: number;
    readonly collapsed?: boolean;
    /** A quiet frame gives the canvas the full width; graph shots use it, chrome shots keep the rail. */
    readonly rail?: boolean;
    readonly inspectorTab?: 'detail' | 'inner' | 'signals' | 'actions';
    readonly level?: ShotLevel;
    readonly reveal?: string;
    readonly evidence?: string;
    readonly frame?: readonly string[];
    readonly viewport?: { readonly width: number; readonly height: number };
    /** Reframe with aspect-aware insets before applying an octave or zoom. */
    readonly fit?: boolean;
    /** Zoom relative to the fit, in octaves (2^octave). */
    readonly octave?: number;
    readonly zoom?: number;
    readonly minScale?: number;
    readonly padding?: number;
    readonly expandFirst?: boolean;
    readonly catalog?: boolean;
    readonly panel?: boolean;
}

type ShotSpec = Omit<Shot, 'scenario'>;

const node = (id: string): string => `pi:local:${id}`;

const octaveShot = (aspect: 'wide' | 'narrow', octave: number): ShotSpec => {
    const label = octave < 0 ? 'far' : octave > 0 ? 'near' : 'mid';
    const narrow = aspect === 'narrow';
    return {
        id: `fit-${aspect}-${label}`,
        file: `pi/pi-agent-fit-${aspect}-${label}.png`,
        title: `Fit ${aspect} · ${label} (2^${octave})`,
        question: `Does the graph fit and stay legible at ${2 ** octave}× zoom on a ${aspect} canvas?`,
        preset: 'aurora',
        surface: 'map',
        rail: false,
        level: 'execution',
        viewport: narrow ? { width: 900, height: 1000 } : { width: 1600, height: 1000 },
        fit: true,
        octave,
        padding: 40,
    };
};

const uiShot = (id: string, title: string, question: string): ShotSpec => ({
    id: `ui-${id}`,
    file: `pi/pi-agent-ui-${id}.png`,
    title,
    question,
    preset: 'baseline',
    ui: id,
    surface: 'hybrid',
    arrangement: 'side',
    evidence: 'vocabulary',
});

const SHOT_SPECS: readonly ShotSpec[] = [
    ...FIT_OCTAVES.flatMap((octave) => [octaveShot('wide', octave), octaveShot('narrow', octave)]),
    uiShot('full', 'UI · Full chrome', 'Does the shipped arrangement still win the five tasks?'),
    uiShot('readable', 'UI · Readable chrome', 'Do comfortable type, plain words and an on-demand rail make the five tasks easier?'),
    uiShot('compact', 'UI · Compact chrome', 'How little chrome is usable before the five tasks break?'),
    uiShot('reading', 'UI · Reading type', 'Is a larger label floor worth the density cost?'),
    uiShot('presentation', 'UI · Presentation', 'Does a quiet frame and collapsed transcript improve demo clarity?'),
    uiShot('scale-aware', 'UI · Scale-aware packing', 'Does packing toward measured coverage fill the mid canvas without losing legibility?'),
    uiShot('continuity', 'UI · Continuous grammar', 'Do collar, core, sheath and one accent make a run read as one strand?'),
    uiShot('field-targets', 'UI · Solved scope fields', 'Do scope frames anchored to solved targets read as one run while cards settle?'),
    uiShot('menus', 'UI · Menus chrome', 'Do grouped controls in a menu beat a permanent command bar?'),
    uiShot('statusline', 'UI · Status line', 'Do four labelled status sections beat one attention line?'),
    uiShot('light-shell', 'UI · Light view', 'Does the light view need the shell themed too?'),
    {
        id: 'cockpit',
        file: 'pi/pi-agent-in-action.png',
        title: 'Agent cockpit',
        question: 'What does the dense, compact multi-turn run look like at one glance?',
        preset: 'showcase',
        rail: false,
        padding: 40,
        surface: 'hybrid',
        arrangement: 'side',
        evidence: 'vocabulary',
        expandFirst: true,
    },
    {
        id: 'node-detail',
        file: 'pi/pi-agent-node-detail.png',
        title: 'Node detail',
        question: 'What does LOD reveal when the camera closes into one failing node and its inner layout?',
        preset: 'neon',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
        level: 'detail',
        reveal: node('failed'),
        evidence: 'failures',
        zoom: 0.92,
    },
    {
        id: 'deep-focus',
        file: 'pi/pi-agent-deep-focus.png',
        title: 'Deep focus',
        question: 'How much can one node carry when the camera commits to it? (opt-in scale)',
        preset: 'focus-lens',
        rail: false,
        surface: 'map',
        level: 'detail',
        reveal: node('approve'),
        evidence: 'why',
        frame: [node('approve')],
        minScale: 1.2,
        padding: 40,
    },
    {
        id: 'fractal',
        file: 'pi/pi-agent-fractal.png',
        title: 'Fractal lens',
        question: 'Does a two-level inner layout make recursive scope structure legible?',
        preset: 'fractal',
        vector: { 'emphasis.innerLayout': 'radial' },
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
        level: 'detail',
        reveal: node('x3'),
        evidence: 'delegation',
        frame: [node('x3')],
        zoom: 0.8,
    },
    {
        id: 'dense-type',
        file: 'pi/pi-agent-dense-type.png',
        title: 'Dense typography',
        question: 'Do tighter cards and a higher label floor pack more of the run without overlap?',
        preset: 'dense-type',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
        evidence: 'vocabulary',
        padding: 40,
    },
    {
        id: 'living-graph',
        file: 'pi/pi-agent-living-graph.png',
        title: 'Living graph',
        question: 'Does a longer activity tail and slower rung/camera blending make state changes easier to follow?',
        preset: 'living-graph',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
    },
    {
        id: 'recursion',
        file: 'pi/pi-agent-recursion.png',
        title: 'Bounded recursion',
        question: 'Does a three-level inner graph stay legible and bounded inside one focused node?',
        preset: 'fractal',
        vector: { 'emphasis.innerDepth': 3, 'emphasis.innerLayout': 'radial' },
        rail: false,
        inspectorTab: 'inner',
        surface: 'hybrid',
        arrangement: 'side',
        level: 'detail',
        reveal: node('x3'),
        evidence: 'delegation',
        frame: [node('x3')],
        zoom: 0.8,
    },
    {
        id: 'dynamic-range',
        file: 'pi/pi-agent-dynamic-range.png',
        title: 'Dynamic range',
        question: 'How far out can the scene zoom before the overview stops communicating structure?',
        preset: 'aurora',
        surface: 'map',
        vector: { 'bands.overviewMax': 0.3, 'bands.overviewEnter': 0.45 },
        rail: false,
        zoom: 0.58,
        padding: 40,
    },
    {
        id: 'octaves',
        file: 'pi/pi-agent-octaves.png',
        title: 'Multi-octave range',
        question: 'Does one hierarchy drawn at 1x, 1/2x and 1/4x make zoom legible as a fractal range?',
        fixture: 'octaves',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'octaves',
        fit: true,
        padding: 40,
        viewport: { width: 2400, height: 1400 },
    },
    {
        id: 'octaves-palette',
        file: 'pi/pi-agent-octaves-palette.png',
        title: 'Multi-octave range · palette',
        question: 'Does step colouring per octave make the scale hierarchy legible without changing positions?',
        fixture: 'octaves',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'octaves',
        octavePalette: true,
        fit: true,
        padding: 40,
        viewport: { width: 2400, height: 1400 },
    },
    {
        id: 'octaves-near',
        file: 'pi/pi-agent-octaves-near.png',
        title: 'Multi-octave range · near',
        question: 'Does zooming into one octave promote the smallest cards to legible detail?',
        fixture: 'octaves',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'octaves',
        frame: [node('obranch1')],
        zoom: 1.3,
        viewport: { width: 1600, height: 1000 },
    },
    {
        id: 'layout-stacked',
        file: 'pi/pi-agent-layout-stacked.png',
        title: 'Stacked layout',
        question: 'Does a transcript below the graph preserve the descent spine at wide widths?',
        preset: 'ember',
        surface: 'hybrid',
        arrangement: 'stacked',
        evidence: 'artifacts',
    },
    {
        id: 'layout-floating',
        file: 'pi/pi-agent-layout-floating.png',
        title: 'Floating layout',
        question: 'How much canvas does a floating transcript give back to the graph?',
        preset: 'circuit',
        surface: 'hybrid',
        arrangement: 'floating',
        collapsed: true,
    },
    {
        id: 'neon-cockpit',
        file: 'pi/pi-agent-neon-cockpit.png',
        title: 'Neon cockpit',
        question: 'Does an emissive palette make the run easier to scan without hiding the HUD?',
        preset: 'neon',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
        evidence: 'why',
        expandFirst: true,
    },
    {
        id: 'aurora-map',
        file: 'pi/pi-agent-aurora-map.png',
        title: 'Aurora map',
        question: 'Is a cool low-glare palette legible on the full-scope map?',
        preset: 'aurora',
        rail: false,
        surface: 'map',
    },
    {
        id: 'timeline-rows',
        file: 'pi/pi-agent-timeline-rows.png',
        title: 'Timeline · horizontal stripes',
        question: 'Are stacked turn rows legible when time runs top-to-bottom?',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'timeline-rows',
        fit: true,
        padding: 40,
    },
    {
        id: 'chapters',
        file: 'pi/pi-agent-chapters.png',
        title: 'Chapters · turn subgraphs',
        question: 'Does one card per turn, with its work inside, read as a compact story?',
        fixture: 'chapters',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'chapters',
        fit: true,
        padding: 40,
    },
    {
        id: 'chapters-wide',
        file: 'pi/pi-agent-chapters-wide.png',
        title: 'Chapters · wide columns',
        question: 'Does a viewport-derived wider chapter grid keep every turn card legible?',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'chapters',
        graphColumns: 4,
        viewport: { width: 2400, height: 1000 },
        fit: true,
        padding: 40,
    },
    {
        id: 'ergonomic',
        file: 'pi/pi-agent-ergonomic.png',
        title: 'Ergonomic packing',
        question: 'Does a measured, surface-fitted grid read better than a hand-picked arrangement?',
        preset: 'aurora',
        rail: false,
        surface: 'map',
        graphLayout: 'ergonomic',
        fit: true,
        padding: 40,
    },
    {
        id: 'light-theme',
        file: 'pi/pi-agent-light.png',
        title: 'Light theme',
        question: 'Which theme variant keeps the canonical fixture legible in daylight?',
        preset: 'light',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
    },
    {
        id: 'catalog',
        file: 'pi/pi-agent-catalog.png',
        title: 'Proof catalog',
        question: 'Can a visitor launch every preset and sampled experiment from one surface?',
        preset: 'showcase',
        catalog: true,
    },
    {
        id: 'policy',
        file: 'pi/pi-agent-preset.png',
        title: 'Live policy',
        question: 'Does the launched preset show where each live knob value came from?',
        preset: 'quiet',
        panel: true,
    },
];

export const SHOTS: readonly Shot[] = SHOT_SPECS.map((spec) => ({ scenario: 'rich' as const, ...spec }));
