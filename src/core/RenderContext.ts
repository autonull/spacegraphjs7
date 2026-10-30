import { Camera, Frustum, Matrix4 } from 'three';
import type { LODLevel, Node, VisibilityContext } from '../nodes/Node';

export interface FrameStats {
  deltaTime: number;
  fps: number;
  nodeCount: number;
  renderedCount: number;
  culledCount: number;
  drawCalls: number;
  triangleCount: number;
}

export class RenderContext {
  public stats: FrameStats = {
    deltaTime: 0,
    fps: 60,
    nodeCount: 0,
    renderedCount: 0,
    culledCount: 0,
    drawCalls: 0,
    triangleCount: 0,
  };

  private frameCount = 0;
  private lastFpsUpdate = 0;
  private _lastTime = 0;

  constructor(
    private camera: Camera,
    viewport: { width: number; height: number },
    minPixelSize = 0.5
  ) {
    this._visibilityContext = {
      cameraFrustum: new Frustum(),
      viewportBounds: viewport,
      minPixelSize,
      cameraPosition: camera.position.clone(),
    };
  }

  readonly _visibilityContext: VisibilityContext;

  // Swapped when the host toggles projection so culling follows the active camera.
  setCamera(camera: Camera): void {
    this.camera = camera;
    this._visibilityContext.cameraPosition.copy(camera.position);
  }

  get visibilityContext(): VisibilityContext {
    return this._visibilityContext;
  }

  updateFrustum(projScreenMatrix: Matrix4): void {
    this._visibilityContext.cameraFrustum.setFromProjectionMatrix(projScreenMatrix);
  }

  updateCameraPosition(): void {
    this._visibilityContext.cameraPosition.copy(this.camera.position);
  }

  updateViewport(viewport: { width: number; height: number }): void {
    this._visibilityContext.viewportBounds = viewport;
  }

  startFrame(time: number): void {
    this.stats.deltaTime = time - this._lastTime;
    this._lastTime = time;
    this.frameCount++;

    if (time - this.lastFpsUpdate >= 1000) {
      this.stats.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }

    this.stats.renderedCount = 0;
    this.stats.culledCount = 0;
  }

  shouldRender(node: Node): boolean {
    const lodLevel = this.computeLOD(node);
    if (lodLevel === 'hidden') {
      this.stats.culledCount++;
      return false;
    }
    this.stats.renderedCount++;
    return true;
  }

  endFrame(): FrameStats {
    this.stats.nodeCount = this.stats.renderedCount + this.stats.culledCount;
    return this.stats;
  }

  private computeLOD(node: Node): LODLevel {
    return node.computeLOD(this._visibilityContext);
  }
}
