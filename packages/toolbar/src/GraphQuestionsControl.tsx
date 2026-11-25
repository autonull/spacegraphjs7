/**
 * GraphQuestionsControl - Questions/commands menu for the toolbar.
 */

import type { JSX } from 'solid-js';
import type { IconComponent } from '@spacegraphjs/shared/icons';
import { createPopoverRenderer, type PopoverComponent } from '@spacegraphjs/shared/popover';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { ToolbarMenu } from './ToolbarMenu';

type QuestionName =
    | 'why'
    | 'led-here'
    | 'related'
    | 'compare'
    | 'note'
    | 'facets'
    | 'failureProgress'
    | 'find';

const QUESTIONS: readonly (readonly [QuestionName, string])[] = [
    ['why', 'ui.toolbar.questions.why'],
    ['led-here', 'ui.toolbar.questions.ledHere'],
    ['related', 'ui.toolbar.questions.related'],
    ['compare', 'ui.toolbar.questions.compare'],
    ['note', 'ui.toolbar.questions.note'],
    ['facets', 'ui.toolbar.questions.facets'],
    ['failureProgress', 'ui.toolbar.questions.failureProgress'],
    ['find', 'ui.toolbar.questions.find'],
];

export interface GraphQuestionsControlProps {
    dispatchCommand?: (command: string) => void;
    i18n: I18n;
    Icon?: IconComponent;
    Popover?: PopoverComponent;
}

export function GraphQuestionsControl(props: GraphQuestionsControlProps): JSX.Element {
    const { dispatchCommand, i18n, Popover } = props;
    const PopoverComponent = Popover ?? createPopoverRenderer();

    const ask = (name: QuestionName) => {
        if (dispatchCommand) {
            dispatchCommand(name);
            return;
        }
        window.dispatchEvent(new CustomEvent('graph:command', { detail: { name } }));
    };

    const question = (name: QuestionName, label: string) => (
        <button
            type="button"
            data-slot="graph-question-option"
            data-value={name}
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-12-regular text-text-base hover:bg-surface-base-hover"
            onClick={() => ask(name)}
        >
            {label}
        </button>
    );

    return (
        <ToolbarMenu
            slot="graph-toolbar-questions"
            label={i18n.t('ui.toolbar.questions.title')}
            icon="magnifying-glass"
            align="end"
            Popover={PopoverComponent}
        >
            {QUESTIONS.map(([name, key]) => question(name, i18n.t(key)))}
        </ToolbarMenu>
    );
}
