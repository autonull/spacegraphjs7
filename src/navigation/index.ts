import { project } from './minimap';
import { search, searchBy } from './search';

export {
  Trail,
  type TrailListener,
  type TrailNode,
  type TrailOptions,
} from './Trail';

export type {
  MinimapBounds,
  MinimapOptions,
  MinimapPoint,
  MinimapProjection,
  MinimapViewRect,
  MinimapViewport,
} from './minimap';

export type { SearchModel, SearchableNode, SearchScore } from './search';

/**
 * The navigation primitives. They are grouped in a namespace so a host keeps its own names for the
 * same concepts (a host already exports `search`) without renaming either side.
 */
export const Navigation = { project, search, searchBy };
