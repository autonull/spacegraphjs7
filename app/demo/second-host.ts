// The second reference host (app/pi is the flagship). It composes the promoted library helpers into
// one workspace — camera verbs, one-authority play/reconcile, a legibility-gated rung and an opt-in
// vision loop. The page owns rendering; this host owns state and behavior.

import { catalogEntries, findShotByID } from 'spacegraphjs/experiments';
import { chapterPacking, octaveLayout, type Position } from 'spacegraphjs/layout';
import { innerTree, type InnerSourceEdge, type InnerSourceNode } from 'spacegraphjs/inspect';
import { TouchRecognizer, type TouchGesture, type TouchPoint } from 'spacegraphjs/input';
import {
    decodePolicyVector,
    encodePolicyVector,
    resolvePolicy,
    withLayer,
    type PolicyLayer,
    type PolicyLayers,
    type PolicySchema,
    type PolicyVector,
    type ResolvedPolicy,
} from 'spacegraphjs/policy';
import { createVisionLoop, type VisionLoop, type VisionLoopAnalyzers } from 'spacegraphjs/vision';
import {
    MotionDirector,
    createCameraMotionHandlers,
    type CameraMotionHandlers,
    type CameraPoint,
} from 'spacegraphjs/motion';
import { representationRung, type RepresentationRung } from 'spacegraphjs/salience';
import {
    createPhysicsPlaySession,
    type GravityPreset,
    type PhysicsPlaySession,
    type PlaySettings,
    type PlaySimulation,
} from 'spacegraphjs/world';

const SECOND_SHOTS = [
    {
        id: 'workflow-chapters',
        file: 'scenario-workflow-chapters.png',
        title: 'Workflow chapters',
        question: 'Does the chapter grid read for workflow steps?',
        data: { domain: 'workflow', layout: 'chapters' },
    },
    {
        id: 'data-grid',
        file: 'scenario-data-grid.png',
        title: 'Data grid',
        question: 'Does the grid read for data records?',
        data: { domain: 'data', layout: 'grid' },
    },
] as const;

const DEMO_SCHEMA: PolicySchema = {
    version: 1,
    knobs: [
        {
            id: 'demo.gap',
            family: 'geometry',
            type: 'number',
            default: 120,
            min: 40,
            max: 400,
            step: 10,
            description: 'Demo node gap',
            rationale: '',
        },
        {
            id: 'demo.surface',
            family: 'surface',
            type: 'enum',
            default: 'graph',
            options: ['graph', 'map'],
            description: 'Demo surface',
            rationale: '',
        },
    ],
};

export class SecondHost {
    readonly director = new MotionDirector();
    readonly touch = new TouchRecognizer();
    readonly touchActions: TouchGesture[] = [];
    readonly cameraMotion: CameraMotionHandlers;
    readonly playSession: PhysicsPlaySession;
    readonly visionLoop: VisionLoop;
    readonly settings: PlaySettings = {
        enabled: false,
        gravity: 0,
        collide: true,
        repulsion: 120,
        damping: 0.98,
        groundY: null,
    };
    readonly moves: string[] = [];

    level: RepresentationRung = 'overview';

    #center: CameraPoint = [0, 0, 0];
    #zoom = 1;
    #flightTo: CameraPoint | undefined;
    #tracePath: readonly CameraPoint[] = [];
    #settled = true;
    #energy = 0;
    #policyLayers: PolicyLayers = {};

    constructor(analyzers?: VisionLoopAnalyzers) {
        const host = this;
        const simulation: PlaySimulation = {
            setInstant: (value) => {
                if (value) host.#settled = true;
            },
            settle: () => {
                host.#settled = true;
                host.#energy = 0;
            },
            get settled() {
                return host.#settled;
            },
            get energy() {
                return host.#energy;
            },
        };
        this.playSession = createPhysicsPlaySession({
            physics: { settings: this.settings },
            simulation,
        });
        this.cameraMotion = createCameraMotionHandlers(this.director, {
            origin: () => this.#center,
            destination: () => this.#flightTo,
            zoom: () => this.#zoom,
            tracePath: () => this.#tracePath,
            move: (verb, point, progress) => {
                this.#center = point;
                this.moves.push(`${verb}:${point.join(',')}:${progress.toFixed(2)}`);
            },
        });
        this.visionLoop = createVisionLoop(analyzers, () => {});
    }

