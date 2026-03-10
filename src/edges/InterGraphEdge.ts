import * as THREE from 'three';
import { Edge } from './Edge';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import type { Node } from '../nodes/Node';

export class InterGraphEdge extends Edge {
    public isInterGraphEdge = true;
    private svgNamespace = 'http://www.w3.org/2000/svg';
    private svgLine: SVGPathElement;
    private svgContainer: SVGSVGElement;
    private animationFrameId?: number;

    constructor(sg: SpaceGraph, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);

        // Remove from the THREE scene if it was added incorrectly
        if (this.object.parent) {
            this.object.parent.remove(this.object);
        }

        this.svgContainer = this.getGlobalSvgContainer();
        this.svgLine = document.createElementNS(this.svgNamespace, 'path');

        const colorHex = (spec.data && spec.data.color) ? spec.data.color : 0x666666;
        const colorHexStr = typeof colorHex === 'number' ? `#${colorHex.toString(16).padStart(6, '0')}` : colorHex;

        this.svgLine.setAttribute('stroke', colorHexStr);
        this.svgLine.setAttribute('stroke-width', '2');
        this.svgLine.setAttribute('fill', 'none');
        this.svgLine.setAttribute('stroke-dasharray', '5, 5'); // Dotted to indicate cross-canvas

        this.svgContainer.appendChild(this.svgLine);

        // Start continuous update loop to track camera/node changes across both instances
        this.startUpdateLoop();
    }

    private getGlobalSvgContainer(): SVGSVGElement {
        let svg = document.getElementById('spacegraph-intergraph-overlay') as unknown as SVGSVGElement;
        if (!svg) {
            svg = document.createElementNS(this.svgNamespace, 'svg');
            svg.id = 'spacegraph-intergraph-overlay';
            svg.style.position = 'fixed';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100vw';
            svg.style.height = '100vh';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '9999';
            document.body.appendChild(svg);
        }
        return svg;
    }

    private projectToScreen(node: Node, targetVector: THREE.Vector3) {
        targetVector.copy(node.position);
        targetVector.project(node.sg.renderer.camera);

        const rect = node.sg.renderer.renderer.domElement.getBoundingClientRect();

        targetVector.x = (targetVector.x *  0.5 + 0.5) * rect.width + rect.left;
        targetVector.y = (targetVector.y * -0.5 + 0.5) * rect.height + rect.top;
        targetVector.z = 0;
    }

    private updateSvgLine() {
        const sourcePos = new THREE.Vector3();
        const targetPos = new THREE.Vector3();

        this.projectToScreen(this.source, sourcePos);
        this.projectToScreen(this.target, targetPos);

        const path = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
        this.svgLine.setAttribute('d', path);
    }

    private startUpdateLoop() {
        const loop = () => {
            this.updateSvgLine();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }

    update() {
        // Handled by update loop
    }

    updateSpec(updates: Partial<EdgeSpec>) {
        super.updateSpec(updates);
        if (updates.data && updates.data.color) {
            const colorHex = updates.data.color;
            const colorHexStr = typeof colorHex === 'number' ? `#${colorHex.toString(16).padStart(6, '0')}` : colorHex;
            this.svgLine.setAttribute('stroke', colorHexStr);
        }
    }

    dispose() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.svgLine && this.svgLine.parentNode) {
            this.svgLine.parentNode.removeChild(this.svgLine);
        }
        super.dispose();
    }
}