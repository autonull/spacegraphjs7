import type { GraphRenderer, RenderModel } from '@spacegraphjs/renderer';
import { diffRenderModels } from './diff';

/** Paints successive render models, sending incremental patches to renderers that accept them. */
export function createPatchPainter(renderer: Pick<GraphRenderer, 'setModel' | 'applyPatch'>) {
    let previous: RenderModel | undefined;
    return {
        paint(model: RenderModel): void {
            if (previous && renderer.applyPatch) {
                renderer.applyPatch(diffRenderModels(previous, model));
            } else {
                renderer.setModel(model);
            }
            previous = model;
        },
    };
}
