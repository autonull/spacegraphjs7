// SpaceGraphJS v7.0 - HtmlNode
// HTML/CSS node using CSS3DRenderer

import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from '../../graph/Node';
import type { NodeSpec, HtmlNodeData } from '../../graph/types';

export class HtmlNode extends Node {
  private cssObject: CSS3DObject;
  private element: HTMLElement;
  private size: { width: number; height: number };

  constructor(spec: NodeSpec<HtmlNodeData>) {
    super(spec);

    const data = spec.data ?? {};
    const width = data.width ?? 200;
    const height = data.height ?? 100;

    this.size = { width, height };

    // Create HTML element
    this.element = document.createElement('div');
    this.element.className = `spacegraph-html-node ${data.className ?? ''}`;
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    this.element.style.pointerEvents = data.pointerEvents ?? 'auto';

    // Set content
    if (data.html) {
      this.element.innerHTML = data.html;
    } else {
      this.element.textContent = spec.label ?? 'HTML Node';
    }

    // Create CSS3D object
    this.cssObject = new CSS3DObject(this.element);
    this.cssObject.position.copy(this.position);
    this.object.add(this.cssObject);
  }

  override get object(): THREE.Object3D {
    return this.cssObject;
  }

  update(spec: Partial<NodeSpec<HtmlNodeData>>): void {
    super.update(spec);

    if (spec.data) {
      const data = spec.data;

      if (data.html !== undefined) {
        this.element.innerHTML = data.html;
      }

      if (data.className !== undefined) {
        this.element.className = `spacegraph-html-node ${data.className}`;
      }

      if (data.pointerEvents !== undefined) {
        this.element.style.pointerEvents = data.pointerEvents;
      }

      if (data.width !== undefined || data.height !== undefined) {
        const width = data.width ?? this.size.width;
        const height = data.height ?? this.size.height;
        this.size = { width, height };
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
      }
    }

    if (spec.label !== undefined && !spec.data?.html) {
      this.element.textContent = spec.label ?? '';
    }
  }

  setSize(width: number, height: number): void {
    this.size = { width, height };
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
  }

  dispose(): void {
    this.element.remove();
    super.dispose();
  }
}
