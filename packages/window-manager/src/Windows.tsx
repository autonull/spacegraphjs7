import { For, onCleanup } from 'solid-js';
import { WindowItem, WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT } from './WindowItem';
import type { WindowsProps, WindowState } from './types';

export const Windows = (props: WindowsProps) => {
    let stopDrag: (() => void) | undefined;
    onCleanup(() => stopDrag?.());

    const update = (id: string, patch: Partial<WindowState>) =>
        props.onChange?.(
            props.windows.map((window) => (window.id === id ? { ...window, ...patch } : window)),
        );

    const raise = (id: string) => {
        const top = props.windows.reduce((highest, window) => Math.max(highest, window.z), 0);
        const current = props.windows.find((window) => window.id === id);
        if (!current || current.z === top) return;
        update(id, { z: top + 1 });
    };

    const beginDrag = (event: PointerEvent, id: string, mode: 'move' | 'resize') => {
        const start = props.windows.find((window) => window.id === id);
        if (!start) return;
        event.preventDefault();
        raise(id);
        const originX = event.clientX;
        const originY = event.clientY;
        const handle = event.currentTarget as HTMLElement;
        handle.setPointerCapture(event.pointerId);

        const isRTL = document.documentElement.dir === 'rtl';

        const move = (moveEvent: PointerEvent) => {
            let dx = moveEvent.clientX - originX;
            const dy = moveEvent.clientY - originY;
            if (isRTL) dx = -dx;
            if (mode === 'move') {
                const bounds = props.bounds();
                update(id, {
                    left: Math.min(
                        Math.max(0, start.left + dx),
                        Math.max(0, bounds.width - start.width),
                    ),
                    top: Math.min(
                        Math.max(0, start.top + dy),
                        Math.max(0, bounds.height - start.height),
                    ),
                });
                return;
            }
            update(id, {
                width: Math.max(WINDOW_MIN_WIDTH, start.width + dx),
                height: Math.max(WINDOW_MIN_HEIGHT, start.height + dy),
            });
        };
        const end = () => {
            handle.releasePointerCapture?.(event.pointerId);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            stopDrag = undefined;
        };
        stopDrag?.();
        stopDrag = end;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
    };

    const placement = (window: WindowState) => {
        if (!window.pinned || !window.nodeID) return { left: window.left, top: window.top };
        const anchor = props.anchorOf?.(window.nodeID);
        if (!anchor) return { left: window.left, top: window.top };
        return { left: anchor.x - window.width / 2, top: anchor.y - window.height / 2 };
    };

    return (
        <div
            data-component="spacegraph-windows"
            data-slot="spacegraph-windows"
            class="pointer-events-none absolute inset-0 z-30"
        >
            <For each={props.windows}>
                {(window) => (
                    <WindowItem
                        window={window}
                        placement={() => placement(window)}
                        title={props.title(window)}
                        onRaise={() => raise(window.id)}
                        onClose={() => props.onClose?.(window.id)}
                        onMove={(event) => beginDrag(event, window.id, 'move')}
                        onResize={(event) => beginDrag(event, window.id, 'resize')}
                        render={() => props.render(window)}
                        closeLabel={props.emptyTitle}
                    />
                )}
            </For>
        </div>
    );
};

export { WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT } from './WindowItem';
export type { WindowState, WindowsProps } from './types';
