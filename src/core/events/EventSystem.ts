// events/EventSystem.ts - Event types re-export for backwards compatibility
import { EventEmitter, type Disposable } from '../EventEmitter';

export type { Disposable };

// Re-export EventEmitter as EventSystem for backwards compatibility
// EventSystem is simply EventEmitter with typed events
export { EventEmitter as EventSystem };
