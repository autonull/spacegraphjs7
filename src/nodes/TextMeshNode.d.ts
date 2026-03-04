import { Node } from './Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec } from '../types';
/**
 * TextMeshNode — Billboard sprite-based large text node.
 *
 * Note: THREE.TextGeometry requires a font loader. This node uses a high-res
 * canvas sprite as a pragmatic cross-env alternative, giving the same visual
 * effect (prominent 3-D style text) without requiring font file loading.
 * If you need true 3-D extruded text, swap in TextGeometry + FontLoader here.
 *
 * data options:
 *   text       : string to display (falls back to spec.label)
 *   fontSize   : px for the canvas text (default 72)
 *   color      : CSS color (default '#ffffff')
 *   background : CSS background (default 'transparent')
 *   scale      : world-space scale multiplier (default 1)
 */
export declare class TextMeshNode extends Node {
    private sprite;
    private spriteMat;
    private currentText;
    constructor(sg: SpaceGraph, spec: NodeSpec);
    private _buildSprite;
    updateSpec(updates: Partial<NodeSpec>): void;
    dispose(): void;
}
