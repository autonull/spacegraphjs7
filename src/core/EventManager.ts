import mitt, { Emitter, EventType } from 'mitt';
import type { SpaceGraph } from '../SpaceGraph';

export type SpaceGraphEvents = {
  'node:added': { node: any };
  'node:removed': { id: string };
  'edge:added': { edge: any };
  'edge:removed': { id: string };
  'interaction:dragstart': { node: any };
  'interaction:dragend': { node: any };
  'camera:move': { position: any, target: any };
  'node:click': { node: any, event: any };
  'graph:click': { event: any };
  [key: string]: any;
};

export class EventManager {
  private sg: SpaceGraph;
  private emitter: Emitter<SpaceGraphEvents>;

  constructor(sg: SpaceGraph) {
    this.sg = sg;
    this.emitter = mitt<SpaceGraphEvents>();
  }

  on<Key extends keyof SpaceGraphEvents>(type: Key, handler: (event: SpaceGraphEvents[Key]) => void): void {
    this.emitter.on(type, handler);
  }

  off<Key extends keyof SpaceGraphEvents>(type: Key, handler?: (event: SpaceGraphEvents[Key]) => void): void {
    this.emitter.off(type, handler);
  }

  emit<Key extends keyof SpaceGraphEvents>(type: Key, event: SpaceGraphEvents[Key]): void {
    this.emitter.emit(type, event);
  }

  clear(): void {
    this.emitter.all.clear();
  }
}
