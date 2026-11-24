# SpaceGraphOS & Fractal Zooming User Interfaces

## The Paradigm Shift

For 40 years, computing has been defined by the WIMP paradigm: Windows, Icons, Menus, Pointers. This forces users to manage discrete application boundaries, rigid file system hierarchies, and overlapping windows that obscure rather than reveal context.

**SpaceGraphOS** throws away the desktop metaphor in favor of **Fractal Zooming User Interfaces (FZUI)**.

### What is a Fractal ZUI?

In a Fractal ZUI, there are no applications or files. There is only a single, infinite spatial canvas.

- **Zooming:** Navigation is achieved by zooming in and out. You zoom into a "document" node, and it seamlessly transitions into an editable text canvas. You zoom out, and it becomes a node connected to related project nodes.
- **Fractal:** The interface maintains self-similarity at varying scales. An overview of a system looks like a graph; zooming into a single node reveals that node _is itself_ a graph of its internal components.

### The Visible Operating System

SpaceGraphOS renders the entire operating system stack as a visible graph:

1. **Processes are Nodes:** Instead of checking `htop`, you zoom into the "System Processes" cluster and physically see nodes expanding when consuming memory, linked by data flow edges.
2. **Filesystem is a Graph:** Instead of directories, resources are semantically linked. A project node is physically connected to its assets, notes, and the person who created it.
3. **Network is Spatial:** Outbound connections are physical edges stretching to external data nodes.

## Architectural Requirements

To achieve this FZUI revolution, SpaceGraphJS must support next-generation architectural goals:

### 1. Infinite Level of Detail (LOD)

The renderer must seamlessly transition between macro-views (millions of nodes rendered as points) and micro-views (HTML/IFrame nodes with fully interactive DOM content) based on camera proximity. _Progress: SpaceGraphJS already implements `CullingManager` and `LODPlugin`._

### 2. Autonomous Layout Stability

In a Fractal ZUI, the canvas cannot drastically reorganize itself unexpectedly; users rely on spatial memory (knowing "Project X is up and to the right").

- Layout algorithms must prioritize structural stability.
- SpaceGraphJS's `VisionManager` will be utilized to ensure labels remain legible without destroying the user's spatial arrangement.

### 3. Semantic Edge Navigation

In standard zoomable interfaces (like Google Maps), zooming is pure coordinate translation. In a FZUI, zooming can traverse semantic edges. Double-clicking an edge smoothly forces the camera down the path to the connected component, acting as the primary navigation model instead of "clicking links".

### 4. Durable sessions are OS state

The private `app/pi-durable` consumer models a session as persistent OS state rather than a page:

- A **conversation** is a document node with committed entries; a **commit** is the only source of facts.
- The **task graph** is a process tree: owners, waits and signals are edges already recorded by Pi Durable.
- A **checkpoint** is spatial memory: a fork starts a new document at an existing entry, and the
  `fork` edge is a branch a user can navigate back along.
- A **sleep** or **signal** is a pending edge; it shows why work waits without inventing a cause.
- **Tabs** are workspace views over one owner, restoring selection, camera and transcript position
  instead of starting competing sessions.

This maps directly onto *Autonomous Layout Stability* (the same folded kernel keeps its spatial
arrangement across tab switches) and *Semantic Edge Navigation* (`orders`, `owns`, `sleeps-on` and
`fork` are the paths a user follows). The host owns layout; the durable adapter owns facts.

## The Road Ahead

SpaceGraphJS is the graphics primitive.
SpaceGraph Mini (Hardware) provides the NPU acceleration.
SpaceGraphOS is the final expression: an OS that sees itself, where the computer is visible, comprehensible, and infinite.
