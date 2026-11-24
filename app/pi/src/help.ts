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
    shortcut('graphView', 'Cycle graph views', 'g'),
    shortcut('graphAligned', 'Toggle aligned transcript', 'a'),
    shortcut('corridor', 'Toggle ribbon corridor', 'r'),
    shortcut('graphMorph', 'Toggle graph morph', 'm'),
    shortcut('continuity', 'Toggle continuous connection grammar', 'view.continuity'),
    shortcut('fieldTargets', 'Toggle scope fields anchored to solved targets', 'view.fieldTargets'),
];
