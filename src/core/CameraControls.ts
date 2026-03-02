import type { SpaceGraph } from '../SpaceGraph';

export class CameraControls {
  private sg: SpaceGraph;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private spherical = { theta: 0, phi: Math.PI / 2, radius: 500 };

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
  }

  private setupControls() {
    const canvas = this.sg.renderer.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.spherical.theta -= deltaX * 0.005;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + deltaY * 0.005));

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
