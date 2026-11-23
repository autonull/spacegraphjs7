import { createIconRenderer, type IconComponent } from '@spacegraphjs/shared/icons';
import type { I18n } from '@spacegraphjs/shared/i18n';
import { createIconPopover, type PopoverComponent } from '@spacegraphjs/shared/popover';
import type { JSX } from 'solid-js';
import { GraphQuestionsControl as ToolbarQuestionsControl } from '@spacegraphjs/toolbar';
import { legacyI18n } from './legacy-i18n';
export type GraphQuestionsControlProps = {
    /** The i18n instance for translations. */
    i18n: I18n;
    /** The icon component to use. */
    Icon?: IconComponent;
    /** Callback to dispatch a command. */
    dispatchCommand?: (command: string) => void;
};
const legacyPopover = (Icon?: IconComponent): PopoverComponent => {
    const renderIcon = createIconRenderer(Icon);
    return createIconPopover((name) => renderIcon({ name, size: 'small' }));
};

export const GraphQuestionsControl = (props: GraphQuestionsControlProps): JSX.Element => {
    const { i18n, Icon, ...rest } = props;
    return (
        <ToolbarQuestionsControl
            {...rest}
            i18n={legacyI18n(i18n)}
            Icon={Icon}
            Popover={legacyPopover(Icon)}
        />
    );
};