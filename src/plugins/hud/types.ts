export interface HUDElementOptions {
    id: string;
    position:
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right'
        | 'center'
        | 'top-center'
        | 'bottom-center'
        | 'left-center'
        | 'right-center';
    html?: string;
    element?: HTMLElement;
    style?: Partial<CSSStyleDeclaration>;
}
