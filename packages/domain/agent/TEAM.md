# Pattern card — `AgentTeamView`, `SteerEdge`, `TeamScope`

| Field          | Value                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Metaphor       | Steering is an edge from the operator; a team is a scoped set of agent tabs.                                                                                             |
| Inputs         | `TeamModel` (agents, links, operator), `TeamState` (active, scope, log), existing kernel facts.                                                                          |
| Outputs        | `teamPanelHTML` chrome, `teamScopeStats` aggregates, `reduceTeam` state transitions.                                                                                     |
| Facts          | Steer = `action` node + `orders` edge; approve = re-commit the `task` node with `status: complete`. No new kinds.                                                        |
| Invariants     | Edges are read models over committed facts; one tab per agent; scope never writes graph data.                                                                            |
| Keyboard       | Number keys select agents, `s` focuses steer, `a` approves, `Escape` clears scope; panel buttons are native.                                                             |
| Reduced motion | `team.css` drops transitions and animations under `prefers-reduced-motion`.                                                                                              |
| Failure modes  | No pending task produces an announcement; empty scope yields zero stats; missing tab is a no-op.                                                                         |
| Consumers      | Demo: `app/demo/html/interaction/agent-team.html`. Pi Durable: `?labs=1` team panel (`t`). E2E: `test/e2e/agent-team.spec.ts`, `app/pi-durable/tests/labs-team.spec.ts`. |

The package owns the read model and chrome only. Hosts keep placement, camera and commit paths; the
visual edge is derived from the same committed facts the kernel already stores.
