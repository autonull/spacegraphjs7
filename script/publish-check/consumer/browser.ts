// The consumer's browser page: it mounts both interactive adapters from the published packages.
//
// The page reports what each adapter drew, so the driver can assert on it.
import { DEFAULT_THEME } from '@spacegraphjs/renderer';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { MODEL } from './check';

declare global {
  interface Window {
    __result?: { spacegraph: boolean; cytoscape: boolean; error?: string }
  }
}

const report = async () => {
  const result = { spacegraph: false, cytoscape: false }
  try {
    const spacegraph = new SpaceGraphRenderer()
    const spacegraphContainer = document.querySelector('#spacegraph') as HTMLElement
    await spacegraph.mount(spacegraphContainer, { theme: DEFAULT_THEME, projection: '2d' })
    spacegraph.setModel(MODEL)
    spacegraph.fit()
    result.spacegraph = Boolean(spacegraphContainer.querySelector('canvas'))

    const cytoscape = new CytoscapeRenderer()
    const cytoscapeContainer = document.querySelector('#cytoscape') as HTMLElement
    await cytoscape.mount(cytoscapeContainer, { theme: DEFAULT_THEME, projection: '2d' })
    cytoscape.setModel(MODEL)
    result.cytoscape = Boolean(cytoscapeContainer.querySelector('canvas'))
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
  }
  window.__result = result
}

report()
