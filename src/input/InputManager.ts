import type { SpaceGraph } from '../SpaceGraph';
import { EventSystem } from '../core/events/EventSystem';
import * as THREE from 'three';
import { FingerManager, type Fingering, type Finger } from './Fingering';

export type InputEventType = 'keydown' | 'keyup' | 'mousedown' | 'mouseup' | 'mousemove' | 'mouseleave' | 'wheel'
    | 'pointerdown' | 'pointerup' | 'pointermove' | 'dblclick' | 'contextmenu' | 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel';

export interface InputEvent<T = unknown> { type: InputEventType; source: string; timestamp: number; data: T; originalEvent?: unknown; consumed: boolean; }
export interface KeyEventData { key: string; code: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean; repeat: boolean; }
export interface PointerEventData { x: number; y: number; button?: number; buttons?: number; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; target: HTMLElement | null; }
export interface WheelEventData { x: number; y: number; deltaX: number; deltaY: number; deltaZ: number; }
export interface TouchEventData { touches: Array<{ identifier: number; x: number; y: number }>; changedTouches: Array<{ identifier: number; x: number; y: number }>; }

export type InputActionHandler = (event: InputEvent, context: InputContext) => void;
export interface InputAction { id: string; label: string; handler: InputActionHandler; enabled?: () => boolean; }
export interface InputBinding { id: string; action: string; sources: string[]; eventType: InputEventType; predicate?: (event: InputEvent) => boolean; priority?: number; }

export interface InputContext {
    graph: SpaceGraph; events: EventSystem;
    getState: () => InputState; setActiveInput: (source: string) => void;
    disableInput: (source: string) => void; enableInput: (source: string) => void; isInputEnabled: (source: string) => boolean;
    updateState: (partial: Partial<InputState>) => void; emit: (eventType: string, data: unknown) => void; emitBatched: (eventType: string, data: unknown) => void;
}

export interface InputState { activeInput: string | null; disabledInputs: Set<string>; pointerPosition: { x: number; y: number }; pointerDown: boolean; keysPressed: Set<string>; touchCount: number; }
export interface InputSourceConfig { id: string; element: HTMLElement; enabled?: boolean; capture?: boolean; }
export interface InputManagerOptions { graph: SpaceGraph; events: EventSystem; sources?: InputSourceConfig[]; }

export class InputManager {
    private graph: SpaceGraph;
    private events: EventSystem;
    private state: InputState;
    private sources: Map<string, InputSource> = new Map();
    private actions: Map<string, InputAction> = new Map();
    private bindings: InputBinding[] = [];
    private enabled = true;
    private fingerManager: FingerManager;
    private fingerings: Array<{ fingering: Fingering; priority: number }> = [];

    constructor(options: InputManagerOptions) {
        this.graph = options.graph;
        this.events = options.events;
        this.state = { activeInput: null, disabledInputs: new Set(), pointerPosition: { x: 0, y: 0 }, pointerDown: false, keysPressed: new Set(), touchCount: 0 };
        this.fingerManager = new FingerManager();
        if (options.sources) for (const config of options.sources) this.addSource(config);
    }

    registerFingering(fingering: Fingering, priority: number): void { this.fingerings.push({ fingering, priority }); this.fingerings.sort((a, b) => b.priority - a.priority); }
    getFingerManager(): FingerManager { return this.fingerManager; }

    get context(): InputContext {
        return {
            graph: this.graph, events: this.events,
            getState: () => this.state,
            setActiveInput: (source: string) => { this.state.activeInput = source; },
            disableInput: (source: string) => { this.state.disabledInputs.add(source); },
            enableInput: (source: string) => { this.state.disabledInputs.delete(source); },
            isInputEnabled: (source: string) => !this.state.disabledInputs.has(source),
            updateState: (partial: Partial<InputState>) => { Object.assign(this.state, partial); },
            emit: (eventType: string, data: unknown) => { this.events.emit(eventType, data); },
            emitBatched: (eventType: string, data: unknown) => { this.events.emitBatched(eventType, data); },
        };
    }

