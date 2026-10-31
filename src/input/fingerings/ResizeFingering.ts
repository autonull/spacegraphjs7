import type { Node } from '../../nodes/Node';
import { NodeResizer, nodeScreenSize } from '../../utils/nodeResize';
import { worldToClient } from '../../utils/projection';
import type { Finger } from '../Fingering';
import { BaseFingering } from './BaseFingering';

export class ResizeFingering extends BaseFingering {
  private resizer = new NodeResizer();

  start(finger: Finger): boolean {
    if (finger.buttons !== 1) return false;

    const result = this.pickNode(finger);
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

  private checkResizeHandle(node: Node, clientX: number, clientY: number): boolean {
    const handleSize = 20;
    const size = nodeScreenSize(this.sg, node);
    const pos = worldToClient(
      node.position,
      this.sg.renderer.camera,
      this.sg.renderer.renderer.domElement
    );
    const right = pos.x + size.width / 2;
    const bottom = pos.y + size.height / 2;

    return (
      clientX >= right - handleSize &&
      clientX <= right &&
      clientY >= bottom - handleSize &&
      clientY <= bottom
    );
  }
}
