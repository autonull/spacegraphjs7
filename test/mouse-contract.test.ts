import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { CameraControls } from 'spacegraphjs/core'
import { createCameraFingering, FingerManager } from 'spacegraphjs/input'
import { ShapeNode } from 'spacegraphjs/nodes'
import type { Node } from 'spacegraphjs/nodes'
import { InteractionPlugin } from '../src/plugins/InteractionPlugin'
import { InteractionRaycaster } from '../src/plugins/interaction/RaycasterHelper'
import { zoomCameraOnWheel } from '../src/input/CameraWheel'
import type { Finger, Fingering } from 'spacegraphjs/input'
import type { DefaultInputConfig } from 'spacegraphjs/types'

/**
 * The mouse contract of the graph: which button does what, and who owns a gesture.
 *
 * These are the rules a reader feels rather than reads, so they are pinned here: the right button
 * pans, the middle button orbits, the wheel zooms, and the left button belongs to the nodes.
 */

const finger = (buttons: number, x = 0, y = 0): Finger => ({
  pointerId: 1,
  position: { x, y },
  ndc: { x: 0, y: 0 },
  buttons,
  state: 'down',
  target: null,
})

class RecordingFingering implements Fingering {
  started = 0
  stopped = 0
  constructor(private readonly accepts: boolean) {}
  start(): boolean {
    this.started++
    return this.accepts
  }
  update(): boolean {
    return true
  }
  stop(): void {
    this.stopped++
  }
  defer(): boolean {
    return true
  }
}

class HoldingFingering extends RecordingFingering {
  constructor() {
    super(true)
  }
  override defer(): boolean {
    return false
  }
}

describe('The camera mouse map', () => {
  const makeControls = () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 600 })
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000)
    camera.position.set(0, 0, 500)
    const controls = new CameraControls(camera, container, { keyboard: false })
    controls.update()
    return { controls, camera }
  }

  it('pans the view with the right button', () => {
    const { controls } = makeControls()
    const pan = vi.spyOn(controls, 'pan')
    const orbit = vi.spyOn(controls, 'rotate')

    const fingering = createCameraFingering(controls)
    expect(fingering.start(finger(2, 100, 100))).toBe(true)
    fingering.update(finger(2, 140, 120))

    expect(pan).toHaveBeenCalledWith(40, 20)
    expect(orbit).not.toHaveBeenCalled()
  })

  it('orbits the view with the middle button', () => {
    const { controls } = makeControls()
    const pan = vi.spyOn(controls, 'pan')
    const orbit = vi.spyOn(controls, 'rotate')

    const fingering = createCameraFingering(controls)
    expect(fingering.start(finger(4, 100, 100))).toBe(true)
    fingering.update(finger(4, 140, 120))

    expect(orbit).toHaveBeenCalledWith(40, 20)
    expect(pan).not.toHaveBeenCalled()
  })

  it('leaves the left button to the nodes', () => {
    const { controls } = makeControls()
    const fingering = createCameraFingering(controls)
    expect(fingering.start(finger(1, 100, 100))).toBe(false)
  })

  it('does not claim the gesture, so the nodes still see the press', () => {
    const { controls } = makeControls()
    const fingering: Fingering = createCameraFingering(controls)
    expect(fingering.claimsGesture ?? true).toBe(false)
  })
})

describe('The pick under the pointer', () => {
  const makeGraph = (nodes: Node[]) => {
    const canvas = document.createElement('canvas')
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }) as DOMRect
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000)
    camera.position.set(0, 0, 500)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld(true)

    return {
      renderer: { camera, renderer: { domElement: canvas } },
      graph: { nodes: new Map(nodes.map((node) => [node.id, node])) },
    }
  }

  const shape = (id: string, data: Record<string, unknown> = {}) =>
    new ShapeNode(undefined, {
      id,
      type: 'ShapeNode',
      position: [0, 0, 0],
      data: { size: 40, ...data },
    } as never)

  it('finds the node under the pointer', () => {
    const node = shape('n1')
    const raycaster = new InteractionRaycaster(makeGraph([node]) as never)
    raycaster.updateMousePosition(400, 300)

    expect(raycaster.raycastNode()?.node.id).toBe('n1')
  })

  it('finds nothing when the pointer is off the node', () => {
    const node = shape('n1')
    const raycaster = new InteractionRaycaster(makeGraph([node]) as never)
    raycaster.updateMousePosition(10, 10)

    expect(raycaster.raycastNode()).toBeNull()
  })

  it('leaves a backdrop alone: a node that is not interactive is not picked', () => {
    const band = shape('band', { interactive: false })
    const raycaster = new InteractionRaycaster(makeGraph([band]) as never)
    raycaster.updateMousePosition(400, 300)

    expect(raycaster.raycastNode()).toBeNull()
  })
})

