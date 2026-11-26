/**
 * GraphQuestionsControl - Questions/commands menu for the toolbar.
 */

import type { JSX } from 'solid-js';
import { menuOption } from '@spacegraphjs/shared/menu';
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

    const question = (name: QuestionName, label: string) =>
        menuOption({
            label,
            slot: 'graph-question-option',
            value: name,
            keepOpen: true,
            onClick: () => ask(name),
        });

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