    readonly policySchema = DEMO_SCHEMA;

    get policy(): ResolvedPolicy {
        return resolvePolicy(this.policySchema, this.#policyLayers);
    }

    setPolicy(layer: PolicyLayer, values: PolicyVector): void {
        this.#policyLayers = withLayer(this.policySchema, this.#policyLayers, layer, values);
    }

    policyLink(): string {
        return encodePolicyVector(this.policySchema, this.policy.vector);
    }

    loadPolicy(link: string): boolean {
        const values = decodePolicyVector(this.policySchema, link);
        if (!values) return false;
        this.#policyLayers = withLayer(this.policySchema, this.#policyLayers, 'url', values);
        return true;
    }

    get viewport(): { center: [number, number, number]; zoom: number } {
        return { center: [...this.#center], zoom: this.#zoom };
    }

    setFlight(to: CameraPoint): void {
        this.#flightTo = to;
    }

    setTracePath(path: readonly CameraPoint[]): void {
        this.#tracePath = path;
    }

    fly(progress: number): void {
        this.director
            .play([{ id: 'flight', verb: 'flyTo', target: 'camera', from: 0, to: 1 }], {
                duration: 1,
            })
            .advance(progress);
    }

    follow(value: number): void {
        this.director
            .play([{ id: 'trace', verb: 'trace', target: 'camera', from: 0, to: 1 }], {
                duration: 1,
            })
            .advance(value);
    }

    chooseLevel(activity: number, legibility: number): RepresentationRung {
        this.level = representationRung({ level: this.level, activity, legibility });
        return this.level;
    }

    play(preset: GravityPreset = 'zero-g'): boolean {
        return this.playSession.play(preset);
    }

    reconcile(): boolean {
        return this.playSession.reconcile();
    }

    addEnergy(value: number): void {
        this.#energy += value;
    }

    /** Chapter grid for any domain's ordered ids; Pi's turn vocabulary is not required. */
    chapterGrid(
        ids: readonly string[],
        viewport: { readonly width: number; readonly height: number } = { width: 1600, height: 900 },
        previous?: ReadonlyMap<string, Position>,
    ): ReadonlyMap<string, Position> {
        return chapterPacking(ids, { card: [360, 200], viewport, previous });
    }

    /** Named views use this host's domain/layout words; the library only reads `id`. */
    shot(id: string | null | undefined) {
        return findShotByID(SECOND_SHOTS, id);
    }

    /** Catalog links use this host's query grammar, not Pi's preset/policy grammar. */
    catalog() {
        return catalogEntries(
            SECOND_SHOTS.map((shot) => ({
                id: shot.id,
                label: `${shot.data.domain} · ${shot.data.layout}`,
            })),
            (id) => `scenario.html?shot=${encodeURIComponent(id)}`,
            (_id, item) => `Open the ${item.label} scenario`,
        );
    }

    /** Multi-octave grid for any host-owned parent map; no Pi containment words are involved. */
    octaveGrid(ids: readonly string[], parentOf: ReadonlyMap<string, string>) {
        return octaveLayout(ids, parentOf, { card: [360, 200] });
    }

    /** Bounded local topology with this host's own containment vocabulary. */
    innerFocus(
        focus: string,
        nodes: readonly InnerSourceNode[],
        edges: readonly InnerSourceEdge[],
    ): readonly string[] {
        return innerTree(focus, nodes, edges, 2, 4, ['parent']).map((chip) => chip.id);
    }

    /** Feeds pointer samples through the promoted recognizer and applies this host's own gesture map. */
    dispatchTouch(point: TouchPoint, phase: 'down' | 'move' | 'up'): TouchGesture | undefined {
        if (phase === 'down') {
            this.touch.down(point);
            return undefined;
        }
        if (phase === 'move') {
            this.touch.move(point);
            return undefined;
        }
        const gesture = this.touch.up(point);
        if (gesture) {
            this.touchActions.push(gesture);
            if (gesture === 'swipeUp') this.fly(1);
            if (gesture === 'swipeDown') this.follow(1);
        }
        return gesture;
    }
}
