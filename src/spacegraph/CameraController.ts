import type { CameraViewport, DepthMode, FitInsets } from '../types';
import { calculateFitView, clamp01 } from '../utils';
import type { CardFacing } from '@spacegraphjs/renderer';
import type { OrthographicCamera } from 'three';
import { depthTreatment } from '../depth/DepthCues';
import type { SpaceGraph } from '../SpaceGraph';

export class CameraController {
    #lastZoom = -1;
    #lastCenter: [number, number, number] = [Number.NaN, Number.NaN, Number.NaN];

    constructor(readonly sg: SpaceGraph) {}

    #minZoomFor(minScale: number | undefined): number | undefined {
        if (minScale === undefined) return undefined;

        const camera = this.sg.renderer?.camera as OrthographicCamera | undefined;
        if (!camera?.isOrthographicCamera) return undefined;

        const baseHeight = camera.top - camera.bottom || 1;
        const height = this.sg.renderer.container?.clientHeight || 1;

        return (minScale * baseHeight) / height;
    }

    #effectiveDuration(duration: number): number {
        return this.sg.reducedMotion ? 0 : duration;
    }

    fitView(
        padding = 100,
        duration = 1.5,
        ids?: readonly string[],
        options?: { minScale?: number; insets?: FitInsets },
    ): SpaceGraph {
        if (!this.sg.graph || !this.sg.renderer?.camera || !this.sg.cameraControls) return this.sg;
        const nodes = ids
            ? ids.flatMap((id) => {
                  const node = this.sg.graph.nodes.get(id);
                  return node ? [node] : [];
              })
            : Array.from(this.sg.graph.nodes.values());
        if (nodes.length === 0) return this.sg;

        this.sg.renderer.syncSize();

        const isPerspective = this.sg.renderer.projection === 'perspective';
        const targetPhi = isPerspective ? depthTreatment(this.sg.depth).phi : undefined;

        const fit = calculateFitView(
            nodes,
            this.sg.renderer.camera,
            padding,
            200,
            targetPhi,
            this.#minZoomFor(options?.minScale),
            {
                width: this.sg.renderer.container?.clientWidth ?? 0,
                height: this.sg.renderer.container?.clientHeight ?? 0,
            },
            options?.insets
                ? {
                      top: options.insets.top ?? 0,
                      right: options.insets.right ?? 0,
                      bottom: options.insets.bottom ?? 0,
                      left: options.insets.left ?? 0,
                  }
                : undefined,
        );
        if (fit) {
            if (fit.zoom !== undefined) this.sg.cameraControls?.setOrthoZoomRange(fit.zoom);
            const distance =
                fit.zoom !== undefined ? this.sg.cameraControls.spherical.radius : fit.cameraZ;
            const effectiveDuration = this.#effectiveDuration(duration);
            this.sg.cameraControls.flyTo(fit.center, distance, effectiveDuration, fit.zoom);
            this.reportViewport(true);
            this.sg.requestFrame();
        }
        return this.sg;
    }

    focusNode(id: string, _padding = 100, duration = 1): SpaceGraph {
        const node = this.sg.graph.getNode(id);
        if (node) {
            const pos = node.position;
            const effectiveDuration = this.#effectiveDuration(duration);
            this.sg.cameraControls.flyTo(
                pos,
                this.sg.renderer.camera.position.length(),
                effectiveDuration,
            );
            this.reportViewport(true);
            this.sg.requestFrame();
        }
        return this.sg;
    }

    center(x: number, y: number, z = 0): SpaceGraph {
        this.sg.cameraControls.target.set(x, y, z);
        return this.commitCamera();
    }

    resetCamera(): SpaceGraph {
        this.sg.renderer.camera.position.set(0, 500, 500);
        this.sg.cameraControls.target.set(0, 0, 0);
        return this.commitCamera();
    }

    setCamera(position: [number, number, number], target?: [number, number, number]): SpaceGraph {
        this.sg.renderer.camera.position.set(...position);
        if (target) this.sg.cameraControls.target.set(...target);
        return this.commitCamera();
    }

    commitCamera(): SpaceGraph {
        this.sg.cameraControls.update();
        this.reportViewport(true);
        this.sg.requestFrame();
        return this.sg;
    }

    setOrbitEnabled(enabled: boolean): SpaceGraph {
        this.sg.cameraControls?.setOrbitEnabled(enabled);
        return this.sg;
    }

    setPolar(phi: number, theta: number, duration = 0): SpaceGraph {
        this.sg.cameraControls?.setPolar(phi, theta, duration);
        return this.sg;
    }

    reportViewport(force = false): void {
        if (!this.sg.renderer || !this.sg.events) return;
        if (this.sg.depth !== 'flat') this.sg.applySceneFade();
        const camera = this.sg.renderer.getCameraState();
        const zoomChanged = Math.abs(camera.zoom - this.#lastZoom) > 1e-4;
        const moved = camera.center.some((v, i) => Math.abs(v - this.#lastCenter[i]) > 1e-3);
        if (!force && !zoomChanged && !moved) return;
        const viewport = this.sg.renderer.getViewport();
        if (zoomChanged) {
            this.sg.events.emit('zoom:change', { zoom: viewport.zoom, previous: this.#lastZoom });
        }
        this.sg.events.emit('camera:change', viewport);
        this.#lastZoom = viewport.zoom;
        this.#lastCenter = viewport.center;
    }
}
