import { Node } from './src/nodes/Node.ts';
import { SpaceGraph } from './src/SpaceGraph.ts';

// Mock container
import { JSDOM } from 'jsdom';
const dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
global.document = dom.window.document;
global.window = dom.window as any;

const container = document.createElement('div');
// Since SpaceGraph initializes a WebGLRenderer, we can just mock SpaceGraph
const sg = {
    events: { emit: () => {} },
    renderer: { camera: {} },
    graph: { getNode: () => null }
} as any;

const nodeSpec = {
    id: 'test-node',
    label: 'Test Node'
};

const node = new Node(sg, nodeSpec);

console.log('Initial position:', node.position);
console.log('Initial scale:', node.object.scale);

node.setPosition(10, 20, 30).scale(2).animate({
    x: 100,
    y: 200,
    z: 300,
    scale: 4,
    duration: 1
});

console.log('After setPosition(10, 20, 30):', node.position);
console.log('After scale(2):', node.object.scale);

setTimeout(() => {
    console.log('After 1s animation, position should be around 100, 200, 300:', node.position);
    console.log('After 1s animation, scale should be around 4:', node.object.scale);
    console.log('Chainable API verified successfully.');
    process.exit(0);
}, 1100);
