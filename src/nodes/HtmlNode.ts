import * as THREE from 'three';
import { lodLevelAt, lodVisibility } from '../core/lod';
import type { SpaceGraph } from '../SpaceGraph';
import type { LabelLodLevel, NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';
import { toCssColor } from '../utils/color';
import { clamp } from '../utils/math';
import { BaseContentNode } from './BaseContentNode';
import { createQuickControls, type QuickControlButton } from './QuickControls';

const PARENT_ROTATION = new THREE.Quaternion();

export class HtmlNode extends BaseContentNode {
  static typeName: string = 'HtmlNode';
  public static MIN_SIZE = { width: 80, height: 40 };
  public static DEFAULT_SIZE = { width: 200, height: 100 };
  public static CONTENT_SCALE_RANGE = { min: 0.3, max: 3.0 };
  /** The wrapper a control node lays its parts out with: a gapped, padded column. */
  protected static readonly CONTROL_WRAPPER_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
  } as const;
  public readonly isHtmlNode = true;
  public size = { width: 160, height: 70 };
  public billboard = false;
  public labelLod: LabelLodLevel[] = [];
  public override focusable = true;
  private resizeHandle: HTMLElement | null = null;
  private contentWrapper: HTMLElement | null = null;
  private controlsWrapper: HTMLElement | null = null;

  constructor(sg: SpaceGraph | undefined, spec: NodeSpec) {
    const width = (spec.data?.width as number) ?? 200;
    const height = (spec.data?.height as number) ?? 100;
    const bgColor =
      (spec.data?.backgroundColor as string) ??
      (spec.data?.color as string) ??
      'rgba(51, 102, 255, 0.8)';
    const useRawHtml = spec.data?.useRawHtml === true;

    super(sg, spec, {
      defaultWidth: 200,
      defaultHeight: 100,
      materialParams: { visible: false },
      className: `spacegraph-html-node ${(spec.data?.className as string) ?? ''}`,
      customStyles: {
        backgroundColor: useRawHtml ? 'transparent' : bgColor,
        color: 'white',
        border: useRawHtml ? 'none' : '2px solid white',
        boxShadow: useRawHtml ? 'none' : '0 8px 32px rgba(0,0,0,0.5)',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: (spec.data?.pointerEvents as string) ?? 'auto',
        ...((spec.data?.style as Record<string, string>) ?? {}),
      },
      updatePositionOnInit: true,
    });

    this.domElement.id = `node-html-${spec.id}`;
    this.domElement.style.setProperty('--node-bg', useRawHtml ? 'transparent' : bgColor);
    this.domElement.dataset.nodeId = spec.id;
    this.domElement.classList.add('html-node-container');

    this.setSize(width, height, false);

    this._createInnerContent(spec);

    if (spec.data?.showControls !== false) {
      this._createControls();
    }

    if (spec.data?.title) {
      const bar = this.createTitleBar(
        spec.data.title as string,
        (spec.data.theme as 'dark' | 'light') ?? 'dark'
      );
      this.domElement.insertBefore(bar, this.domElement.firstChild);
    }
    this._createResizeHandle();

    const data = (spec.data as SpaceGraphNodeData) ?? {};
    if (data.contentScale) this.setContentScale(data.contentScale as number);
    if (data.billboard) this.billboard = data.billboard as boolean;
    if (data.labelLod) this.labelLod = data.labelLod as LabelLodLevel[];

    this._applyNodeBgColor(useRawHtml ? 'transparent' : bgColor);
  }

  updateSpec(updates: Partial<NodeSpec>): this {
    super.updateSpec(updates);

    const data = updates.data as SpaceGraphNodeData | undefined;

    if (data) {
      if (data.color !== undefined) this._applyBackgroundColor(data.color as string | number);
      if (data.backgroundColor !== undefined) {
        this._applyBackgroundColor(data.backgroundColor as string | number);
      }
      if (data.className !== undefined) {
        this.domElement.className = `spacegraph-html-node ${data.className as string}`;
      }
      if (data.pointerEvents !== undefined) {
        this.domElement.style.pointerEvents = data.pointerEvents as string;
      }
      if (data.width !== undefined || data.height !== undefined) this._handleSizeUpdate(data);
      if (data.contentScale !== undefined) this.setContentScale(data.contentScale as number);
      if (data.billboard !== undefined) this.billboard = data.billboard as boolean;
      if (data.labelLod !== undefined) this.labelLod = data.labelLod as LabelLodLevel[];
      if (data.style !== undefined) Object.assign(this.domElement.style, data.style);
    }

    // The host's markup is the content. A label never replaces it: a card that shows a styled
    // document keeps it when the model updates, and only a card without markup falls back to its
    // label.
    const hasMarkup = this.data?.html !== undefined || this.data?.content !== undefined;

    if (data?.html !== undefined) {
      if (this.contentWrapper && this.contentWrapper.innerHTML !== data.html) {
        this.contentWrapper.innerHTML = data.html as string;
        this.markInteractiveContent();
      }
    } else if (data?.content !== undefined) {
      if (
        this.contentWrapper &&
        !this.contentWrapper.isContentEditable &&
        this.contentWrapper.textContent !== data.content
      ) {
        this.contentWrapper.textContent = data.content as string;
      }
    } else if (
      !hasMarkup &&
      updates.label !== undefined &&
      this.contentWrapper &&
      !this.contentWrapper.isContentEditable
    ) {
      this.contentWrapper.textContent = updates.label;
    }

    return this;
  }

  setSize(width: number, height: number, scaleContent: boolean | number = true): this {
    const oldSize = { ...this.size };
    const oldArea = oldSize.width * oldSize.height;

    this.size.width = Math.max(HtmlNode.MIN_SIZE.width, width);
    this.size.height = Math.max(HtmlNode.MIN_SIZE.height, height);

    this.applySize(this.size.width, this.size.height);

    if (scaleContent === true && oldArea > 0) {
      const scaleFactor = Math.sqrt((this.size.width * this.size.height) / oldArea);
      this.setContentScale(((this.data?.contentScale as number) ?? 1.0) * scaleFactor);
    }

    this.data = { ...this.data, width: this.size.width, height: this.size.height };
    return this;
  }

  setContentScale(scale: number): void {
    const clampedScale = clamp(
      scale,
      HtmlNode.CONTENT_SCALE_RANGE.min,
      HtmlNode.CONTENT_SCALE_RANGE.max
    );
    this.data = { ...this.data, contentScale: clampedScale };

    if (this.contentWrapper) {
      this.contentWrapper.style.transform = `scale(${clampedScale})`;
    }

    this.emitDataChanged('contentScale', clampedScale);
  }

  adjustContentScale(deltaFactor: number): void {
    this.setContentScale(((this.data?.contentScale as number) ?? 1.0) * deltaFactor);
  }

  adjustNodeSize(factor: number): void {
    this.setSize(this.size.width * factor, this.size.height * factor, false);
  }

  startResize(): void {
    this.domElement?.classList.add('resizing');
    this.data.pinned = true;
    this.sg?.events.emit('node:resizestart', { node: this });
  }

  resize(newWidth: number, newHeight: number): void {
    this.setSize(newWidth, newHeight);
    this.sg?.events.emit('node:resized', { node: this, size: { ...this.size } });
  }

  endResize(): void {
    this.domElement?.classList.remove('resizing');
    this.data.pinned = false;
    this.sg?.events.emit('node:resizeend', { node: this, finalSize: { ...this.size } });
  }

  startDrag(): void {
    this.domElement?.classList.add('dragging');
  }

  endDrag(): void {
    this.domElement?.classList.remove('dragging');
  }

  setSelectedStyle(selected: boolean): void {
    this.domElement?.classList.toggle('selected', selected);
  }

  focus(): void {
    super.focus();
    this.domElement?.classList.add('focused');
  }

  blur(): void {
    super.blur();
    this.domElement?.classList.remove('focused');
  }

  updatePosition(x: number, y: number, z: number): this {
    super.updatePosition(x, y, z);
    this.faceCamera();

    return this;
  }

  onPreRender(dt: number): void {
    super.onPreRender(dt);
    // T1.3: a billboard stays screen-facing when the camera pose changes after the node was placed.
    this.faceCamera();
  }

  protected faceCamera(): void {
    const renderer = this.sg?.renderer;
    const camera = renderer?.camera;
    if (!renderer || !camera) return;
    // The renderer decides, not the node: 'camera' turns every card to face the reader, and 'plane'
    // lays the whole scene in the content plane — a tilted camera then shears every card the way it
    // shears the mesh edges, and that shear is the perspective working (T1.19). A node's own
    // `billboard` flag used to override this; the renderer's policy is the single switch now.
    if (renderer.cardFacing !== 'camera') return;

    // The CSS3D pipeline composes the camera's view matrix with the node's world matrix, so a
    // screen-aligned node carries the camera's rotation — not its inverse. The inverse turned the
    // card twice and left it rolled and squashed (T1.19).
    this.cssObject.quaternion.copy(camera.quaternion);

    // The node's group normally carries no rotation, but a node that turns its own group (a panel
    // that faces the camera) has to be turned back in that group's frame.
    const parent = this.cssObject.parent;
    if (!parent) return;
    parent.getWorldQuaternion(PARENT_ROTATION).invert();
    this.cssObject.quaternion.premultiply(PARENT_ROTATION);
  }

  getBoundingSphereRadius(): number {
    return Math.sqrt(this.size.width ** 2 + this.size.height ** 2) / 2;
  }

  getResizeHandle(): HTMLElement | null {
    return this.resizeHandle;
  }

  setBackgroundColor(color: string): void {
    this.data = { ...this.data, backgroundColor: color };
    this.domElement.style.backgroundColor = color;
    this._applyNodeBgColor(color);
    this.emitDataChanged('backgroundColor', color);
  }

  updateLod(_distance: number): void {
    const camera = this.sg?.renderer?.camera;
    if (!this.labelLod.length) {
      this.resetLodStyles();
      return;
    }
    if (!camera) return;

    const level = lodLevelAt(this.labelLod, this.position.distanceTo(camera.position));
    const baseScale = (this.data?.contentScale as number) ?? 1.0;
    const hidden =
      level?.style?.includes('display:none') === true || level?.style?.includes('visibility:hidden') === true;

    this.domElement.style.visibility = lodVisibility(level);
    this.domElement.style.display = level?.style?.includes('display:none') ? 'none' : 'flex';
    // The edges of a hidden card must go with it: the plugin reads the CSS object's visibility to
    // decide, and a card that only changed its CSS would leave its edges drawn.
    this.cssObject.visible = !hidden;
    if (this.contentWrapper) {
      this.contentWrapper.style.transform = `scale(${baseScale * (level?.scale ?? 1.0)})`;
    }
  }

  private resetLodStyles(): void {
    const baseScale = (this.data?.contentScale as number) ?? 1.0;
    this.domElement.style.visibility = '';
    this.domElement.style.display = 'flex';
    if (this.contentWrapper) {
      this.contentWrapper.style.transform = `scale(${baseScale})`;
    }
  }

  dispose(): void {
    this.resizeHandle?.remove();
    this.controlsWrapper?.remove();
    this.contentWrapper?.remove();
    super.dispose();
  }

  private _createInnerContent(spec: NodeSpec): void {    const useRawHtml = spec.data?.useRawHtml === true;
    const wrapper = DOMUtils.createElement('div');
    wrapper.className = 'node-inner-wrapper';
    Object.assign(wrapper.style, {
      width: '100%',
      flex: '1 1 auto',
      minHeight: '0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      position: 'relative',
      boxSizing: 'border-box',
    });

    const contentWrapper = DOMUtils.createElement('div');
    contentWrapper.className = 'node-content';
    Object.assign(contentWrapper.style, {
      width: '100%',
      flex: '1 0 auto',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: '1',
      boxSizing: 'border-box',
      pointerEvents: 'auto',
    });
    const data = (spec.data as SpaceGraphNodeData) ?? {};
    contentWrapper.style.transform = `scale(${(data.contentScale as number) ?? 1.0})`;
    contentWrapper.style.transformOrigin = 'center center';

    if (data.html) {
      contentWrapper.innerHTML = data.html as string;
      if (
        useRawHtml ||
        (!spec.data?.className &&
          !spec.data?.style &&
          !spec.data?.color &&
          !spec.data?.backgroundColor)
      ) {
        Object.assign(this.domElement.style, {
          padding: '0',
          border: 'none',
          backgroundColor: 'transparent',
          backdropFilter: 'none',
          boxShadow: 'none',
        });
      }
    } else if (data.editable) {
      contentWrapper.contentEditable = 'true';
      contentWrapper.spellcheck = false;
      contentWrapper.dataset.sgInteractive = 'true';
      contentWrapper.innerHTML = (data.content as string) ?? spec.label ?? 'HTML Node';

      let debounceTimer: ReturnType<typeof setTimeout>;
      contentWrapper.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.data = { ...this.data, content: contentWrapper.innerHTML };
          this.emitDataChanged('content', contentWrapper.innerHTML);
        }, 300);
      });

      contentWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
      contentWrapper.addEventListener('touchstart', (e) => e.stopPropagation(), {
        passive: true,
      });
      contentWrapper.addEventListener(
        'wheel',
        (e) => {
          const isScrollable =
            contentWrapper.scrollHeight > contentWrapper.clientHeight ||
            contentWrapper.scrollWidth > contentWrapper.clientWidth;
          const canScrollY =
            (e.deltaY < 0 && contentWrapper.scrollTop > 0) ||
            (e.deltaY > 0 &&
              contentWrapper.scrollTop < contentWrapper.scrollHeight - contentWrapper.clientHeight);
          const canScrollX =
            (e.deltaX < 0 && contentWrapper.scrollLeft > 0) ||
            (e.deltaX > 0 &&
              contentWrapper.scrollLeft < contentWrapper.scrollWidth - contentWrapper.clientWidth);
          if (isScrollable && (canScrollY || canScrollX)) {
            e.stopPropagation();
          }
        },
        { passive: false }
      );
    } else {
      contentWrapper.innerHTML = (data.content as string) ?? spec.label ?? 'HTML Node';
    }

    wrapper.appendChild(contentWrapper);
    this.domElement.appendChild(wrapper);
    this.contentWrapper = contentWrapper;
    this.markInteractiveContent();
  }

  /**
   * The controls inside a card take the mouse: a slider the reader is moving must not drag the
   * card out from under them. A host can mark its own controls with `data-sg-interactive`; the
   * standard ones are marked here.
   */
  private markInteractiveContent(): void {
    const controls = this.domElement.querySelectorAll(
      'input, button, select, textarea, [role="slider"], [role="switch"], [contenteditable="true"]'
    );

    for (const control of controls) {
      if (control.getAttribute('data-sg-interactive') === null) {
        control.setAttribute('data-sg-interactive', 'true');
      }
    }
  }

  private _createControls(): void {
    const buttons: QuickControlButton[] = [
      {
        className: 'node-content-zoom-in',
        title: 'Zoom In Content (+)',
        icon: '➕',
        action: () => this.adjustContentScale(1.15),
      },
      {
        className: 'node-content-zoom-out',
        title: 'Zoom Out Content (-)',
        icon: '➖',
        action: () => this.adjustContentScale(1 / 1.15),
      },
      {
        className: 'node-grow',
        title: 'Grow Node (Ctrl++)',
        icon: '↗️',
        action: () => this.adjustNodeSize(1.2),
      },
      {
        className: 'node-shrink',
        title: 'Shrink Node (Ctrl+-)',
        icon: '↙️',
        action: () => this.adjustNodeSize(1 / 1.2),
      },
      {
        className: 'node-delete',
        title: 'Delete Node (Del)',
        icon: '🗑️',
        action: () => this._requestDelete(),
      },
    ];

    const { container } = createQuickControls(buttons, this.domElement);
    this.controlsWrapper = container;
  }

  private _createResizeHandle(): void {
    const handle = DOMUtils.createElement('div');
    handle.className = 'resize-handle';
    handle.title = 'Resize Node';
    handle.style.cssText = `
            position: absolute;
            right: -6px;
            bottom: -6px;
            width: 12px;
            height: 12px;
            background: white;
            border: 1px solid #333;
            border-radius: 2px;
            cursor: nwse-resize;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 10;
        `;

    this.domElement.appendChild(handle);
    this.resizeHandle = handle;

    this.domElement.addEventListener('mouseenter', () => {
      handle.style.opacity = '1';
    });
    this.domElement.addEventListener('mouseleave', () => {
      handle.style.opacity = '0';
    });
  }

  private _requestDelete(): void {
    this.sg?.events.emit('ui:request:confirm', {
      message: `Delete node "${this.id.substring(0, 10)}..."?`,
      onConfirm: () => {
        this.sg?.events.emit('node:delete', { node: this });
      },
    });
  }

  private _handleSizeUpdate(data: SpaceGraphNodeData): void {
    const { DEFAULT_SIZE } = HtmlNode;
    // A host-driven size change re-flows the card's content; it does not scale it. The content is
    // the host's markup, and a card that changes tier must show the new tier, not a blown-up old one.
    this.setSize(
      this.dimension(data, 'width', DEFAULT_SIZE.width),
      this.dimension(data, 'height', DEFAULT_SIZE.height),
      false,
    );
  }

  private _applyNodeBgColor(color: string): void {
    this.domElement.style.setProperty('--node-bg', color);
  }

  private _applyBackgroundColor(color: string | number): void {
    const css = toCssColor(color);
    this.domElement.style.backgroundColor = css;
    this._applyNodeBgColor(css);
  }
}
