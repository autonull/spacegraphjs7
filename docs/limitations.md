# Known limitations

The library's own limits, declared rather than discovered. Every entry names what the code does
today, where it lives, and what a host can do instead. A host that needs a missing capability should
learn it is missing before it ships, not from a screenshot.

## 1. The mesh outline is a box, not a silhouette

A mesh node's focus, selection and hover outline is a `THREE.BoxHelper` around its geometry
(`src/nodes/Node.ts`, `setOutlineState`), drawn with `depthTest` off so the node never hides it. It
is a wireframe box: it follows the node's **bounding box**, not its outline. A stencil or backface
silhouette outline — an inverted hull, or a stencil pass over the node's own geometry — is not
implemented.

**What a host can do.** Draw its own outline. The DOM card path (`HtmlNode`, `DOMNode`) hands the
host the card's markup, so the border is the host's to style; the OpenCode host uses DOM cards and
never sees the box.

## 2. The depth fade is a scene fog, and DOM cards do not fade with it

`layered` and `depth-stack` attenuate the scene with an exponential fog whose density is
scene-relative (`src/depth/DepthCues.ts`, `sceneFadeDensity`; the renderer applies it in
`setDepthFade`). The fog is a property of the scene's materials. A DOM card is an HTML element over
the canvas, so it is **not** attenuated by it: in those modes the meshes recede and the cards do
not.

**What a host can do.** Attenuate a card itself — `setOpacity` sets the card's opacity, and it is
what the dimming of unfocused neighbours already uses. A host that wants a card to recede with the
scene computes the attenuation from the same depth cues and applies it per card.

## 3. DOM cards are the supported path for text

The engine's own mesh nodes are geometry, not text: a label drawn into a texture is not selectable,
not in the browser's accessibility tree, and not crisp at every zoom. A host that needs readable
text uses DOM cards, and the contract declares that as a capability (`domNodes`, `maxDomNodes`) so
a host can ask before it offers the affordance. The mesh path is for shapes, badges and the scene
around the cards.

**What a host can do.** Use the DOM card path for anything a reader has to read, and treat the mesh
path as decoration. Both renderers support it; the Cytoscape adapter draws the same cards.

## 4. The layout engine places; it does not measure the screen

`LaneLayout` and the strategies over it compute world positions. They know nothing about the
viewport, the canvas size, or the device pixel ratio: a fit, a minimum legible scale and a camera
are the renderer's business, reached through the contract (`fit(ids, { minScale })`). A host that
wants a legible frame asks for it; it does not get it from the layout.

**What a host can do.** Fit through the contract and read the camera back
(`getViewport?.()`), as the OpenCode host does for its reduced-motion jump and its permalinks.
