import type { SpaceGraph } from '../../SpaceGraph';
import type { InteractionRaycaster } from '../../plugins/interaction/RaycasterHelper';
import type { Finger, Fingering } from '../Fingering';

export abstract class BaseFingering implements Fingering {
    protected sg: SpaceGraph;
    protected raycaster: InteractionRaycaster;
    protected active = false;

    constructor(sg: SpaceGraph, raycaster: InteractionRaycaster) {
        this.sg = sg;
        this.raycaster = raycaster;
    }

    abstract start(finger: Finger): boolean;
    abstract update(finger: Finger): boolean;
    abstract stop(finger: Finger): void;

    defer(_finger: Finger): boolean {
        return true;
    }

    isActive(): boolean {
        return this.active;
    }

protected emit<K extends string>(event: K, data: Record<string, unknown>): void {
        this.sg.events.emit(event, data);
    }
}