describe('The left button over the void', () => {
  const makeInteraction = (nodes: Node[] = [], input?: DefaultInputConfig) => {
    const canvas = document.createElement('canvas')
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }) as DOMRect
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000)
    camera.position.set(0, 0, 500)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld(true)

    const handlers = new Map<string, (e: any) => void>()
    const pan = vi.fn()
    const emit = vi.fn()
    const sg = {
      options: { input },
      events: {
        on: (name: string, handler: (e: any) => void) => handlers.set(name, handler),
        emit,
      },
      renderer: { camera, renderer: { domElement: canvas } },
      graph: { nodes: new Map(nodes.map((node) => [node.id, node])), edges: new Map() },
      input: {
        getState: () => ({ keysPressed: new Set<string>() }),
        registerFingering: vi.fn(),
      },
      cameraControls: { pan, rotate: vi.fn() },
      selection: { select: vi.fn(), clear: vi.fn() },
    }

    const plugin = new InteractionPlugin()
    plugin.init(sg as never, sg.graph as never, sg.events as never)

    const fire = (name: string, event: Record<string, unknown>) => handlers.get(name)?.(event)
    const press = (event: Record<string, unknown>) => {
      fire('input:interaction:pointerdown', { button: 0, shiftKey: false, ...event })
    }
    const move = (event: Record<string, unknown>) =>
      fire('input:interaction:pointermove', { button: 0, shiftKey: false, ...event })
    const release = (event: Record<string, unknown>) =>
      fire('input:interaction:pointerup', { button: 0, shiftKey: false, ...event })

    return { plugin, press, move, release, pan, emit }
  }

  const shape = (id: string, data: Record<string, unknown> = {}) =>
    new ShapeNode(undefined, {
      id,
      type: 'ShapeNode',
      position: [0, 0, 0],
      data: { size: 40, ...data },
    } as never)

  it('pans the view when the left button drags over the background', () => {
    const { press, move, pan } = makeInteraction()

    press({ x: 700, y: 500 })
    move({ x: 640, y: 460 })

    expect(pan).toHaveBeenCalledWith(-60, -40)
  })

  it('keeps the click: a press and a release on the background is still a background click', () => {
    const { press, release, emit } = makeInteraction()

    press({ x: 700, y: 500 })
    release({ x: 700, y: 500 })

    expect(emit).toHaveBeenCalledWith('background:click', expect.anything())
  })

  it('does not pan when the drag started on a node', () => {
    const { press, move, pan } = makeInteraction([shape('n1')])

    press({ x: 400, y: 300 })
    move({ x: 340, y: 260 })

    expect(pan).not.toHaveBeenCalled()
  })

  it('does not pan when the shift key asks for a box selection', () => {
    const { press, move, pan } = makeInteraction()

    press({ x: 700, y: 500, shiftKey: true })
    move({ x: 640, y: 460, shiftKey: true })

    expect(pan).not.toHaveBeenCalled()
  })

  it('lets a host keep the old behaviour, where the left button only ever means the nodes', () => {
    const { press, move, pan } = makeInteraction([], { interaction: { enableBackgroundPan: false } })

    press({ x: 700, y: 500 })
    move({ x: 640, y: 460 })

    expect(pan).not.toHaveBeenCalled()
  })
})

describe('The wheel', () => {
  const makeControls = () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 600 })
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000)
    camera.position.set(0, 0, 500)
    const controls = new CameraControls(camera, container, { keyboard: false })
    controls.update()
    return { controls, camera }
  }

  const canvas = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect,
  }

  const wheel = (deltaY: number) => ({
    x: 400,
    y: 300,
    deltaX: 0,
    deltaY,
    deltaZ: 0,
    deltaMode: 0,
  })

  it('zooms the camera about the pointer', () => {
    const { controls } = makeControls()
    const zoomAt = vi.spyOn(controls, 'zoomAt')

    zoomCameraOnWheel(controls, canvas, wheel(-100))

    expect(zoomAt).toHaveBeenCalledOnce()
    expect(zoomAt.mock.calls[0][0]).toEqual({ x: 0, y: 0 })
  })

  it('scrolls up to zoom in and down to zoom out', () => {
    const { controls } = makeControls()
    const zoomAt = vi.spyOn(controls, 'zoomAt')

    zoomCameraOnWheel(controls, canvas, wheel(-100))
    zoomCameraOnWheel(controls, canvas, wheel(100))

    const [inFactor, outFactor] = zoomAt.mock.calls.map((call) => call[1])
    expect(inFactor).toBeLessThan(1)
    expect(outFactor).toBeGreaterThan(1)
  })

  it('reads a wheel that counts lines as the pixels they are', () => {
    const { controls } = makeControls()
    const zoomAt = vi.spyOn(controls, 'zoomAt')

    zoomCameraOnWheel(controls, canvas, { ...wheel(-3), deltaMode: 1 })
    zoomCameraOnWheel(controls, canvas, wheel(-48))

    expect(zoomAt.mock.calls[0][1]).toBeCloseTo(zoomAt.mock.calls[1][1], 6)
  })
})

describe('Gesture ownership', () => {
  it('gives the gesture to the fingering that starts it', () => {
    const manager = new FingerManager()
    const refusing = new RecordingFingering(false)
    const accepting = new RecordingFingering(true)

    expect(manager.test(refusing, finger(1))).toBe(false)
    expect(manager.test(accepting, finger(1))).toBe(true)
    expect(manager.getActive()).toBe(accepting)
  })

  it('leaves the gesture with its owner when a fingering refuses it', () => {
    const manager = new FingerManager()
    const owner = new HoldingFingering()
    const other = new RecordingFingering(true)

    expect(manager.test(owner, finger(1))).toBe(true)
    expect(manager.test(other, finger(1))).toBe(false)
    expect(manager.getActive()).toBe(owner)
    expect(other.started).toBe(0)
  })

  it('stops the previous owner when the gesture changes hands', () => {
    const manager = new FingerManager()
    const first = new RecordingFingering(true)
    const second = new RecordingFingering(true)

    manager.test(first, finger(1))
    manager.test(second, finger(1))

    expect(first.stopped).toBe(1)
    expect(manager.getActive()).toBe(second)
  })

  it('keeps the gesture with its owner when the next fingering does not start', () => {
    const manager = new FingerManager()
    const owner = new RecordingFingering(true)
    const refusing = new RecordingFingering(false)

    manager.test(owner, finger(1))
    expect(manager.test(refusing, finger(1))).toBe(false)
    expect(manager.getActive()).toBe(owner)
    expect(owner.stopped).toBe(0)
  })
})
