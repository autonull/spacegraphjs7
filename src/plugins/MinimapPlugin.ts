import { Box3, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import type { CameraControls } from '../core';
import type { EventSystem } from '../core/events/EventSystem';
import type { Graph } from '../core/Graph';
import type { SpaceGraph } from '../SpaceGraph';
import { DOMUtils } from '../utils/DOMUtils';
import { visibleWorldExtent } from '../utils/CameraUtils';
import { BaseSystemPlugin } from './BaseSystemPlugin';

/**
 * MinimapPlugin — Renders a thumbnail overview of the graph in a corner overlay.
 *
 * Container-scoped (the overlay lives inside the graph container, not `document.body`) and safe to
 * embed: it can be toggled at runtime and the scene pass is throttled so enabling it does not double
 * frame cost. The viewport rectangle is derived from the active camera (orthographic or perspective).
 *
 * Plugin settings:
 *   position   : 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
 *   size       : pixel size of the square minimap (default 160)
 *   margin     : px from the edge of the container (default 12)
 *   bgColor    : minimap background (default 0x0a0a0a)
 *   alpha      : minimap opacity 0–1 (default 0.8)
 *   zoom       : minimum orthographic half-size (default 1500)
 *   enabled    : render the minimap at all (default true)
 *   intervalMs : minimum ms between minimap scene passes (default 100)
 */
export class MinimapPlugin extends BaseSystemPlugin {
  readonly id = 'minimap';
  readonly name = 'Minimap';
  readonly version = '1.0.0';
  public settings = {
    position: 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
    size: 160,
    margin: 12,
    bgColor: 0x0a0a0a,
    alpha: 0.8,
    zoom: 1500,
    enabled: true,
    intervalMs: 100,
  };
  private orthoCamera!: OrthographicCamera;
  private isDragging = false;
  private container?: HTMLElement;
  private indicator?: HTMLElement;
  private halfSize = 1500;
  private elapsed = 0;
  private readonly indicatorColor = 'rgba(139, 92, 246, 0.8)';
  private readonly borderColor = 'rgba(255, 255, 255, 0.1)';

  init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
    super.init(sg, graph, events);
    this.halfSize = this.settings.zoom;
    this._buildCamera();

    const dom = this.sg.renderer.renderer.domElement;
    dom.addEventListener('pointerdown', this._onPointerDown);
    dom.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  /** Turn the minimap on or off without disposing the plugin. */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    if (this.container) this.container.style.display = enabled ? '' : 'none';
    this.sg.requestFrame?.();
  }

  onPostRender(delta: number): void {
    if (!this.settings.enabled) return;
    if (!this.sg?.renderer?.renderer) return;

    this.elapsed += delta * 1000;
    if (this.elapsed >= this.settings.intervalMs) {
      this.elapsed = 0;
      this._renderMinimap();
    }
    this._updateOverlay();
  }

  dispose(): void {
    const dom = this.sg?.renderer?.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('pointerdown', this._onPointerDown);
      dom.removeEventListener('pointermove', this._onPointerMove);
    }
    window.removeEventListener('pointerup', this._onPointerUp);
    this.container?.remove();
    this.container = undefined;
    this.indicator = undefined;
    super.dispose();
  }

  private _buildCamera(): void {
    const z = this.settings.zoom;
    this.orthoCamera = new OrthographicCamera(-z, z, z, -z, 1, 10000);
    this.orthoCamera.position.set(0, 0, 1000);
    this.orthoCamera.lookAt(0, 0, 0);
  }

  private _getBounds() {
    const canvas = this.sg.renderer.renderer.domElement;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const { size, margin } = this.settings;

    let left: number, bottom: number;
    switch (this.settings.position) {
      case 'bottom-left':
        left = margin;
        bottom = margin;
        break;
      case 'top-right':
        left = cw - size - margin;
        bottom = ch - size - margin;
        break;
      case 'top-left':
        left = margin;
        bottom = ch - size - margin;
        break;
      default:
        left = cw - size - margin;
        bottom = margin;
    }
    return { left, top: ch - bottom - size, bottom, size, cw, ch };
  }

  private _pointerToWorld(px: number, py: number) {
    const { left, top, size } = this._getBounds();
    const nx = ((px - left) / size) * 2 - 1;
    const ny = -(((py - top) / size) * 2 - 1);
    return {
      x: this.orthoCamera.position.x + nx * this.halfSize,
      y: this.orthoCamera.position.y + ny * this.halfSize,
    };
  }

  private _inBounds(e: PointerEvent): boolean {
    const { left, top, size } = this._getBounds();
    return (
      e.clientX >= left && e.clientX <= left + size && e.clientY >= top && e.clientY <= top + size
    );
  }

  private _onPointerDown = (e: PointerEvent) => {
    if (!this.settings.enabled || !this._inBounds(e)) return;
    this.isDragging = true;
    const controls = this.sg.cameraControls as (CameraControls & { enabled?: boolean }) | undefined;
    if (controls) controls.enabled = false;
    const pt = this._pointerToWorld(e.clientX, e.clientY);
    controls?.setTarget?.(pt.x, pt.y, 0);
    this._updateOverlay();
    e.stopPropagation();
    e.preventDefault();
  };

  private _onPointerUp = () => {
    if (!this.isDragging) return;
    this.isDragging = false;
    const controls = this.sg.cameraControls as (CameraControls & { enabled?: boolean }) | undefined;
    if (controls) controls.enabled = true;
    this.sg.renderer.renderer.domElement.style.cursor = 'auto';
  };

  private _onPointerMove = (e: PointerEvent) => {
    if (!this.isDragging) return;
    const pt = this._pointerToWorld(e.clientX, e.clientY);
    (this.sg.cameraControls as CameraControls | undefined)?.setTarget?.(pt.x, pt.y, 0);
    this._updateOverlay();
    e.stopPropagation();
  };

  // Scene pass: fit the minimap camera to the graph and render one thumbnail frame. Throttled.
  private _renderMinimap(): void {
    const renderer = this.sg.renderer.renderer;
    if (!renderer) return;

    const pr = renderer.getPixelRatio();
    const { left, bottom, size, cw, ch } = this._getBounds();

    const nodes = Array.from(this.sg.graph.nodes.values());
    let half = this.settings.zoom;
    if (nodes.length) {
      const box = new Box3();
      for (const node of nodes) if (node?.position) box.expandByPoint(node.position);
      const center = new Vector3();
      const dimensions = new Vector3();
      box.getCenter(center);
      box.getSize(dimensions);
      half = Math.max(this.settings.zoom, Math.max(dimensions.x, dimensions.y) * 0.6 + 40);
      this.orthoCamera.position.set(center.x, center.y, 1000);
      this.orthoCamera.lookAt(center.x, center.y, 0);
    }
    this.halfSize = half;
    this.orthoCamera.left = -half;
    this.orthoCamera.right = half;
    this.orthoCamera.top = half;
    this.orthoCamera.bottom = -half;
    this.orthoCamera.updateProjectionMatrix();

    renderer.setViewport(left * pr, bottom * pr, size * pr, size * pr);
    renderer.setScissor(left * pr, bottom * pr, size * pr, size * pr);
    renderer.setScissorTest(true);
    renderer.setClearColor(this.settings.bgColor, this.settings.alpha);
    renderer.clear(true, true, false);
    renderer.render(this.sg.renderer.scene, this.orthoCamera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, cw * pr, ch * pr);
  }

  // Overlay pass: border + main-camera viewport rectangle. Cheap; runs every frame.
  private _updateOverlay(): void {
    if (typeof document === 'undefined' || !this.settings.enabled) return;
    const { left, top, size } = this._getBounds();

    if (!this.container) {
      this.container = DOMUtils.createElement('div');
      Object.assign(this.container.style, {
        position: 'absolute',
        pointerEvents: 'none',
        border: `2px solid ${this.borderColor}`,
        borderRadius: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        zIndex: '9997',
      });

      this.indicator = DOMUtils.createElement('div');
      this.indicator.id = 'sg-minimap-indicator';
      Object.assign(this.indicator.style, {
        position: 'absolute',
        border: `1px solid ${this.indicatorColor}`,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        boxSizing: 'border-box',
      });

      this.container.appendChild(this.indicator);
      this.sg.renderer.container.appendChild(this.container);
    }

    Object.assign(this.container.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${size}px`,
      height: `${size}px`,
    });

    const world = this._visibleWorldSize();
    const target = this.sg.cameraControls.target;
    const span = this.halfSize * 2;
    const mapX = ((target.x - this.orthoCamera.position.x) / span) * size + size / 2;
    const mapY = -((target.y - this.orthoCamera.position.y) / span) * size + size / 2;
    const mapW = (world.width / span) * size;
    const mapH = (world.height / span) * size;

    if (this.indicator) {
      Object.assign(this.indicator.style, {
        left: `${mapX - mapW / 2}px`,
        top: `${mapY - mapH / 2}px`,
        width: `${mapW}px`,
        height: `${mapH}px`,
      });
    }
  }

  // Visible world extent of the active camera, correct for both ortho and perspective.
  private _visibleWorldSize(): { width: number; height: number } {
    const camera = this.sg.renderer.camera;
    const target = this.sg.cameraControls.target;
    if ((camera as OrthographicCamera).isOrthographicCamera) {
      return visibleWorldExtent(camera, 0);
    }
    const perspective = camera as PerspectiveCamera;
    return visibleWorldExtent(perspective, perspective.position.distanceTo(target));
  }
}
