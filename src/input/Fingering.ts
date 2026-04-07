// SpaceGraphJS - Exclusive Input State Machine (Fingering)
// Priority-based input acquisition system inspired by SGJ's Finger/Fingering

export interface Finger {
    pointerId: number;
    position: { x: number; y: number };
    buttons: number;
    state: 'down' | 'move' | 'up';
    target: unknown;
}

export abstract class Fingering {
    abstract start(finger: Finger): boolean;
    abstract update(finger: Finger): boolean;
    abstract stop(finger: Finger): void;
    defer(_finger: Finger): boolean {
        return true;
    }
    startMultiTouch?(finger1: Finger, finger2: Finger): boolean;
    updateMultiTouch?(finger1: Finger, finger2: Finger): boolean;
    stopMultiTouch?(): void;
}

export class FingerManager {
    private activeFingering: Fingering | null = null;
    private readonly fingers = new Map<number, Finger>();

    test(next: Fingering, finger: Finger): boolean {
        if (this.activeFingering?.defer(finger) ?? true) {
            this.activeFingering?.stop(finger);
            this.activeFingering = next;
            return next.start(finger);
        }
        return false;
    }

    update(finger: Finger): void {
        this.activeFingering?.update(finger);
    }

    end(finger: Finger): void {
        this.activeFingering?.stop(finger);
        this.activeFingering = null;
    }

    isActive(): boolean {
        return this.activeFingering !== null;
    }

    getActive(): Fingering | null {
        return this.activeFingering;
    }

    getFinger(pointerId: number): Finger | undefined {
        return this.fingers.get(pointerId);
    }

    setFinger(pointerId: number, finger: Finger): void {
        this.fingers.set(pointerId, finger);
    }

    deleteFinger(pointerId: number): void {
        this.fingers.delete(pointerId);
    }
}
