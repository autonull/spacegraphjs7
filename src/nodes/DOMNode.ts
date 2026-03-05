import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';

export class DOMNode extends Node {
    public domElement: HTMLElement;
    public cssObject: CSS3DObject;
    public meshGeometry: THREE.PlaneGeometry;
    public meshMaterial: THREE.MeshBasicMaterial;
    public backingMesh: THREE.Mesh;

    constructor(
        sg: SpaceGraph,
        spec: NodeSpec,
        domElement: HTMLElement,
        width: number = 200,
        height: number = 100,
        materialParams?: THREE.MeshBasicMaterialParameters
    ) {
        super(sg, spec);

        this.domElement = domElement;
        this.cssObject = new CSS3DObject(this.domElement);
        this.object.add(this.cssObject);

        this.meshGeometry = new THREE.PlaneGeometry(width, height);

        // Provide standard defaults but allow overrides
        const defaultTranslucency = materialParams?.visible === false ? {} : { color: 0x000000, opacity: 0.1, transparent: true };
        this.meshMaterial = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            ...defaultTranslucency,
            ...materialParams,
        });

        this.backingMesh = new THREE.Mesh(this.meshGeometry, this.meshMaterial);
        this.object.add(this.backingMesh);
    }

    protected updateBackingGeometry(width: number, height: number): void {
        if (this.meshGeometry) this.meshGeometry.dispose();
        this.meshGeometry = new THREE.PlaneGeometry(width, height);
        this.backingMesh.geometry = this.meshGeometry;
    }

    public setVisibility(visible: boolean): void {
        this.cssObject.visible = visible;
        this.domElement.style.display = visible ? 'flex' : 'none';
        this.backingMesh.visible = visible;
    }

    dispose(): void {
        if (this.domElement.parentNode) {
            this.domElement.parentNode.removeChild(this.domElement);
        }
        if (this.meshGeometry) this.meshGeometry.dispose();
        if (this.meshMaterial) this.meshMaterial.dispose();
        super.dispose();
    }
}