    addSource(config: InputSourceConfig): InputSource { const source = new InputSource(config, this); this.sources.set(config.id, source); return source; }
    removeSource(id: string): void { const source = this.sources.get(id); if (source) { source.dispose(); this.sources.delete(id); } }
    getSource(id: string): InputSource | undefined { return this.sources.get(id); }
    registerAction(action: InputAction): void { this.actions.set(action.id, action); }
    unregisterAction(id: string): void { this.actions.delete(id); }
    getAction(id: string): InputAction | undefined { return this.actions.get(id); }
    addBinding(binding: InputBinding): void { this.bindings.push(binding); this.bindings.sort((a, b) => (b.priority || 0) - (a.priority || 0)); }
    removeBinding(id: string): void { this.bindings = this.bindings.filter((b) => b.id !== id); }
    clearBindings(): void { this.bindings = []; }

    handleEvent(event: InputEvent): void {
        if (!this.enabled) return;
        if (this.state.disabledInputs.has(event.source)) return;
        if (this.state.activeInput && this.state.activeInput !== event.source) return;

        if (event.type === 'pointerdown' || event.type === 'pointermove' || event.type === 'pointerup') this.routeFingeringEvent(event);

        for (const binding of this.bindings) {
            if (event.consumed) break;
            if (binding.sources.includes(event.source) && binding.eventType === event.type) {
                if (binding.predicate && !binding.predicate(event)) continue;
                const action = this.actions.get(binding.action);
                if (action && (!action.enabled || action.enabled())) action.handler(event, this.context);
            }
        }
    }

    private computeWorldRay(ndc: { x: number; y: number }): THREE.Ray {
        const camera = this.graph.renderer.camera;
        const ray = new THREE.Ray();
        ray.origin.setFromMatrixPosition(camera.matrixWorld);
        ray.direction.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(ray.origin).normalize();
        return ray;
    }

    private routeFingeringEvent(event: InputEvent): void {
        const data = event.data as PointerEventData;
        const target = data.target;
        const ndc = target instanceof Element ? (() => { const rect = target.getBoundingClientRect(); return { x: ((data.x - rect.left) / rect.width) * 2 - 1, y: -((data.y - rect.top) / rect.height) * 2 + 1 }; })() : { x: (data.x / window.innerWidth) * 2 - 1, y: -(data.y / window.innerHeight) * 2 + 1 };

        const finger: Finger = {
            pointerId: (event.originalEvent as PointerEvent)?.pointerId ?? 0, position: { x: data.x, y: data.y }, ndc, buttons: data.buttons ?? 0,
            state: event.type === 'pointerdown' ? 'down' : event.type === 'pointerup' ? 'up' : 'move', target: data.target, worldRay: this.computeWorldRay(ndc),
        };

        switch (event.type) {
            case 'pointerdown':
                this.fingerManager.setFinger(finger.pointerId, finger);
                for (const { fingering } of this.fingerings) { if (this.fingerManager.test(fingering, finger)) { event.consumed = true; return; } }
                break;
            case 'pointermove': {
                const existing = this.fingerManager.getFinger(finger.pointerId);
                if (existing) { Object.assign(existing, { position: finger.position, ndc: finger.ndc, buttons: finger.buttons, worldRay: finger.worldRay }); this.fingerManager.update(existing); }
                break;
            }
            case 'pointerup': {
                const existing = this.fingerManager.getFinger(finger.pointerId);
                if (existing) { this.fingerManager.end(existing); this.fingerManager.deleteFinger(finger.pointerId); }
                break;
            }
        }
    }

    emit(eventType: string, data: unknown): void { this.events.emit(eventType, data); }
    emitBatched(eventType: string, data: unknown): void { this.events.emitBatched(eventType, data); }
    setEnabled(enabled: boolean): void { this.enabled = enabled; }
    isEnabled(): boolean { return this.enabled; }
    updateState(partial: Partial<InputState>): void { Object.assign(this.state, partial); }
    getState(): Readonly<InputState> { return this.state; }
    dispose(): void { for (const source of this.sources.values()) source.dispose(); this.sources.clear(); this.actions.clear(); this.bindings = []; }
}

