// builder/animation.ts - Animation helpers
import type { SpaceGraph } from '../SpaceGraph';
import type { Node } from '../nodes/Node';

type GsapModule = typeof import('gsap');
let gsapCache: GsapModule | null = null;

const getGsap = async (): Promise<GsapModule> => {
    if (!gsapCache) gsapCache = await import('gsap');
    return gsapCache;
};

export const Animate = {
    async move(sg: SpaceGraph, nodeId: string, to: { x?: number; y?: number; z?: number }, duration = 1000): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return;
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            gsap.to(node.position, {
                x: to.x ?? node.position.x,
                y: to.y ?? node.position.y,
                z: to.z ?? node.position.z,
                duration: duration / 1000,
                ease: 'power2.inOut',
                onUpdate: () => node.updatePosition(node.position.x, node.position.y, node.position.z),
                onComplete: resolve,
            });
        });
    },

    async fade(sg: SpaceGraph, nodeId: string, to: number, duration = 500): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return;
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            gsap.to(node.data, { opacity: to, duration: duration / 1000, ease: 'power2.inOut', onComplete: resolve });
        });
    },

    async scale(sg: SpaceGraph, nodeId: string, to: number, duration = 500): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return;
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            gsap.to(node.object.scale, { x: to, y: to, z: to, duration: duration / 1000, ease: 'power2.inOut', onComplete: resolve });
        });
    },

    async rotate(sg: SpaceGraph, nodeId: string, to: { x?: number; y?: number; z?: number }, duration = 1000): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return;
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            gsap.to(node.object.rotation, {
                x: to.x ?? 0, y: to.y ?? 0, z: to.z ?? 0,
                duration: duration / 1000,
                ease: 'power2.inOut',
                onComplete: resolve,
            });
        });
    },

    async color(sg: SpaceGraph, nodeId: string, to: string | number): Promise<void> {
        const node = sg.graph.getNode(nodeId);
        if (!node) return;
        node.data.color = to;
    },

    async sequence(sg: SpaceGraph, animations: Array<{ nodeId: string; type: 'move' | 'fade' | 'scale' | 'rotate'; to: unknown; duration?: number }>): Promise<void> {
        for (const anim of animations) {
            const fn = Animate[anim.type] as (sg: SpaceGraph, id: string, to: unknown, dur?: number) => Promise<void>;
            await fn(sg, anim.nodeId, anim.to, anim.duration);
        }
    },
};

export const Camera = {
    fitView(sg: SpaceGraph, padding?: number, duration?: number): void {
        sg.fitView(padding, duration);
    },

    async flyTo(sg: SpaceGraph, position: [number, number, number], target: [number, number, number], duration = 1.5): Promise<void> {
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            const start = { x: sg.renderer.camera.position.x, y: sg.renderer.camera.position.y, z: sg.renderer.camera.position.z };
            gsap.to(start, {
                x: position[0], y: position[1], z: position[2],
                duration, ease: 'power2.inOut',
                onUpdate: () => {
                    sg.renderer.camera.position.set(start.x, start.y, start.z);
                    sg.cameraControls.update();
                },
                onComplete: resolve,
            });
        });
    },

    async focus(sg: SpaceGraph, nodeIds: string[], padding = 100): Promise<void> {
        const nodes = nodeIds.map(id => sg.graph.getNode(id)).filter(Boolean) as Node[];
        if (nodes.length) sg.fitView(padding);
    },

    async orbit(sg: SpaceGraph, angle: number, duration = 1.5): Promise<void> {
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            const startTheta = sg.cameraControls.spherical.theta;
            gsap.to({}, {
                duration, ease: 'power2.inOut',
                onUpdate: (self: any) => {
                    sg.cameraControls.spherical.theta = startTheta + self.progress() * angle;
                    sg.cameraControls.update();
                },
                onComplete: resolve,
            });
        });
    },

    async zoomTo(sg: SpaceGraph, zoom: number, duration = 1): Promise<void> {
        const { gsap } = await getGsap();
        return new Promise((resolve) => {
            const startRadius = sg.cameraControls.spherical.radius;
            gsap.to(sg.cameraControls.spherical, {
                radius: startRadius * zoom, duration, ease: 'power2.inOut',
                onUpdate: () => sg.cameraControls.update(),
                onComplete: resolve,
            });
        });
    },

    reset(sg: SpaceGraph): void {
        sg.renderer.camera.position.set(0, 500, 500);
        sg.cameraControls.target.set(0, 0, 0);
        sg.cameraControls.update();
    },
};