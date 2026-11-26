import type { SpaceGraph } from '../types';
import type {
    InputAction,
    InputBinding,
    InputContext,
    InputEvent,
    InputEventType,
    InputManager,
} from './InputManager';

const CAMERA_EVENTS: InputEventType[] = [
    'mousedown',
    'mousemove',
    'mouseup',
    'mouseleave',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
];
const INTERACTION_EVENTS: InputEventType[] = [
    'pointerdown',
    'pointermove',
    'pointerup',
    'dblclick',
    'contextmenu',
];
const BATCHED_EVENTS = new Set<InputEventType>(['mousemove', 'touchmove', 'pointermove']);

function createAction(event: InputEventType, prefix: 'camera' | 'interaction'): InputAction {
    const eventName = `input:${prefix}:${event}`;
    const isBatched = BATCHED_EVENTS.has(event);
    return {
        id: `${prefix}.${event}`,
        label: `${prefix} ${event}`,
        handler: (e: InputEvent, ctx: InputContext) => {
            const data = { ...(e.data as any), originalEvent: e.originalEvent };
            if (isBatched) {
                ctx.emitBatched(eventName, data);
                return;
            }
            ctx.emit(eventName, data);
        },
    };
}

const GROUPS = [
    { prefix: 'camera', events: CAMERA_EVENTS, source: 'canvas', priority: 100 },
    { prefix: 'interaction', events: INTERACTION_EVENTS, source: 'canvas', priority: 50 },
    {
        prefix: 'interaction',
        events: ['keydown', 'keyup'] as const,
        source: 'window',
        priority: 10,
    },
] as const;

const createActions = (): InputAction[] =>
    GROUPS.flatMap(({ prefix, events }) => events.map((event) => createAction(event, prefix)));

const createBindings = (): InputBinding[] =>
    GROUPS.flatMap(({ prefix, events, source, priority }) =>
        events.map((event) => ({
            id: `${prefix}-${event}`,
            action: `${prefix}.${event}`,
            sources: [source],
            eventType: event,
            priority,
        })),
    );

export function applyDefaultInputConfig(inputManager: InputManager, sg: SpaceGraph): void {
    const canvas = sg.renderer.renderer.domElement;
    const body = typeof window !== 'undefined' ? window.document.body : document.body;

    const canvasSource = inputManager.addSource({ id: 'canvas', element: canvas });
    const windowSource = inputManager.addSource({ id: 'window', element: body });

    [...CAMERA_EVENTS, ...INTERACTION_EVENTS].forEach((e) => canvasSource.on(e));
    (['keydown', 'keyup'] as const).forEach((e) => windowSource.on(e));

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1) e.preventDefault();
    });

    createActions().forEach((a) => inputManager.registerAction(a));
    createBindings().forEach((b) => inputManager.addBinding(b));
}
