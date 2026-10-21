import type { SpaceGraph } from '../types';
import type {
  InputAction,
  InputBinding,
  InputContext,
  InputEvent,
  InputEventType,
  InputManager,
  KeyEventData,
  PointerEventData,
  TouchEventData,
  WheelEventData,
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

const BATCHED_EVENTS = new Set(['mousemove', 'touchmove', 'pointermove']);

function createAction(
  id: string,
  prefix: 'camera' | 'interaction',
  isKeyEvent = false
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

export function applyDefaultInputConfig(inputManager: InputManager, sg: SpaceGraph): void {
  const canvas = sg.renderer.renderer.domElement;
  const body = typeof window !== 'undefined' ? window.document.body : document.body;

  const canvasSource = inputManager.addSource({ id: 'canvas', element: canvas });
  const windowSource = inputManager.addSource({ id: 'window', element: body });

  // The bindings are the one path from a DOM event to an action: the input manager routes the event
  // to the fingerings first, so a gesture a fingering claims never reaches the generic interaction.
  CAMERA_EVENTS.forEach((e) => canvasSource.on(e));
  INTERACTION_EVENTS.forEach((e) => canvasSource.on(e));
  windowSource.on('keydown');
  windowSource.on('keyup');

  // The middle button belongs to the camera, not to the browser's autoscroll.
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });

  createActions().forEach((a) => inputManager.registerAction(a));
  createBindings().forEach((b) => inputManager.addBinding(b));
}
