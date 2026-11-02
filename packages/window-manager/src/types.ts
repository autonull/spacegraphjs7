import type { JSX } from 'solid-js';

export type WindowState = {
    id: string;
    kind: string;
    nodeID?: string;
    left: number;
    top: number;
    width: number;
    height: number;
    z: number;
    pinned?: boolean;
};

export type WindowsProps = {
    windows: readonly WindowState[];
    onChange?: (windows: WindowState[]) => void;
    onClose?: (id: string) => void;
    render: (window: WindowState) => JSX.Element;
    title: (window: WindowState) => string;
    anchorOf?: (nodeID: string) => { x: number; y: number } | undefined;
    bounds: () => { width: number; height: number };
    emptyTitle?: string;
};

export type WindowItemProps = {
    window: WindowState;
    placement: () => { left: number; top: number };
    title: string;
    onRaise: () => void;
    onClose: () => void;
    onMove: (event: PointerEvent) => void;
    onResize: (event: PointerEvent) => void;
    render: () => JSX.Element;
    closeLabel?: string;
};
