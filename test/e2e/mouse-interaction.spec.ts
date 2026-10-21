import { expect, test } from '@playwright/test'

/**
 * The mouse contract of the demo: the right button pans, the middle button frames a node, the
 * wheel zooms, and the left button belongs to the nodes.
 *
 * The demo pages are served from the `demo` root, so their path carries no `demo/` prefix.
 */

declare global {
  interface Window {
    _sg: any
  }
}

const camera = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ({
    target: window._sg.cameraControls.target.toArray(),
    zoom: window._sg.cameraControls.camera.zoom ?? 0,
  }))

/**
 * The demo frames the graph with an animation, and a card on the screen changes size while the
 * camera moves. A measurement waits for the camera to hold still.
 */
async function waitForSettledCamera(page: import('@playwright/test').Page): Promise<void> {
  const zoom = () => page.evaluate(() => window._sg.renderer.getZoom())
  let previous = await zoom()
  let stable = 0

  await expect
    .poll(
      async () => {
        const current = await zoom()
        stable = current === previous ? stable + 1 : 0
        previous = current
        return stable >= 3
      },
      { intervals: [100, 150, 200, 250, 300, 400] },
    )
    .toBe(true)
}

test.describe('The mouse contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/interaction.html')
    await page.waitForFunction(() => Boolean(window._sg))
  })

  test('the right button pans the view', async ({ page }) => {
    const before = await camera(page)
    const canvas = page.locator('canvas').first()
    const box = (await canvas.boundingBox())!

    await page.mouse.move(box.x + box.width - 40, box.y + box.height - 40)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(box.x + box.width - 140, box.y + box.height - 140, { steps: 10 })
    await page.mouse.up({ button: 'right' })

    await expect.poll(async () => (await camera(page)).target).not.toEqual(before.target)
  })

  test('the wheel zooms the view', async ({ page }) => {
    const before = await camera(page)
    const canvas = page.locator('canvas').first()
    const box = (await canvas.boundingBox())!

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -300)

    await expect.poll(async () => (await camera(page)).zoom).not.toBe(before.zoom)
  })

  test('a click on a card selects it', async ({ page }) => {
    const card = page.locator('.spacegraph-html-node').first()

    await card.click()

    await expect.poll(() => page.evaluate(() => window._sg.selection.list.length)).toBeGreaterThan(0)
  })

  test('the middle button frames the node under it', async ({ page }) => {
    const card = page.locator('.spacegraph-html-node').first()
    const before = await camera(page)

    await card.click({ button: 'middle' })

    await expect.poll(async () => (await camera(page)).target).not.toEqual(before.target)
  })

  test('a card keeps its markup when the model updates it', async ({ page }) => {
    await page.goto('/html.html')
    await page.waitForFunction(() => Boolean(window._sg))

    const before = await page.locator('#node-html-control-center .node-content').innerHTML()

    await page.evaluate(() => {
      const node = window._sg.graph.nodes.get('control-center')
      window._sg.graph.updateNode('control-center', { label: 'Renamed' })
    })

    await expect
      .poll(() => page.locator('#node-html-control-center .node-content').innerHTML())
      .toBe(before)
  })
})

test.describe('The card and the pointer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/html.html')
    await page.waitForFunction(() => Boolean(window._sg))
  })

  test('a card does not grow when the pointer hovers it', async ({ page }) => {
    await waitForSettledCamera(page)
    const card = page.locator('#node-html-control-center')
    const before = await card.boundingBox()

    await card.hover()
    await page.waitForTimeout(300)

    // The card is hovered: it draws the hover around itself, and it does not grow.
    await expect
      .poll(() => page.evaluate(() => window._sg.graph.nodes.get('control-center').controlState))
      .toBe('hovered')
    expect(await page.evaluate(() => window._sg.graph.nodes.get('control-center').object.scale.x)).toBe(1)

    const after = await card.boundingBox()
    expect(after!.width).toBeCloseTo(before!.width, 0)
    expect(after!.height).toBeCloseTo(before!.height, 0)
  })

  test('a control inside a card takes the mouse, and the card still moves by its background', async ({
    page,
  }) => {
    await waitForSettledCamera(page)
    const position = () =>
      page.evaluate(() => {
        const node = window._sg.graph.nodes.get('control-center')
        return [node.position.x, node.position.y]
      })

    const slider = page.locator('#node-html-control-center input[type="range"]')
    const sliderBox = (await slider.boundingBox())!
    const before = await position()

    // The slider takes the mouse: the card does not move.
    await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(sliderBox.x + sliderBox.width / 2 + 60, sliderBox.y + sliderBox.height / 2, {
      steps: 8,
    })
    await page.mouse.up()

    await expect.poll(position).toEqual(before)

    // The card's background still drags the card.
    const cardBox = (await page.locator('#node-html-control-center').boundingBox())!
    await page.mouse.move(cardBox.x + 6, cardBox.y + cardBox.height - 6)
    await page.mouse.down()
    await page.mouse.move(cardBox.x + 66, cardBox.y + cardBox.height + 34, { steps: 8 })
    await page.mouse.up()

    await expect.poll(position).not.toEqual(before)
  })

  test('a resize moves only the corner under the pointer', async ({ page }) => {
    await waitForSettledCamera(page)
    const card = page.locator('#node-html-control-center')
    const before = (await card.boundingBox())!
    const width = () => page.evaluate(() => window._sg.graph.nodes.get('control-center').data.width)

    await page.mouse.move(before.x + before.width - 2, before.y + before.height - 2)
    await page.mouse.down()
    await page.mouse.move(before.x + before.width + 78, before.y + before.height + 38, { steps: 10 })
    await page.mouse.up()

    // The card grew under the pointer.
    await expect.poll(width).toBeGreaterThan(500)

    const after = (await card.boundingBox())!
    // The corner opposite the handle stayed where it was.
    expect(after.x).toBeCloseTo(before.x, 0)
    expect(after.y).toBeCloseTo(before.y, 0)
  })
})

test.describe('The outline of a dragged node', () => {
  test('follows the node it belongs to', async ({ page }) => {
    await page.goto('/interaction.html')
    await page.waitForFunction(() => Boolean(window._sg))

    const at = await page.evaluate(() => {
      const node = window._sg.graph.nodes.get('n4')
      const projected = node.position.clone().project(window._sg.renderer.camera)
      const rect = window._sg.renderer.renderer.domElement.getBoundingClientRect()
      return {
        x: rect.left + ((projected.x + 1) / 2) * rect.width,
        y: rect.top + ((-projected.y + 1) / 2) * rect.height,
      }
    })

    await page.mouse.click(at.x, at.y)
    await expect.poll(() => page.evaluate(() => window._sg.selection.list.length)).toBe(1)

    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x + 120, at.y + 60, { steps: 10 })
    await page.mouse.up()

    // The outline is a box around the node: it sits where the node is.
    const centres = await page.evaluate(() => {
      const node = window._sg.graph.nodes.get('n4')
      const attribute = node.outlineObject.geometry.getAttribute('position')
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (let i = 0; i < attribute.count; i++) {
        minX = Math.min(minX, attribute.getX(i))
        maxX = Math.max(maxX, attribute.getX(i))
        minY = Math.min(minY, attribute.getY(i))
        maxY = Math.max(maxY, attribute.getY(i))
      }
      return { outline: [(minX + maxX) / 2, (minY + maxY) / 2], node: [node.position.x, node.position.y] }
    })

    expect(centres.outline[0]).toBeCloseTo(centres.node[0], 1)
    expect(centres.outline[1]).toBeCloseTo(centres.node[1] - 16.5, 1)
  })
})
