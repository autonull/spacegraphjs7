import { createDemoWithNodes, shapeNode } from '../framework';

export default async function cameraOrbitDemo() {
  const sg = await createDemoWithNodes([
        shapeNode('center', [0, 0, 0], { color: 0x4488ff, size: 80 }),
        shapeNode('north', [0, 200, 0], { color: 0x44ff88, size: 40 }),
        shapeNode('south', [0, -200, 0], { color: 0xff4488, size: 40 }),
        shapeNode('east', [200, 0, 0], { color: 0xffaa44, size: 40 }),
        shapeNode('west', [-200, 0, 0], { color: 0xaa44ff, size: 40 }),
    ]);

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
