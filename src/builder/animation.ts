// builder/animation.ts - Animation helpers

import type { SpaceGraph } from '../SpaceGraph';

type GsapModule = typeof import('gsap');
let gsapCache: GsapModule | null = null;

const getGsap = async (): Promise<GsapModule> => {
  if (!gsapCache) gsapCache = await import('gsap');
  return gsapCache;
};

/** Tween a value and resolve when the tween ends. */
async function tween(
  target: object,
  vars: Record<string, unknown>,
  duration: number
): Promise<void> {
  const { gsap } = await getGsap();
  return new Promise((resolve) => {
    gsap.to(target, {
      ...vars,
      duration,
      ease: 'power2.inOut',
      onComplete: resolve,
    });
  });
}

export const Animate = {
  async move(
    sg: SpaceGraph,
    nodeId: string,
    to: { x?: number; y?: number; z?: number },
    duration = 1000
  ): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return;
    await tween(
      node.position,
      {
        x: to.x ?? node.position.x,
        y: to.y ?? node.position.y,
        z: to.z ?? node.position.z,
        onUpdate: () => {
          node.updatePosition(node.position.x, node.position.y, node.position.z);
        },
      },
      duration / 1000
    );
  },

  async fade(sg: SpaceGraph, nodeId: string, to: number, duration = 500): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return;
    await tween(node.data, { opacity: to }, duration / 1000);
  },

  async scale(sg: SpaceGraph, nodeId: string, to: number, duration = 500): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return;
    await tween(node.object.scale, { x: to, y: to, z: to }, duration / 1000);
  },

  async rotate(
    sg: SpaceGraph,
    nodeId: string,
    to: { x?: number; y?: number; z?: number },
    duration = 1000
  ): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return;
    await tween(node.object.rotation, { x: to.x ?? 0, y: to.y ?? 0, z: to.z ?? 0 }, duration / 1000);
  },

  async color(sg: SpaceGraph, nodeId: string, to: string | number): Promise<void> {
    const node = sg.graph.getNode(nodeId);
    if (!node) return;
    node.data.color = to;
  },

  async sequence(
    sg: SpaceGraph,
    animations: Array<{
      nodeId: string;
      type: 'move' | 'fade' | 'scale' | 'rotate';
      to: unknown;
      duration?: number;
    }>
  ): Promise<void> {
    for (const anim of animations) {
      const fn = Animate[anim.type] as (
        sg: SpaceGraph,
        id: string,
        to: unknown,
        dur?: number
      ) => Promise<void>;
      await fn(sg, anim.nodeId, anim.to, anim.duration);
    }
  },
};

export const Camera = {
  fitView(sg: SpaceGraph, padding?: number, duration?: number): void {
    sg.fitView(padding, duration);
  },

  async flyTo(
    sg: SpaceGraph,
    position: [number, number, number],
    target: [number, number, number],
    duration = 1.5
  ): Promise<void> {
    const controls = sg.cameraControls;
    const start = {
      x: sg.renderer.camera.position.x,
      y: sg.renderer.camera.position.y,
      z: sg.renderer.camera.position.z,
    };
    await tween(
      start,
      {
        x: position[0],
        y: position[1],
        z: position[2],
        onUpdate: () => {
          sg.renderer.camera.position.set(start.x, start.y, start.z);
          controls.target.set(target[0], target[1], target[2]);
          // The controls own the camera pose: the spherical follows the flight, so the next
          // `update()` keeps the pose the flight put the camera in.
          controls.updateSpherical();
          controls.update();
        },
      },
      duration
    );
  },

  async focus(sg: SpaceGraph, nodeIds: string[], padding = 100, duration = 1.5): Promise<void> {
    sg.fitView(padding, duration, nodeIds);
  },

  async orbit(sg: SpaceGraph, angle: number, duration = 1.5): Promise<void> {
    const startTheta = sg.cameraControls.spherical.theta;
    await tween(
      {},
      {
        onUpdate: (self: any) => {
          sg.cameraControls.spherical.theta = startTheta + self.progress() * angle;
          sg.cameraControls.update();
        },
      },
      duration
    );
  },

  async zoomTo(sg: SpaceGraph, zoom: number, duration = 1): Promise<void> {
    const startRadius = sg.cameraControls.spherical.radius;
    await tween(
      sg.cameraControls.spherical,
      {
        radius: startRadius * zoom,
        onUpdate: () => sg.cameraControls.update(),
      },
      duration
    );
  },

  reset(sg: SpaceGraph): void {
    sg.resetCamera();
  },
};
