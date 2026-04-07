import * as THREE from 'three';

import { DOMNode } from './DOMNode';
import { DOMUtils } from '../utils/DOMUtils';
import type { NodeSpec } from '../types';
import type { SpaceGraph } from '../SpaceGraph';

export interface BaseContentNodeConfig {
    tag?: keyof HTMLElementTagNameMap;
    defaultWidth: number;
    defaultHeight: number;
    defaultTheme?: 'dark' | 'light';
    materialParams?: THREE.MeshBasicMaterialParameters;
    className?: string;
    customStyles?: Partial<CSSStyleDeclaration>;
    createTitleBar?: boolean | string;
    updatePositionOnInit?: boolean;
}

export abstract class BaseContentNode extends DOMNode {
    constructor(sg: SpaceGraph, spec: NodeSpec, config: BaseContentNodeConfig) {
        const {
            tag = 'div',
            defaultWidth,
            defaultHeight,
            defaultTheme = 'dark',
            materialParams,
            className,
            customStyles = {},
            createTitleBar: titleBarConfig,
            updatePositionOnInit,
        } = config;

        const w = (spec.data?.width as number) ?? defaultWidth;
        const h = (spec.data?.height as number) ?? defaultHeight;
        const theme = (spec.data?.theme as string) ?? defaultTheme;

        const el = DOMUtils.createElement(tag);
        super(sg, spec, el, w, h, materialParams);

        if (className) this.domElement.className = className;

        this.setupContainerStyles(w, h, theme as 'dark' | 'light', customStyles);

        if (titleBarConfig) {
            const title =
                typeof titleBarConfig === 'string' ? titleBarConfig : (spec.label ?? 'Untitled');
            const bar = this.createTitleBar(title, theme as 'dark' | 'light');
            this.domElement.appendChild(bar);
        }

        if (updatePositionOnInit) {
            this.updatePosition(this.position.x, this.position.y, this.position.z);
        }
    }
}
