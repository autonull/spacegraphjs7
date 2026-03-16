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
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isDragging = false;
  private pointerDownPosition = new THREE.Vector2();

  init(sg: SpaceGraph): void {
    this.sg = sg;
    this.initDrag();
    this.initClick();
  }

  private initClick(): void {
    const canvas = this.sg.renderer.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
        this.pointerDownPosition.set(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerup', (e) => {
        // Only trigger click if the pointer hasn't moved much (not a drag)
        const distance = this.pointerDownPosition.distanceTo(new THREE.Vector2(e.clientX, e.clientY));
        if (distance > 5 || this.isDragging) return;

        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sg.renderer.camera);

        const meshes = Array.from(this.sg.graph.nodes.values()).flatMap(node => {
            // Support nested meshes within the node object
            const children: THREE.Object3D[] = [];
            node.object.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) children.push(child);
            });
            return children;
        });

        const intersects = this.raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
            const node = this.getNodeFromMesh(intersects[0].object);
            if (node) {
                this.sg.events.emit('node:click', { node, event: e });
            }
        } else {
            // Emitted when clicking on empty space
            this.sg.events.emit('graph:click', { event: e });
        }
    });
  }

  private initDrag(): void {
    const meshes = Array.from(this.sg.graph.nodes.values()).map(node => node.object);

    this.dragControls = new DragControls(
      meshes,
      this.sg.renderer.camera,
      this.sg.renderer.renderer.domElement
    );

    this.dragControls.addEventListener('dragstart', (event) => {
        this.isDragging = true;
        // Find the node based on the mesh
        const node = this.getNodeFromMesh(event.object);
        if (node) {
            node.data.pinned = true;
            this.sg.events.emit('interaction:dragstart', { node });
        }
    });

    this.dragControls.addEventListener('dragend', (event) => {
        this.isDragging = false;
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
