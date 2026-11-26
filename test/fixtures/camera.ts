import * as THREE from 'three';
import { CameraControls, type CameraControlsConfig } from '../../src/core/CameraControls';

/** Camera-controls fixture with a fixed 800x600 container. */
export function makeCameraControls(
    config: Partial<CameraControlsConfig> = {},
    update = false,
): { controls: CameraControls; camera: THREE.PerspectiveCamera; container: HTMLDivElement } {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800 });
    Object.defineProperty(container, 'clientHeight', { value: 600 });
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000);
    camera.position.set(0, 0, 500);
    const controls = new CameraControls(camera, container, config);
    if (update) controls.update();
    return { controls, camera, container };
}
