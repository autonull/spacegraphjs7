import { Navigation } from '@spacegraphjs/shared';
import type { MinimapOptions, MinimapProjection } from '@spacegraphjs/shared';

export type {
    MinimapBounds,
    MinimapOptions,
    MinimapPoint,
    MinimapProjection,
    MinimapViewRect,
    MinimapViewport,
} from '@spacegraphjs/shared';

export const project: (options: MinimapOptions) => MinimapProjection = Navigation.project;
