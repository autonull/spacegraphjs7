import type { Command } from './shell';

/** Static shortcut reference. The host prepends the entries whose text or action depends on state. */
export const SHORTCUT_HELP: readonly Command[] = [
    {
        id: 'help.reveal',
        label: 'Reveal the selected node',
        group: 'shortcut',
        hint: 'Enter',
    },
    {
        id: 'help.descend',
        label: 'Descend / ascend a scope',
        group: 'shortcut',
        hint: 'PgDn / PgUp',
    },
    { id: 'help.trace', label: 'Trace a path', group: 'shortcut', hint: 't' },
    { id: 'help.survey', label: 'Survey the graph', group: 'shortcut', hint: 's' },
    {
        id: 'help.home',
        label: 'Return home, close the surface',
        group: 'shortcut',
        hint: 'Home / Esc',
    },
    { id: 'help.pan', label: 'Pan and zoom', group: 'shortcut', hint: 'arrows / +−' },
    { id: 'help.focus', label: 'Center the focused node', group: 'shortcut', hint: 'f' },
    { id: 'help.graphView', label: 'Cycle graph views', group: 'shortcut', hint: 'g' },
    { id: 'help.graphAligned', label: 'Toggle aligned transcript', group: 'shortcut', hint: 'a' },
    { id: 'help.corridor', label: 'Toggle ribbon corridor', group: 'shortcut', hint: 'r' },
    { id: 'help.graphMorph', label: 'Toggle graph morph', group: 'shortcut', hint: 'm' },
    {
        id: 'help.continuity',
        label: 'Toggle continuous connection grammar',
        group: 'shortcut',
        hint: 'view.continuity',
    },
    {
        id: 'help.fieldTargets',
        label: 'Toggle scope fields anchored to solved targets',
        group: 'shortcut',
        hint: 'view.fieldTargets',
    },
];
