import type { PolicyVector } from './policy';

export type ShotSurface = 'log' | 'map' | 'hybrid';
export type ShotArrangement = 'stacked' | 'side' | 'floating';
export type ShotLevel = 'overview' | 'execution' | 'detail';

/** A deterministic view of the flagship. Pure data: one URL launches exactly this state. */
export interface Shot {
    readonly id: string;
    readonly file: string;
    readonly title: string;
    readonly question: string;
    readonly scenario: 'canonical' | 'rich';
    readonly preset?: string;
    readonly vector?: PolicyVector;
    readonly surface?: ShotSurface;
    readonly arrangement?: ShotArrangement;
    readonly collapsed?: boolean;
    /** A quiet frame gives the canvas the full width; graph shots use it, chrome shots keep the rail. */
    readonly rail?: boolean;
    readonly level?: ShotLevel;
    readonly reveal?: string;
    readonly evidence?: string;
    readonly frame?: readonly string[];
    readonly zoom?: number;
    readonly minScale?: number;
    readonly padding?: number;
    readonly expandFirst?: boolean;
    readonly catalog?: boolean;
    readonly panel?: boolean;
}

const node = (id: string): string => `pi:local:${id}`;

export const SHOTS: readonly Shot[] = [
    {
        id: 'cockpit',
        file: 'pi-agent-in-action.png',
        title: 'Agent cockpit',
        question: 'What does the dense, compact multi-turn run look like at one glance?',
        scenario: 'rich',
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
        file: 'pi-agent-node-detail.png',
        title: 'Node detail',
        question: 'What does LOD reveal when the camera closes into one failing node and its inner layout?',
        scenario: 'rich',
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
        file: 'pi-agent-deep-focus.png',
        title: 'Deep focus',
        question: 'How much can one node carry when the camera commits to it? (opt-in scale)',
        scenario: 'rich',
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
        file: 'pi-agent-fractal.png',
        title: 'Fractal lens',
        question: 'Does a two-level inner layout make recursive scope structure legible?',
        scenario: 'rich',
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
        id: 'dynamic-range',
        file: 'pi-agent-dynamic-range.png',
        title: 'Dynamic range',
        question: 'How far out can the scene zoom before the overview stops communicating structure?',
        scenario: 'rich',
        preset: 'aurora',
        surface: 'map',
        vector: { 'bands.overviewMax': 0.3, 'bands.overviewEnter': 0.45 },
        rail: false,
        zoom: 0.58,
        padding: 40,
    },
    {
        id: 'layout-stacked',
        file: 'pi-agent-layout-stacked.png',
        title: 'Stacked layout',
        question: 'Does a transcript below the graph preserve the descent spine at wide widths?',
        scenario: 'rich',
        preset: 'ember',
        surface: 'hybrid',
        arrangement: 'stacked',
        evidence: 'artifacts',
    },
    {
        id: 'layout-floating',
        file: 'pi-agent-layout-floating.png',
        title: 'Floating layout',
        question: 'How much canvas does a floating transcript give back to the graph?',
        scenario: 'rich',
        preset: 'circuit',
        surface: 'hybrid',
        arrangement: 'floating',
        collapsed: true,
    },
    {
        id: 'neon-cockpit',
        file: 'pi-agent-neon-cockpit.png',
        title: 'Neon cockpit',
        question: 'Does an emissive palette make the run easier to scan without hiding the HUD?',
        scenario: 'rich',
        preset: 'neon',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
        evidence: 'why',
        expandFirst: true,
    },
    {
        id: 'aurora-map',
        file: 'pi-agent-aurora-map.png',
        title: 'Aurora map',
        question: 'Is a cool low-glare palette legible on the full-scope map?',
        scenario: 'rich',
        preset: 'aurora',
        rail: false,
        surface: 'map',
    },
    {
        id: 'light-theme',
        file: 'pi-agent-light.png',
        title: 'Light theme',
        question: 'Which theme variant keeps the canonical fixture legible in daylight?',
        scenario: 'rich',
        preset: 'light',
        rail: false,
        surface: 'hybrid',
        arrangement: 'side',
    },
    {
        id: 'catalog',
        file: 'pi-agent-catalog.png',
        title: 'Proof catalog',
        question: 'Can a visitor launch every preset and sampled experiment from one surface?',
        scenario: 'rich',
        preset: 'showcase',
        catalog: true,
    },
    {
        id: 'policy',
        file: 'pi-agent-preset.png',
        title: 'Live policy',
        question: 'Does the launched preset show where each live knob value came from?',
        scenario: 'rich',
        preset: 'quiet',
        panel: true,
    },
];

export const shotById = (id: string | null | undefined): Shot | undefined =>
    id ? SHOTS.find((shot) => shot.id === id) : undefined;
