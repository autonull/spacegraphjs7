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
    this.domElement.innerHTML = `
        <h3 style="margin:0;font-family:sans-serif;font-size:16px">${spec.label || 'HTML Node'}</h3>
        <p style="margin:5px 0 0;font-family:sans-serif;font-size:12px">${spec.data?.description || ''}</p>
    `;

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
