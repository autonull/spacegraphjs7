import { project } from './minimap';
import { search, searchBy } from './search';

export {
    DescentRegistry,
    kindDescent,
    type DescentContext,
    type DescentNode,
    type DescentPolicy,
} from './descent';

export { Trail, type TrailListener, type TrailNode, type TrailOptions } from './Trail';

export { edgePath, type EdgePathModel, type EdgePathOptions, type EdgePathStep } from './edgePath';

export { project } from './minimap';
export type {
    MinimapBounds,
    MinimapOptions,
    MinimapPoint,
    MinimapProjection,
    MinimapViewRect,
    MinimapViewport,
} from './minimap';

export { search, searchBy } from './search';
export type { SearchModel, SearchableNode, SearchScore } from './search';

/**
 * The navigation primitives. They are grouped in a namespace so a host keeps its own names for the
 * same concepts (a host already exports `search`) without renaming either side.
 */
export const Navigation = { project, search, searchBy };
