import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';

export class InteractionPlugin implements ISpaceGraphPlugin {
  readonly id = 'interaction';
  readonly name = 'Interaction Controls';
  readonly version = '1.0.0';

  private sg!: SpaceGraph;
  private dragControls!: DragControls;

  init(sg: SpaceGraph): void {
    this.sg = sg;
    this.initDrag();
  }

  private initDrag(): void {
    const meshes = Array.from(this.sg.graph.nodes.values()).map(node => node.object);

    this.dragControls = new DragControls(
      meshes,
      this.sg.renderer.camera,
      this.sg.renderer.renderer.domElement
    );

    this.dragControls.addEventListener('dragstart', (event) => {
        // Find the node based on the mesh
        const node = this.getNodeFromMesh(event.object);
        if (node) {
            node.data.pinned = true;
            this.sg.events.emit('interaction:dragstart', { node });
        }
    });

    this.dragControls.addEventListener('dragend', (event) => {
        const node = this.getNodeFromMesh(event.object);
        if (node) {
            node.data.pinned = false; // or keep true if you want it permanently pinned
            this.sg.events.emit('interaction:dragend', { node });
        }
    });

    this.dragControls.addEventListener('drag', (event) => {
        const node = this.getNodeFromMesh(event.object);
        if (node) {
            node.position.copy(event.object.position);
        }
    });
  }

  private getNodeFromMesh(mesh: THREE.Object3D): any {
    // Walk up the hierarchy to find the root node object
    let current = mesh;
    while(current.parent && current.parent !== this.sg.renderer.scene) {
        current = current.parent;
    }

    const nodes = Array.from(this.sg.graph.nodes.values());
    return nodes.find(n => n.object === current);
  }

  dispose(): void {
      if (this.dragControls) {
          this.dragControls.dispose();
      }
  }
}
