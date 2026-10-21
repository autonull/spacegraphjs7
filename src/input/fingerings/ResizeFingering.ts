import type { Node } from '../../nodes/Node';
import { NodeResizer } from '../../utils/nodeResize';
import { worldToScreen } from '../../utils/projection';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class ResizeFingering extends BaseFingering {
  private resizer = new NodeResizer();

  start(finger: Finger): boolean {
    if (finger.buttons !== 1) return false;

    const result = this.raycaster.raycastNode();
    if (!result?.node || !result.node.data?.width || !result.node.data?.height) return false;

    const resizeHandle = this.checkResizeHandle(result.node, finger.position.x, finger.position.y);
    if (!resizeHandle) return false;

    if (!this.resizer.start(this.sg, result.node, finger.position.x, finger.position.y)) return false;

    this.active = true;
    result.node.pulse(1.0);
    this.emit('resize:start', { node: result.node });
    return true;
  }

  update(finger: Finger): boolean {
    if (!this.active) return false;

    const size = this.resizer.update(finger.position.x, finger.position.y);
    if (!size) return false;

    this.emit('resize:update', {
      node: this.resizer.resizedNode,
      width: size.width,
      height: size.height,
    });
    return true;
  }

  stop(_finger: Finger): void {
    const node = this.resizer.end();
    if (node) this.emit('resize:end', { node });
    this.active = false;
  }

  defer(_finger: Finger): boolean {
    return false;
  }

  private checkResizeHandle(node: Node, x: number, y: number): boolean {
    const data = node.data as Record<string, unknown>;
    const width = (data.width as number) ?? 200;
    const height = (data.height as number) ?? 100;
    const handleSize = 20;

    const pos = this.getScreenPosition(node);
    const right = pos.x + width / 2;
    const bottom = pos.y + height / 2;

    return x >= right - handleSize && x <= right && y >= bottom - handleSize && y <= bottom;
  }

  private getScreenPosition(node: Node): { x: number; y: number } {
    const canvas = this.sg.renderer.renderer.domElement;
    return worldToScreen(node.position, this.sg.renderer.camera, canvas);
  }
}
