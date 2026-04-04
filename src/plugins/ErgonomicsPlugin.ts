import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import * as THREE from 'three';

const ERGONOMICS_CONFIG = {
    JITTER_DOT_PRODUCT_THRESHOLD: -0.2,
    SESSION_TIMEOUT_MS: 500,
    EMA_ALPHA: 0.1,
    JITTER_PENALTY_WEIGHT: 0.1,
    CALIBRATION_CHECK_INTERVAL_MS: 1000,
} as const;

/**
 * InteractionSession records a single continuous interaction (like a drag or pan)
 * to evaluate the physical efficiency vs. jitter (direction changes).
 */
class InteractionSession {
    public path: THREE.Vector3[] = [];
    public startTime: number = Date.now();
    public endTime: number = 0;

    addPoint(x: number, y: number, z: number = 0) {
        this.path.push(new THREE.Vector3(x, y, z));
    }

    close() {
        this.endTime = Date.now();
    }

    getMetrics() {
        if (this.path.length < 2) return { efficiency: 1.0, jitter: 0.0, durationMs: 0 };

        let pathLength = 0;
        let jitterCount = 0;

        for (let i = 1; i < this.path.length; i++) {
            const p1 = this.path[i - 1];
            const p2 = this.path[i];
            const dist = p1.distanceTo(p2);
            pathLength += dist;

            if (i > 1) {
                const dir1 = new THREE.Vector3().subVectors(p2, p1).normalize();
                const dir0 = new THREE.Vector3().subVectors(p1, this.path[i - 2]).normalize();
                if (dir1.dot(dir0) < ERGONOMICS_CONFIG.JITTER_DOT_PRODUCT_THRESHOLD) {
                    jitterCount++;
                }
            }
        }

        const start = this.path[0];
        const end = this.path[this.path.length - 1];
        const displacement = start.distanceTo(end);

        const efficiency = pathLength > 0 ? displacement / pathLength : 1.0;
        const durationMs = this.endTime - this.startTime;
        const jitter = durationMs > 0 ? (jitterCount / durationMs) * 1000 : 0;

        return { efficiency, jitter, durationMs };
    }
}

interface CameraSession {
    session: InteractionSession;
    lastActivity: number;
    timeoutHandle?: ReturnType<typeof setTimeout>;
}

export interface ErgonomicsConfig {
    targetNodeSizePx: number;
    dampingFactor: number;
    panSpeed: number;
    zoomSpeed: number;
}

/**
 * ErgonomicsPlugin — Tracks user interaction quality and adapts camera feel.
 *
 * Implements the RLFP (Recursive Least-Frequency Preference)
 * calibration loop testing variants A vs B.
 *
 * Tracked metrics:
 *   totalInteractions  : cumulative drag/zoom events
 *   avgEfficiency      : path-length / displacement ratio (1 = perfectly straight)
 *   avgJitter          : direction reversals per second
 */
export class ErgonomicsPlugin implements Plugin {
    readonly id = 'ergonomics-plugin';
    readonly name = 'Ergonomics';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;

    public config: ErgonomicsConfig = {
        targetNodeSizePx: 40,
        dampingFactor: 0.12,
        panSpeed: 1.0,
        zoomSpeed: 1.0,
    };

    public metrics = {
        totalInteractions: 0,
        avgEfficiency: 1.0,
        avgJitter: 0.0,
    };

    /**
     * Whether the calibration UI is currently active.
     * Full CalibrationManager implementation is deferred to future effort.
     */
    public calibrating = false;

    init(sg: SpaceGraph, _graph: Graph, events: EventSystem): void {
        this.sg = sg;
        this._applyConfig();
        this._listenToInteractions();
    }

    private _applyConfig(): void {
        // Hook into camera controls if available
        const cam = (this.sg as any).cameraControls;
        if (!cam) return;
        if ('dampingFactor' in cam) cam.dampingFactor = this.config.dampingFactor;
        if ('panSpeed' in cam) cam.panSpeed = this.config.panSpeed;
        if ('zoomSpeed' in cam) cam.zoomSpeed = this.config.zoomSpeed;
    }

    private activeSessions: Map<string, InteractionSession> = new Map();
    private cameraSession: CameraSession | null = null;

