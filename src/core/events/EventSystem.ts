// events/EventSystem.ts - Event types re-export for backwards compatibility
import { type Disposable, EventEmitter } from '../EventEmitter';
export type { SpaceGraphEvents } from '../../types';

export type { Disposable };

// Re-export EventEmitter as EventSystem for backwards compatibility
// EventSystem is simply EventEmitter with typed events
export { EventEmitter, EventEmitter as EventSystem };