export class InputSource {
    private id: string; private element: HTMLElement; private manager: InputManager; private enabled = true;
    private boundHandlers: Array<{ type: string; original: (e: unknown) => void; handler: (e: unknown) => void; }> = [];

    constructor(config: InputSourceConfig, manager: InputManager) { this.id = config.id; this.element = config.element; this.manager = manager; this.enabled = config.enabled !== false; }
    getId(): string { return this.id; }
    setEnabled(enabled: boolean): void { this.enabled = enabled; }
    isEnabled(): boolean { return this.enabled; }

    on<T extends InputEventType>(type: T, handler: (event: InputEvent) => void): void {
        const originalHandler = handler;
        const wrappedHandler = (e: unknown) => { if (!this.enabled) return; const event = this.normalizeEvent(type, e); if (event) { handler(event); this.manager.handleEvent(event); } };
        this.boundHandlers.push({ type, original: originalHandler as (e: unknown) => void, handler: wrappedHandler as (e: unknown) => void });
        this.element.addEventListener(type, wrappedHandler, { passive: false });
    }

    off(type: string, handler?: (e: unknown) => void): void {
        if (handler) { const bound = this.boundHandlers.find((h) => h.type === type && h.original === handler); if (bound) { this.element.removeEventListener(type, bound.handler); this.boundHandlers = this.boundHandlers.filter((h) => h !== bound); } }
        else { const toRemove = this.boundHandlers.filter((h) => h.type === type); for (const h of toRemove) this.element.removeEventListener(type, h.handler); this.boundHandlers = this.boundHandlers.filter((h) => h.type !== type); }
    }

    private normalizeEvent(type: InputEventType, originalEvent: unknown): InputEvent | null {
        const timestamp = Date.now();
        const base = { type, source: this.id, timestamp, originalEvent, consumed: false };
        const builders: Record<InputEventType, () => InputEvent> = {
            keydown: () => ({ ...base, data: this.normalizeKeyEvent(originalEvent as KeyboardEvent) }),
            keyup: () => ({ ...base, data: this.normalizeKeyEvent(originalEvent as KeyboardEvent) }),
            mousedown: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            mouseup: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            mousemove: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            mouseleave: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            pointerdown: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            pointerup: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            pointermove: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            wheel: () => ({ ...base, data: this.normalizeWheelEvent(originalEvent as WheelEvent) }),
            touchstart: () => ({ ...base, data: this.normalizeTouchEvent(originalEvent as TouchEvent) }),
            touchmove: () => ({ ...base, data: this.normalizeTouchEvent(originalEvent as TouchEvent) }),
            touchend: () => ({ ...base, data: this.normalizeTouchEvent(originalEvent as TouchEvent) }),
            touchcancel: () => ({ ...base, data: this.normalizeTouchEvent(originalEvent as TouchEvent) }),
            dblclick: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
            contextmenu: () => ({ ...base, data: this.normalizePointerEvent(originalEvent as MouseEvent) }),
        };
        return builders[type]?.() ?? null;
    }

    private normalizeKeyEvent(e: KeyboardEvent): KeyEventData { return { key: e.key, code: e.code, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, repeat: e.repeat }; }
    private normalizePointerEvent(e: MouseEvent): PointerEventData { return { x: e.clientX, y: e.clientY, button: e.button, buttons: e.buttons, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, target: e.target as HTMLElement | null }; }
    private normalizeWheelEvent(e: WheelEvent): WheelEventData { return { x: e.clientX, y: e.clientY, deltaX: e.deltaX, deltaY: e.deltaY, deltaZ: e.deltaZ }; }
    private normalizeTouchEvent(e: TouchEvent): TouchEventData { const map = (t: Touch) => ({ identifier: t.identifier, x: t.clientX, y: t.clientY }); return { touches: Array.from(e.touches).map(map), changedTouches: Array.from(e.changedTouches).map(map) }; }

    dispose(): void { for (const { type, handler } of this.boundHandlers) { this.element.removeEventListener(type, handler); } this.boundHandlers = []; }
}
