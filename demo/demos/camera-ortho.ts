import { createDemo } from '../framework';

export default function cameraOrthoDemo() {
    const sg = createDemo({
        nodes: [
            {
                id: 'a',
                type: 'ShapeNode',
                position: [-100, 100, 0],
                data: { color: 0xff4466, size: 40 },
            },
            {
                id: 'b',
                type: 'ShapeNode',
                position: [100, 100, 0],
                data: { color: 0x44ff88, size: 40 },
            },
            {
                id: 'c',
                type: 'ShapeNode',
                position: [0, -100, 0],
                data: { color: 0x4488ff, size: 40 },
            },
        ],
        edges: [],
    });

    sg.events.on('ready', () => {
        const style = document.createElement('style');
        style.textContent = `
            .demo-hint {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.7);
                color: #fff;
                padding: 12px 20px;
                border-radius: 8px;
                font-family: system-ui, sans-serif;
                font-size: 13px;
                z-index: 100;
            }
            .demo-hint kbd {
                background: #333;
                padding: 2px 6px;
                border-radius: 4px;
                margin: 0 2px;
            }
        `;
        document.head.appendChild(style);

        const hint = document.createElement('div');
        hint.className = 'demo-hint';
        hint.innerHTML = `
            <strong>Orbit:</strong> <kbd>Left Mouse</kbd> &nbsp;|&nbsp;
            <strong>Pan:</strong> <kbd>Right Mouse</kbd> &nbsp;|&nbsp;
            <strong>Zoom:</strong> <kbd>Scroll</kbd>
        `;
        document.body.appendChild(hint);
    });

    return sg;
}
