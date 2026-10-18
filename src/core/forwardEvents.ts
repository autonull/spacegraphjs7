import type { EventSystem } from './events/EventSystem';
import type { Graph } from './Graph';

// Graph mutations are owned by the Graph's own emitter. Mirror them onto the
// SpaceGraph event system so host subscriptions (sg.watch, plugins, HUD) see them.
const GRAPH_EVENT_NAMES = [
  'node:added',
  'node:removed',
  'node:updated',
  'edge:added',
  'edge:removed',
  'edge:updated',
  'graph:cleared',
] as const;

export function forwardGraphEvents(graph: Graph, events: EventSystem): void {
  for (const name of GRAPH_EVENT_NAMES) {
    graph.on(name, (payload) => events.emit(name, payload));
  }
}
