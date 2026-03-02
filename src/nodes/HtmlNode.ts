import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class HtmlNode extends Node {
  public domElement: HTMLElement;
  public cssObject: CSS3DObject;
  private meshGeometry: THREE.PlaneGeometry;
  private meshMaterial: THREE.MeshBasicMaterial;

  constructor(sg: SpaceGraph, spec: NodeSpec) {
    super(sg, spec);

    this.domElement = document.createElement('div');
    this.domElement.className = 'spacegraph-html-node';
    this.domElement.style.width = '200px';
    this.domElement.style.height = '100px';
    this.domElement.style.backgroundColor = spec.data?.color || 'rgba(51, 102, 255, 0.8)';
    this.domElement.style.color = 'white';
    this.domElement.style.border = '2px solid white';
    this.domElement.style.borderRadius = '8px';
    this.domElement.style.padding = '10px';
    this.domElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    this.domElement.style.display = 'flex';
    this.domElement.style.flexDirection = 'column';
    this.domElement.style.justifyContent = 'center';
    this.domElement.style.alignItems = 'center';

    const titleEl = document.createElement('h3');
    titleEl.style.margin = '0';
    titleEl.style.fontFamily = 'sans-serif';
    titleEl.style.fontSize = '16px';
    titleEl.className = 'html-node-title';
    titleEl.textContent = spec.label || 'HTML Node';

    const descEl = document.createElement('p');
    descEl.style.margin = '5px 0 0';
    descEl.style.fontFamily = 'sans-serif';
    descEl.style.fontSize = '12px';
    descEl.className = 'html-node-desc';
    descEl.textContent = spec.data?.description || '';

    this.domElement.appendChild(titleEl);
    this.domElement.appendChild(descEl);

    this.cssObject = new CSS3DObject(this.domElement);
    this.object.add(this.cssObject);

    // Optional backing mesh for raycasting/webgl representation
    this.meshGeometry = new THREE.PlaneGeometry(200, 100);
    this.meshMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        opacity: 0.1,
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);
    this.object.add(mesh);

    this.updatePosition(this.position.x, this.position.y, this.position.z);
  }

  updateSpec(updates: Partial<NodeSpec>) {
    super.updateSpec(updates);

    if (updates.data && updates.data.color) {
      this.domElement.style.backgroundColor = updates.data.color;
    }

    if (updates.label !== undefined) {
      const titleEl = this.domElement.querySelector('.html-node-title');
      if (titleEl) {
        titleEl.textContent = updates.label || 'HTML Node';
      }
    }

    if (updates.data && updates.data.description !== undefined) {
      const descEl = this.domElement.querySelector('.html-node-desc');
      if (descEl) {
        descEl.textContent = updates.data.description || '';
      }
    }
  }

  dispose(): void {
    if (this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
    if (this.meshGeometry) {
      this.meshGeometry.dispose();
    }
    if (this.meshMaterial) {
      this.meshMaterial.dispose();
    }
    super.dispose();
  }
}
