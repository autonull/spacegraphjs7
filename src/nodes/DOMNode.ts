import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import type { SpaceGraph } from '../SpaceGraph';
import type { DOMNodeData, NodeData, NodeSpec } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { worldToScreen } from '../utils/projection';
import { applyControlStateStyles } from '../plugins/interaction/ControlStateBorder';
import { Node } from './Node';
import { NODE_PALETTE } from './palette';

export class DOMNode extends Node {
  static typeName: string = 'DOMNode';
  public readonly isDOMNode = true;
  /** A card draws its hover as an outline; growing it would move the controls under the pointer. */
  override readonly scalesOnHover = false;
  public readonly domElement: HTMLElement;
  public readonly cssObject: CSS3DObject;
  public readonly meshMaterial: THREE.MeshBasicMaterial;
  public readonly backingMesh: THREE.Mesh;
  readonly _object: THREE.Group;
  /** The title text the node's title bar shows; the bar owns it, so the node can reach it. */
  protected titleElement: HTMLElement | null = null;

  constructor(
    sg: SpaceGraph | undefined,
    spec: NodeSpec,
    domElement?: HTMLElement,
    width = 200,
    height = 100,
    materialParams?: THREE.MeshBasicMaterialParameters
  ) {
    super(sg, spec);

    this._object = new THREE.Group();
    this.domElement =
      domElement ?? (spec.data as DOMNodeData | undefined)?.element ?? DOMUtils.createElement('div');
    this.cssObject = new CSS3DObject(this.domElement);
    this.object.add(this.cssObject);

    this._meshGeometry = new THREE.PlaneGeometry(width, height);

    const defaultTranslucency =
      materialParams?.visible === false ? {} : { color: 0x000000, opacity: 0.1, transparent: true };
    this.meshMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      ...defaultTranslucency,
      ...materialParams,
    });

    this.backingMesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);
    this.object.add(this.backingMesh);

    this._setupPointerEventRelay(sg);
  }

  private _meshGeometry: THREE.PlaneGeometry;

  get meshGeometry(): THREE.PlaneGeometry {
    return this._meshGeometry;
  }

  get object(): THREE.Object3D {
    return this._object;
  }

  public setVisibility(visible: boolean): void {
    this.cssObject.visible = visible;
    this.domElement.style.display = visible ? 'flex' : 'none';
    this.backingMesh.visible = visible;
  }

  // DOM nodes draw their interaction outline on the element, not as a mesh BoxHelper, using the
  // resolved theme colours so a host theme controls the ring (RF.6).
  protected override syncVisual(): void {
    const state = this.visualState();
    applyControlStateStyles(
      this.domElement,
      state,
      this.lastVisualState,
      this.controlStateColor(state)
    );
    this.lastVisualState = state;
  }

  // Adopt the spec-supplied element once; never swap a mounted element on update.
  override updateSpec(updates: Partial<NodeSpec>): this {
    if (updates.data && 'element' in updates.data) {
      const data = { ...updates.data };
      delete (data as Record<string, unknown>).element;
      return super.updateSpec({ ...updates, data });
    }
    return super.updateSpec(updates);
  }

  public override setOpacity(opacity: number): this {
    this.domElement.style.opacity = opacity.toString();
    if (this.meshMaterial) {
      this.meshMaterial.opacity = opacity * 0.1; // Maintain the 0.1 base translucency scale
      this.meshMaterial.transparent = true;
      this.meshMaterial.needsUpdate = true;
    }
    return super.setOpacity(opacity);
  }

  public updateLod(_distance: number): void {}

  isDraggable(localPos: THREE.Vector3): boolean {
    if (this.data?.draggable === false) return false;

    const interactive = this.domElement.querySelectorAll('[data-sg-interactive="true"]');
    if (!interactive || interactive.length === 0) return true;

    // The control and the pointer are both on the screen, so the test is made there: the local
    // point is carried to the screen, where the control's own box is.
    const canvas = this.sg?.renderer?.renderer?.domElement as HTMLCanvasElement | undefined;
    const camera = this.sg?.renderer?.camera;
    if (!canvas || !camera) return true;

    const world = this.object.localToWorld(localPos.clone());
    const screen = worldToScreen(world, camera, canvas);
    const rect = canvas.getBoundingClientRect();
    const clientX = screen.x + rect.left;
    const clientY = screen.y + rect.top;

    for (const el of interactive) {
      const elRect = el.getBoundingClientRect();

      if (clientX >= elRect.left && clientX <= elRect.right && clientY >= elRect.top && clientY <= elRect.bottom) {
        return false;
      }
    }

    return true;
  }

  onPreRender(dt: number): void {
    super.onPreRender(dt);
    if (this.activity > 0.01) {
      this.domElement.style.boxShadow = `0 0 ${this.activity * 20}px rgba(68,136,255,${this.activity * 0.5})`;
    } else {
      this.domElement.style.boxShadow = 'none';
    }
  }

  dispose(): void {
    this.domElement.parentNode?.removeChild(this.domElement);
    super.dispose();
  }

  /** Helper to set up standard FZUI container styles. */
  protected setupContainerStyles(
    width: number,
    height: number,
    theme: 'dark' | 'light' = 'dark',
    customStyles: Partial<CSSStyleDeclaration> = {}
  ): void {
    const palette = NODE_PALETTE[theme];

    Object.assign(this.domElement.style, {
      width: `${width}px`,
      height: `${height}px`,
      position: 'absolute',
      pointerEvents: 'auto',
      backgroundColor: 'var(--node-bg, ' + palette.surface + ')',
      color: palette.text,
      border: `1px solid ${palette.border}`,
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
      ...customStyles,
    });
  }

  /** Helper to create a standard FZUI title bar. */
  protected createTitleBar(title: string, theme: 'dark' | 'light' = 'dark'): HTMLElement {
    const palette = NODE_PALETTE[theme];

    const titleBar = DOMUtils.createElement('div');
    Object.assign(titleBar.style, {
      background: palette.headerSurface,
      padding: '8px 12px',
      fontWeight: '600',
      fontSize: '13px',
      color: palette.mutedText,
      borderBottom: `1px solid ${palette.border}`,
      display: 'flex',
      alignItems: 'center',
      flexShrink: '0',
      userSelect: 'none',
    });

    const titleSpan = DOMUtils.createElement('span');
    titleSpan.textContent = title;
    titleSpan.className = 'sg-node-title';
    titleBar.appendChild(titleSpan);
    this.titleElement = titleSpan;

    return titleBar;
  }

  protected updateBackingGeometry(width: number, height: number): void {
    this._meshGeometry.dispose();
    this._meshGeometry = new THREE.PlaneGeometry(width, height);
    this.backingMesh.geometry = this._meshGeometry;
  }

  /**
   * A dimension of the node after an update: the value the update carries, the value the node
   * already holds, or the default. A value that is not a number falls back to the default.
   */
  protected dimension(data: NodeData | undefined, key: string, fallback: number): number {
    const value = data?.[key] ?? this.data?.[key] ?? fallback;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? fallback : numeric;
  }

  /** Resize the element and the backing geometry that frames it. */
  protected applySize(width: number, height: number): void {
    this.domElement.style.width = `${width}px`;
    this.domElement.style.height = `${height}px`;
    this.updateBackingGeometry(width, height);
  }

  /** Relay pointer events from this DOM element to the WebGL canvas. */
  private _setupPointerEventRelay(sg: SpaceGraph | undefined): void {
    if (!sg?.renderer?.renderer?.domElement) return;

    const canvas = sg.renderer.renderer.domElement as HTMLCanvasElement;
    const el = this.domElement;

    const relayPointer = (type: string, src: PointerEvent) => {
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: false,
          cancelable: true,
          clientX: src.clientX,
          clientY: src.clientY,
          pointerId: src.pointerId,
          pointerType: src.pointerType,
          isPrimary: src.isPrimary,
          button: src.button,
          buttons: src.buttons,
          ctrlKey: src.ctrlKey,
          shiftKey: src.shiftKey,
          altKey: src.altKey,
          metaKey: src.metaKey,
        })
      );
    };

    const relayMouse = (type: string, src: MouseEvent) => {
      canvas.dispatchEvent(
        new MouseEvent(type, {
          bubbles: false,
          cancelable: true,
          clientX: src.clientX,
          clientY: src.clientY,
        })
      );
    };

    el.addEventListener('mouseenter', (e) => {
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: false,
          clientX: e.clientX,
          clientY: e.clientY,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
        })
      );
    });

    el.addEventListener('mouseleave', () => {
      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: false,
          clientX: -99999,
          clientY: -99999,
        })
      );
    });

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      relayPointer('pointerdown', e);
    });

    // The middle button belongs to the camera, not to the browser's autoscroll.
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });

    el.addEventListener('wheel', (e) => {
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: false,
          cancelable: true,
          clientX: e.clientX,
          clientY: e.clientY,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
        })
      );
    });

    el.addEventListener('pointermove', (e) => {
      relayPointer('pointermove', e);
    });
    el.addEventListener('pointerup', (e) => {
      relayPointer('pointerup', e);
    });
    el.addEventListener('pointercancel', (e) => {
      relayPointer('pointercancel', e);
    });

    el.addEventListener('dblclick', (e) => {
      relayMouse('dblclick', e);
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      relayMouse('contextmenu', e);
    });
  }
}
