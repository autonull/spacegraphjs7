import * as THREE from 'three';
import gsap from 'gsap';
import type { SpaceGraph } from '../SpaceGraph';

export class CameraControls {
  private sg: SpaceGraph;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private spherical = { theta: 0, phi: Math.PI / 2, radius: 500 };

  private damping = 0.9;
  private velocity = { x: 0, y: 0 };

  constructor(sg: SpaceGraph) {
    this.sg = sg;
    this.setupControls();
  }

  private updateCameraPosition() {
    const camera = this.sg.renderer.camera;
    camera.position.x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi);
    camera.position.z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    camera.lookAt(0, 0, 0);

    this.sg.events.emit('camera:move', { position: camera.position, target: new THREE.Vector3(0, 0, 0) });
  }

  public flyTo(targetPos: THREE.Vector3, duration: number = 1.5): void {
      const camera = this.sg.renderer.camera;

      // Update spherical based on new targetPos
      const radius = targetPos.length();
      const theta = Math.atan2(targetPos.x, targetPos.z);
      const phi = Math.acos(targetPos.y / radius);

      gsap.to(this.spherical, {
          radius,
          theta,
          phi,
          duration,
          ease: "power2.inOut",
          onUpdate: () => {
              this.updateCameraPosition();
          }
      });
  }

  public update() {
    if (!this.isDragging && (Math.abs(this.velocity.x) > 0.0001 || Math.abs(this.velocity.y) > 0.0001)) {
      this.spherical.theta -= this.velocity.x;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y));

      this.velocity.x *= this.damping;
      this.velocity.y *= this.damping;

      this.updateCameraPosition();
    }
  }

  private setupControls() {
    const canvas = this.sg.renderer.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.velocity = { x: 0, y: 0 };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.velocity.x = deltaX * 0.005;
      this.velocity.y = deltaY * 0.005;

      this.spherical.theta -= this.velocity.x;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + this.velocity.y));

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