    private _listenToInteractions(): void {
        this.sg.events.on('interaction:dragstart', (payload) => {
            if (!payload?.node) return;
            this.activeSessions.set(`drag-${payload.node.id}`, new InteractionSession());
        });

        this.sg.events.on('interaction:drag', (payload) => {
            if (!payload?.node) return;
            const session = this.activeSessions.get(`drag-${payload.node.id}`);
            session?.addPoint(payload.node.position.x, payload.node.position.y);
        });

        this.sg.events.on('interaction:dragend', (payload) => {
            if (!payload?.node) return;
            const session = this.activeSessions.get(`drag-${payload.node.id}`);
            if (session) {
                session.close();
                this._accumulateMetrics(session);
                this.activeSessions.delete(`drag-${payload.node.id}`);
            }
        });

        this.sg.events.on('camera:move', (payload) => {
            if (!payload?.position) return;
            this._handleCameraMovement(payload.position.x, payload.position.y);
        });
    }

    private _handleCameraMovement(x: number, y: number): void {
        if (!this.cameraSession) {
            this.cameraSession = {
                session: new InteractionSession(),
                lastActivity: Date.now(),
            };
        } else {
            clearTimeout(this.cameraSession.timeoutHandle);
        }

        this.cameraSession.session.addPoint(x, y, Date.now());
        this.cameraSession.lastActivity = Date.now();

        this.cameraSession.timeoutHandle = setTimeout(() => {
            if (
                this.cameraSession &&
                Date.now() - this.cameraSession.lastActivity >= ERGONOMICS_CONFIG.SESSION_TIMEOUT_MS
            ) {
                this.cameraSession.session.close();
                this._accumulateMetrics(this.cameraSession.session);
                this.cameraSession = null;
            }
        }, ERGONOMICS_CONFIG.SESSION_TIMEOUT_MS);
    }

    private _accumulateMetrics(session: InteractionSession): void {
        const { efficiency, jitter } = session.getMetrics();

        this.metrics.avgEfficiency =
            ERGONOMICS_CONFIG.EMA_ALPHA * efficiency +
            (1 - ERGONOMICS_CONFIG.EMA_ALPHA) * this.metrics.avgEfficiency;
        this.metrics.avgJitter =
            ERGONOMICS_CONFIG.EMA_ALPHA * jitter +
            (1 - ERGONOMICS_CONFIG.EMA_ALPHA) * this.metrics.avgJitter;

        if (session.path.length > 1) {
            this.metrics.totalInteractions++;
        }
    }

    /** Update config and re-apply to camera. */
    updateConfig(partial: Partial<ErgonomicsConfig>): void {
        this.config = { ...this.config, ...partial };
        this._applyConfig();
    }

    /** Returns a snapshot of current ergonomic metrics. */
    getMetrics() {
        return { ...this.metrics };
    }

    public startCalibrationRound(
        configA: Partial<ErgonomicsConfig>,
        configB: Partial<ErgonomicsConfig>,
        interactionsPerRound = 10,
    ): void {
        this.calibrating = true;

        let activeConfig: 'A' | 'B' = 'A';
        const baselineConfig = { ...this.config };

        const scores = {
            A: { efficiency: 0, jitter: 0 },
            B: { efficiency: 0, jitter: 0 },
        };

        this.updateConfig(configA);
        this.metrics.totalInteractions = 0;

        const checkRound = setInterval(() => {
            if (!this.calibrating) {
                clearInterval(checkRound);
                return;
            }

            if (this.metrics.totalInteractions >= interactionsPerRound) {
                scores[activeConfig].efficiency = this.metrics.avgEfficiency;
                scores[activeConfig].jitter = this.metrics.avgJitter;

                if (activeConfig === 'A') {
                    activeConfig = 'B';
                    this.updateConfig(configB);
                    this.metrics.totalInteractions = 0;
                    this.metrics.avgEfficiency = 1.0;
                    this.metrics.avgJitter = 0.0;
                } else {
                    clearInterval(checkRound);
                    this.calibrating = false;

                    const scoreA =
                        scores.A.efficiency -
                        scores.A.jitter * ERGONOMICS_CONFIG.JITTER_PENALTY_WEIGHT;
                    const scoreB =
                        scores.B.efficiency -
                        scores.B.jitter * ERGONOMICS_CONFIG.JITTER_PENALTY_WEIGHT;

                    const winner = scoreA >= scoreB ? configA : configB;

                    this.updateConfig({ ...baselineConfig, ...winner });
                    this.sg.events.emit('ergonomics:calibrated' as any, { winner, scores });
                }
            }
        }, ERGONOMICS_CONFIG.CALIBRATION_CHECK_INTERVAL_MS);
    }

    onPreRender(_delta: number): void {
        // Handled by event accumulation directly
    }
}
