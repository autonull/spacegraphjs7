import type { ScopePolicyInput } from 'spacegraphjs/layout';
import {
    createVisionLoop,
    type VisionLoop,
    type VisionLoopAnalyzers,
    type VisionLoopReport,
    type VisionLoopScores,
    type VisionReport,
} from 'spacegraphjs/vision';
import { requireElement } from 'spacegraphjs/utils';
import { scoreVision, type Position, type VisionScores } from './policy/host';

const VISION_MODELS: Record<string, string> = {
    tla: '/tla_model.onnx',
    che: '/che_model.onnx',
    odn: '/odn_model.onnx',
    vhs: '/vhs_model.onnx',
    eqa: '/eqa_model.onnx',
};

type HostVision = {
    readonly strategy: string;
    readonly modelLoader: {
        readonly isLoaded: boolean;
        getAvailableModels(): readonly string[];
    };
    readonly visionSystem: {
        setStrategy(name: string): void;
        analyze(graph: unknown, camera: unknown): Promise<VisionReport>;
    };
    readonly modelsLoaded: boolean;
    loadModels(paths: Record<string, string>): Promise<void>;
};

type VisionInstance = {
    graph: unknown;
    renderer: { camera: unknown };
    vision: HostVision;
};

const visionInstance = (): VisionInstance | undefined => {
    const instances = (window as unknown as { SpaceGraph?: { instances?: Set<unknown> } })
        .SpaceGraph?.instances;
    return instances ? (Array.from(instances)[0] as VisionInstance | undefined) : undefined;
};

const hostVision = (): HostVision | undefined => visionInstance()?.vision;

/** Pure analyzers: the gate's strategy, without the autonomous fixer's layout mutation. */
const visionAnalyzers = (): VisionLoopAnalyzers | undefined => {
    const instance = visionInstance();
    if (!instance?.vision) return undefined;
    return {
        strategy: instance.vision.strategy,
        analyze: () =>
            instance.vision.visionSystem.analyze(instance.graph, instance.renderer.camera),
    };
};

/**
 * Never fabricate `modelsLoaded`. Heuristics is the honest default: the bundled ONNX files are
 * placeholders in this runtime, so only an explicit `?vision=onnx` opt-in attempts a real load.
 * The strategy is recorded per capture and a failed load falls back rather than inventing scores.
 */
export const configureVision = async (): Promise<'onnx' | 'heuristics'> => {
    const vision = hostVision();
    const optedIn =
        typeof location !== 'undefined' &&
        new URLSearchParams(location.search).get('vision') === 'onnx';
    if (!vision || !optedIn) {
        vision?.visionSystem.setStrategy('heuristics');
        return 'heuristics';
    }
    await vision.loadModels(VISION_MODELS);
    if (vision.modelLoader.getAvailableModels().length === 0) {
        vision.visionSystem.setStrategy('heuristics');
        return 'heuristics';
    }
    vision.visionSystem.setStrategy('onnx');
    return 'onnx';
};

/** The host facts the vision loop reads and the effects it asks the host to perform. */
export interface VisionHost {
    readonly global: boolean;
    positions(): ReadonlyMap<string, Position>;
    focus(): string | undefined;
    band(): number;
    setPolicy(input: ScopePolicyInput): void;
    syncClock(): void;
    paint(): void;
}

/** Owns vision sampling, the opt-in analysis loop and the DOM that reports both. */
export class VisionController {
    #scores: VisionScores = { overlap: 0, legibility: 1 };
    #strategy: 'onnx' | 'heuristics' = 'heuristics';
    #time = 0;
    #loop?: VisionLoop;
    #enabled = false;
    #busy = false;
    #report?: VisionLoopReport;

    constructor(private readonly host: VisionHost) {}

    get scores(): VisionScores {
        return this.#scores;
    }

    get strategy(): 'onnx' | 'heuristics' {
        return this.#strategy;
    }

    set strategy(value: 'onnx' | 'heuristics') {
        this.#strategy = value;
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    get report(): VisionLoopReport | undefined {
        return this.#report;
    }

    /** The newest available scores, from the last report or the last active loop. */
    get lastScores(): VisionLoopScores | undefined {
        return this.#report?.scores ?? this.#loop?.lastReport?.scores;
    }

    get loop(): VisionLoop {
        if (!this.#loop || this.#loop.reportUnsupported().length) {
            this.#loop = createVisionLoop(
                this.host.global ? visionAnalyzers() : undefined,
                (input, scores) => this.#applyPolicy(input, scores),
            );
        }
        return this.#loop;
    }

    setEnabled(enabled: boolean): boolean {
        this.#enabled = enabled;
        requireElement<HTMLElement>('vision-loop-toggle', 'pi app').setAttribute(
            'data-active',
            String(enabled),
        );
        if (enabled) this.run();
        this.render();
        return enabled;
    }

    advance(seconds: number): void {
        this.#time += seconds;
        if (this.#time < 0.4) return;
        this.#time = 0;
        if (this.#enabled) this.run();
        else this.sample();
    }

    sample(): void {
        const next = scoreVision(this.host.positions());
        const changed =
            Math.abs(next.overlap - this.#scores.overlap) > 0.12 ||
            Math.abs(next.legibility - this.#scores.legibility) > 0.1;
        if (!changed) return;
        this.#scores = next;
        this.host.setPolicy({
            band: this.host.band(),
            focus: this.host.focus(),
            vision: next,
        });
        this.host.syncClock();
    }

    run(): void {
        if (!this.#enabled || this.#busy) return;
        this.#busy = true;
        void this.loop
            .cycle()
            .then((report) => {
                if (!report) return;
                this.#report = report;
                this.render();
            })
            .finally(() => {
                this.#busy = false;
            });
    }

    render(): void {
        const loop = this.loop;
        const report = this.#report;
        requireElement<HTMLElement>('vision-loop-state', 'pi app').textContent = report
            ? `strategy ${loop.strategy} · overlap ${report.scores.overlap.toFixed(2)} · ` +
              `legibility ${report.scores.legibility.toFixed(2)} · hierarchy ${report.scores.hierarchy.toFixed(2)} · ` +
              `ergonomics ${report.scores.ergonomics.toFixed(2)} · retargeted ${report.retargeted.join(', ') || 'none'}`
            : `${this.#enabled ? 'analyzing…' : 'off'} · strategy ${loop.strategy}` +
              (loop
                  .reportUnsupported()
                  .map((item) => ` · ${item.reason}`)
                  .join('') || '');
    }

    #applyPolicy(input: ScopePolicyInput, scores: VisionLoopScores): void {
        const previous = this.#scores.legibility;
        this.#scores = { overlap: scores.overlap, legibility: scores.legibility };
        this.host.setPolicy({ ...input, band: this.host.band(), focus: this.host.focus() });
        // representationRung switches at 0.5 and 0.7; repaint only when legibility crosses one.
        if (
            previous < 0.5 !== scores.legibility < 0.5 ||
            previous < 0.7 !== scores.legibility < 0.7
        ) {
            this.host.paint();
        }
        this.host.syncClock();
    }
}
