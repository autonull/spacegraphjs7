import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { AUTO_FOCUS_DURATION, NodeResizer, nodeScreenSize } from 'spacegraphjs/utils'
import { HtmlNode, Node, ShapeNode } from 'spacegraphjs/nodes'

/**
 * The parts of the interaction that break quietly: a resize that moves the wrong corner, a card
 * that grows under the pointer, a frame that measures the page.
 */

const makeGraph = () => {
  const canvas = {
    clientWidth: 800,
    clientHeight: 600,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  }
  const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 10000)
  camera.position.set(0, 0, 500)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  return { renderer: { renderer: { domElement: canvas }, camera } }
}

const makeCard = (width: number, height: number) =>
  new HtmlNode(undefined, {
    id: 'u',
    type: 'HtmlNode',
    position: [0, 0, 0],
    data: { width, height },
  } as never)

describe('The resize', () => {
  it('grows the node by the pointer travel, once', () => {
    const sg = makeGraph()
    const node = makeCard(400, 200)
    const resizer = new NodeResizer()

    resizer.start(sg as never, node as Node, 0, 0)
    // How many world units one screen pixel covers on this node.
    const perPixel = 400 / nodeScreenSize(sg as never, node as Node).width
    resizer.update(80, 40)

    expect((node.data as Record<string, unknown>).width).toBeCloseTo(400 + 80 * perPixel, 6)
    expect((node.data as Record<string, unknown>).height).toBeCloseTo(200 + 40 * perPixel, 6)
  })

  it('leaves the opposite corner of the handle where it was', () => {
    const sg = makeGraph()
    const node = makeCard(400, 200)
    const resizer = new NodeResizer()
    const leftBefore = node.position.x - ((node.data as Record<string, unknown>).width as number) / 2
    const topBefore = node.position.y + ((node.data as Record<string, unknown>).height as number) / 2

    resizer.start(sg as never, node as Node, 0, 0)
    resizer.update(80, 40)

    const width = (node.data as Record<string, unknown>).width as number
    const height = (node.data as Record<string, unknown>).height as number
    expect(node.position.x - width / 2).toBeCloseTo(leftBefore, 6)
    expect(node.position.y + height / 2).toBeCloseTo(topBefore, 6)
  })

  it('leaves the markup of the card alone', () => {
    const sg = makeGraph()
    const markup = '<div style="color: rgb(255, 0, 0)">Styled</div>'
    const node = new HtmlNode(undefined, {
      id: 'u',
      type: 'HtmlNode',
      data: { width: 400, height: 200, html: markup },
    } as never)
    const resizer = new NodeResizer()

    resizer.start(sg as never, node as Node, 0, 0)
    resizer.update(40, 20)

    expect(node.domElement.querySelector('.node-content')?.innerHTML).toBe(markup)
  })
})

describe('The card that does not grow', () => {
  it('draws its hover as an outline, so it does not scale', () => {
    const node = new HtmlNode(undefined, { id: 'u', type: 'HtmlNode' } as never)
    expect(node.scalesOnHover).toBe(false)
  })

  it('scales a mesh node on hover, because a mesh has no outline of its own', () => {
    const node = new ShapeNode(undefined, {
      id: 'n1',
      type: 'ShapeNode',
      position: [0, 0, 0],
      data: { size: 40 },
    } as never)
    expect(node.scalesOnHover).toBe(true)
  })
})

describe('The control inside a card', () => {
  it('takes the mouse, so the card is not dragged out from under the reader', () => {
    const node = new HtmlNode(undefined, {
      id: 'u',
      type: 'HtmlNode',
      data: { width: 400, height: 200, html: '<input type="range" />' },
    } as never)

    const control = node.domElement.querySelector('input')
    expect(control?.getAttribute('data-sg-interactive')).toBe('true')
  })
})

describe('The auto-zoom', () => {
  it('is quick enough to feel like a response', () => {
    expect(AUTO_FOCUS_DURATION).toBeLessThanOrEqual(0.5)
  })
})
