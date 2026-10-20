import type { RenderModel, RenderNode } from '@spacegraphjs/renderer';
import type { ModelAdapter } from './ModelAdapter';
import type { AdapterEdge, AdapterModel, AdapterNode, AdapterPosition, BuildOptions } from './types';

/** One conformance case: a name and a check that throws when the adapter breaks the contract. */
export interface ConformanceCase {
  name: string;
  check: () => void;
}

/**
 * The fixture a host writes to describe its own vocabulary to the suite: which node plays the card,
 * which one is chrome, which cluster is collapsed, and what the focus neighbourhood is.
 */
export interface ConformanceFixture<
  Node extends AdapterNode = AdapterNode,
  Edge extends AdapterEdge = AdapterEdge,
  Level extends string = string,
  Domain extends AdapterModel<Node, Edge> = AdapterModel<Node, Edge>,
> {
  /** The domain model the adapter is exercised with. */
  model: Domain;
  /** The level the model is drawn at. */
  level: Level;
  /** The position of every node. */
  positions: ReadonlyMap<string, AdapterPosition>;
  /** The nodes the adapter must draw at this level. */
  visible: readonly string[];
  /** A node the adapter draws as a DOM activity card. */
  card: string;
  /** A node the adapter draws as chrome rather than activity. */
  structural: string;
  /** A collapsed cluster the adapter draws as a counted chip. */
  chip?: string;
  /** The ids of the bands the adapter draws behind the content. */
  bands?: readonly string[];
  /** The focused node; the neighbourhood around it stays lit. */
  focus?: string;
  /** The nodes inside the focus neighbourhood. */
  lit?: readonly string[];
  /** The nodes outside the focus neighbourhood. */
  dimmed?: readonly string[];
  /** The build options the cases run with. */
  options?: Partial<BuildOptions<Node, Level>>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function nodeOf(model: RenderModel, id: string): RenderNode {
  const node = model.nodes.find((candidate) => candidate.id === id);

  assert(node, `the adapter did not draw the node "${id}"`);

  return node;
}

/**
 * The conformance suite every adapter must pass. It checks the pipeline's observable contract —
 * one node per visible id, positions honoured, the card budget honoured, the focus neighbourhood
 * honoured, and the chrome (bands, lane gutter, captions) in front of the content — without
 * knowing the host's vocabulary.
 */
export function adapterConformance<
  Node extends AdapterNode = AdapterNode,
  Edge extends AdapterEdge = AdapterEdge,
  Level extends string = string,
  Domain extends AdapterModel<Node, Edge> = AdapterModel<Node, Edge>,
>(adapter: ModelAdapter<Node, Edge, Level, Domain>, fixture: ConformanceFixture<Node, Edge, Level, Domain>): ConformanceCase[] {
  const options: BuildOptions<Node, Level> = {
    level: fixture.level,
    positions: fixture.positions,
    ...fixture.options,
  };

  const build = (overrides: Partial<BuildOptions<Node, Level>> = {}) =>
    adapter.build(fixture.model, { ...options, ...overrides });

  const cases: ConformanceCase[] = [
    {
      name: 'draws every visible node exactly once, at its position',
      check: () => {
        const model = build()
        const ids = model.nodes.map((node) => node.id)

        for (const id of fixture.visible) {
          assert(ids.includes(id), `the node "${id}" is missing from the render model`)
        }

        assert(new Set(ids).size === ids.length, 'the render model draws a node twice')

        for (const id of fixture.visible) {
          const position = fixture.positions.get(id)

          if (!position) continue

          const node = nodeOf(model, id)

          assert(
            node.position[0] === position.x && node.position[1] === position.y && node.position[2] === position.z,
            `the node "${id}" is not at its layout position`,
          )
        }
      },
    },
    {
      name: 'draws an activity node as DOM markup',
      check: () => {
        const node = nodeOf(build(), fixture.card)

        assert(node.shape === 'card', `the activity node "${fixture.card}" is not a card`)
        assert(typeof node.html === 'string' && node.html.length > 0, `the card "${fixture.card}" has no markup`)
      },
    },
    {
      name: 'draws a structural node as chrome, whatever the card budget is',
      check: () => {
        const node = nodeOf(build({ cardBudget: 0 }), fixture.structural)

        assert(node.size !== undefined, `the structural node "${fixture.structural}" has no footprint`)
      },
    },
    {
      name: 'draws a collapsed cluster as a chip, not a bare panel',
      check: () => {
        if (!fixture.chip) return

        const node = nodeOf(build(), fixture.chip)

        assert(node.shape === 'card', `the collapsed cluster "${fixture.chip}" is not a card`)
        assert(node.size !== undefined, `the collapsed cluster "${fixture.chip}" has no chip footprint`)
      },
    },
    {
      name: 'degrades the cards above the budget to labels',
      check: () => {
        const node = nodeOf(build({ cardBudget: 0 }), fixture.card)

        assert(node.html === undefined, `the card "${fixture.card}" kept its markup above the budget`)
        assert(node.shape === 'dot', `the card "${fixture.card}" did not degrade to a dot`)
      },
    },
    {
      name: 'dims the nodes outside the focus neighbourhood',
      check: () => {
        if (!fixture.focus) return

        const model = build({ focus: fixture.focus })

        for (const id of fixture.lit ?? []) {
          assert(nodeOf(model, id).data?.dimmed === false, `the lit node "${id}" was dimmed`)
        }

        for (const id of fixture.dimmed ?? []) {
          assert(nodeOf(model, id).data?.dimmed === true, `the node "${id}" was not dimmed`)
        }
      },
    },
    {
      name: 'puts the chrome in front of the content',
      check: () => {
        const model = build({ bands: true })
        const ids = model.nodes.map((node) => node.id)
        const lastContent = fixture.visible.filter((id) => ids.includes(id)).slice(-1)[0]

        for (const id of fixture.bands ?? []) {
          assert(ids.includes(id), `the band "${id}" is missing from the render model`)

          if (!lastContent) continue

          assert(ids.indexOf(id) < ids.indexOf(lastContent), `the band "${id}" is drawn over the content`)
        }
      },
    },
    {
      name: 'emits the lane gutter to the left of the content',
      check: () => {
        const labels = fixture.options?.laneLabels ?? []

        if (labels.length === 0) return

        const model = build()
        const content = model.nodes.filter((node) => fixture.visible.includes(node.id))

        if (content.length === 0) return

        const minX = Math.min(...content.map((node) => node.position[0]))

        for (const label of labels) {
          const node = nodeOf(model, `lane:${label.id}`)

          assert(node.interactive === false, `the lane label "${label.id}" is interactive`)
          assert(node.position[0] < minX, `the lane label "${label.id}" is not left of the content`)
        }
      },
    },
    {
      name: 'emits the row and column captions with their role',
      check: () => {
        const labels = fixture.options?.axisLabels ?? []

        if (labels.length === 0) return

        const model = build()

        for (const label of labels) {
          const node = nodeOf(model, `axis:${label.id}`)

          assert(node.interactive === false, `the axis label "${label.id}" is interactive`)
          assert(node.data?.axis === label.role, `the axis label "${label.id}" lost its role`)
        }
      },
    },
    {
      name: 'maps every edge through the host edge mapping',
      check: () => {
        const model = build()

        for (const edge of model.edges) {
          assert(edge.visible !== false, `the edge "${edge.id}" is not visible`)
          assert(edge.source.length > 0 && edge.target.length > 0, `the edge "${edge.id}" has no endpoints`)
        }
      },
    },
  ]

  return cases
}
