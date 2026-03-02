import * as THREE from 'three';
import gsap from 'gsap';
import type { SpaceGraph } from '../SpaceGraph';

export class CameraControls {
  private sg: SpaceGraph;
  private isDragging = false;
  private dragMode: 'rotate' | 'pan' = 'rotate';
  private previousMousePosition = { x: 0, y: 0 };
  private spherical = { theta: 0, phi: Math.PI / 2, radius: 500 };
  private target = new THREE.Vector3(0, 0, 0);

  private damping = 0.9;
  private velocity = { x: 0, y: 0 };
  private panVelocity = { x: 0, y: 0 };

  constructor(sg: SpaceGraph) {
    this.sg = sg;
    this.setupControls();
  }

  private updateCameraPosition() {
    const camera = this.sg.renderer.camera;
    camera.position.x = this.target.x + this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    camera.position.y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
    camera.position.z = this.target.z + this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    camera.lookAt(this.target);

    this.sg.events.emit('camera:move', { position: camera.position, target: this.target.clone() });
  }

  public flyTo(targetPos: THREE.Vector3, targetRadius: number, duration: number = 1.5): void {
      // Animate both the look-at target and the spherical radius
      gsap.to(this.target, {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z,
          duration,
          ease: "power2.inOut"
      });

      gsap.to(this.spherical, {
          radius: targetRadius,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
              this.updateCameraPosition();
          }
      });
  }

  public update() {
    let changed = false;

    if (!this.isDragging && (Math.abs(this.velocity.x) > 0.0001 || Math.abs(this.velocity.y) > 0.0001)) {
      this.spherical.theta -= this.velocity.x;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y));

      this.velocity.x *= this.damping;
      this.velocity.y *= this.damping;
      changed = true;
    }

    if (!this.isDragging && (Math.abs(this.panVelocity.x) > 0.0001 || Math.abs(this.panVelocity.y) > 0.0001)) {
      const camera = this.sg.renderer.camera;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);

      this.target.add(right.multiplyScalar(this.panVelocity.x));
      this.target.add(up.multiplyScalar(this.panVelocity.y));

      this.panVelocity.x *= this.damping;
      this.panVelocity.y *= this.damping;
      changed = true;
    }

    if (changed) {
      this.updateCameraPosition();
    }
  }

  private setupControls() {
    const canvas = this.sg.renderer.renderer.domElement;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragMode = e.button === 2 ? 'pan' : 'rotate';
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      if (this.dragMode === 'rotate') this.velocity = { x: 0, y: 0 };
      if (this.dragMode === 'pan') this.panVelocity = { x: 0, y: 0 };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.dragMode === 'rotate') {
        this.velocity.x = deltaX * 0.005;
        this.velocity.y = deltaY * 0.005;

        this.spherical.theta -= this.velocity.x;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y));
      } else if (this.dragMode === 'pan') {
        // Calculate pan distance based on camera distance to maintain perceived speed
        const panSpeed = this.spherical.radius * 0.002;
        this.panVelocity.x = -deltaX * panSpeed;
        this.panVelocity.y = deltaY * panSpeed;

        const camera = this.sg.renderer.camera;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);

        this.target.add(right.multiplyScalar(this.panVelocity.x));
        this.target.add(up.multiplyScalar(this.panVelocity.y));
      }

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
        this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      this.spherical.radius = Math.max(10, Math.min(5000, this.spherical.radius + e.deltaY));
      this.updateCameraPosition();
      e.preventDefault();
    }, { passive: false });

    this.updateCameraPosition();
  }
}
