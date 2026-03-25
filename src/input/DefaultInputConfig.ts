import type { SpaceGraph } from '../SpaceGraph';
import type {
    InputManager,
    InputEvent,
    InputContext,
    InputAction,
    InputBinding,
    InputEventType,
} from './InputManager';
import type {
    KeyEventData,
    PointerEventData,
    WheelEventData,
    TouchEventData,
} from './InputManager';

export interface CameraInputConfig {
    rotationSpeed?: number;
    panSpeed?: number;
    zoomSpeed?: number;
    damping?: number;
    minRadius?: number;
    maxRadius?: number;
}

export interface InteractionInputConfig {
    clickThreshold?: number;
}

export interface HistoryInputConfig {
    enabled?: boolean;
}

export interface DefaultInputConfig {
    camera?: CameraInputConfig;
    interaction?: InteractionInputConfig;
    history?: HistoryInputConfig;
}

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

const BATCHED_EVENTS = new Set(['mousemove', 'touchmove', 'pointermove']);

function createAction(
    id: string,
    prefix: 'camera' | 'interaction',
    isKeyEvent = false,
): InputAction {
    return {
        id,
        label: `${prefix} ${id.split('.')[1]}`,
        handler: (e: InputEvent, ctx: InputContext) => {
            const eventName = `input:${prefix}:${id.split('.')[1]}`;
            const data = isKeyEvent
                ? { ...(e.data as KeyEventData), originalEvent: e.originalEvent }
                : {
                      ...(e.data as PointerEventData | WheelEventData | TouchEventData),
                      originalEvent: e.originalEvent,
                  };

            if (BATCHED_EVENTS.has(id.split('.')[1])) {
                ctx.emitBatched(eventName, data);
            } else {
                ctx.emit(eventName, data);
            }
        },
    };
}

function createActions(): InputAction[] {
    return [
        ...CAMERA_EVENTS.map((e) => createAction(`camera.${e}`, 'camera')),
        ...INTERACTION_EVENTS.map((e) => createAction(`interaction.${e}`, 'interaction')),
        createAction('interaction.keydown', 'interaction', true),
        createAction('interaction.keyup', 'interaction', true),
    ];
}

function createBindings(): InputBinding[] {
    return [
        ...CAMERA_EVENTS.map((e) => ({
            id: `camera-${e}`,
            action: `camera.${e}`,
            sources: ['canvas'],
            eventType: e,
            priority: 100,
        })),
        ...INTERACTION_EVENTS.map((e) => ({
            id: `interaction-${e}`,
            action: `interaction.${e}`,
            sources: ['canvas'],
            eventType: e,
            priority: 50,
        })),
        {
            id: 'interaction-keydown',
            action: 'interaction.keydown',
            sources: ['window'],
            eventType: 'keydown',
            priority: 10,
        },
        {
            id: 'interaction-keyup',
            action: 'interaction.keyup',
            sources: ['window'],
            eventType: 'keyup',
            priority: 10,
        },
    ];
}

export function applyDefaultInputConfig(
    inputManager: InputManager,
    sg: SpaceGraph,
    _config: DefaultInputConfig = {},
): void {
    const canvas = sg.renderer.renderer.domElement;
    const body = typeof window !== 'undefined' ? window.document.body : document.body;

    const canvasSource = inputManager.addSource({ id: 'canvas', element: canvas });
    const windowSource = inputManager.addSource({ id: 'window', element: body });

    const forward = (action: string) => (e: InputEvent) =>
        inputManager.getAction(action)?.handler(e, inputManager.context);

    CAMERA_EVENTS.forEach((e) => canvasSource.on(e, forward(`camera.${e}`)));
    INTERACTION_EVENTS.forEach((e) => canvasSource.on(e, forward(`interaction.${e}`)));
    windowSource.on('keydown', forward('interaction.keydown'));
    windowSource.on('keyup', forward('interaction.keyup'));

    createActions().forEach((a) => inputManager.registerAction(a));
    createBindings().forEach((b) => inputManager.addBinding(b));
}
