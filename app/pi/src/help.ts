import type { Command } from './shell';

const shortcut = (id: string, label: string, hint: string): Command => ({
    id: `help.${id}`,
    label,
    group: 'shortcut',
    hint,
});

/** Static shortcut reference. The host prepends the entries whose text or action depends on state. */
export const SHORTCUT_HELP: readonly Command[] = [
    shortcut('reveal', 'Reveal the selected node', 'Enter'),
    shortcut('descend', 'Descend / ascend a scope', 'PgDn / PgUp'),
    shortcut('trace', 'Trace a path', 't'),
    shortcut('survey', 'Survey the graph', 's'),
    shortcut('home', 'Return home, close the surface', 'Home / Esc'),
    shortcut('pan', 'Pan and zoom', 'arrows / +−'),
    shortcut('focus', 'Center the focused node', 'f'),
    shortcut('preset', 'Filter UI presets', 'u'),
    shortcut('graphView', 'Cycle graph views', 'g'),
    shortcut('graphAligned', 'Toggle aligned transcript', 'a'),
    shortcut('corridor', 'Toggle ribbon corridor', 'r'),
    shortcut('graphMorph', 'Toggle graph morph', 'm'),
    shortcut('continuity', 'Toggle continuous connection grammar', 'view.continuity'),
    shortcut('fieldTargets', 'Toggle scope fields anchored to solved targets', 'view.fieldTargets'),
];

/** Mouse gestures mirror the library contract; the reference map renders this table. */
export const MOUSE_HELP: readonly { readonly key: string; readonly label: string }[] = [
    { key: 'Right-drag', label: 'Pan the view' },
    { key: 'Wheel', label: 'Zoom at the pointer' },
    { key: 'Left-drag void', label: 'Pan the view' },
    { key: 'Middle-click node', label: 'Frame that node' },
    { key: 'Left-click node', label: 'Select it' },
    { key: 'Left-drag node', label: 'Move it' },
    { key: 'Shift-drag void', label: 'Box-select' },
    { key: 'Middle-drag', label: 'Orbit in perspective' },
];
