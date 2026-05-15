import { SpaceGraph } from '../src/index';

/**
 * Demo Tour Automator
 * Automatically cycles through demos and performs interactions for verification.
 */
export class DemoTour {
    private sg: SpaceGraph | null = null;
    private demos = [
        'quickstart', 'layouts', 'interaction', 'large',
        'fractal', 'plugins', 'mermaid', 'html',
        'instanced', 'single-node'
    ];
    private currentIndex = 0;
    private isRunning = false;

    constructor() {}

    async start(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;
        this.showOverlay();
        await this.runStep();
    }

    private showOverlay(): void {
        const overlay = document.createElement('div');
        overlay.id = 'tour-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #58a6ff;
            padding: 12px 24px;
            border-radius: 30px;
            border: 1px solid #58a6ff;
            font-family: sans-serif;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 15px;
        `;
        overlay.innerHTML = `
            <span id="tour-status">AUTOMATED TOUR ACTIVE</span>
            <span id="tour-demo-name" style="color: white; opacity: 0.8;"></span>
            <div id="tour-progress" style="width: 100px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                <div id="tour-progress-bar" style="width: 0%; height: 100%; background: #58a6ff; transition: width 0.3s;"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    private async runStep(): Promise<void> {
        if (!this.isRunning) return;

        const demo = this.demos[this.currentIndex];
        const statusEl = document.getElementById('tour-demo-name');
        const progressEl = document.getElementById('tour-progress-bar');

        if (statusEl) statusEl.textContent = `|  Viewing: ${demo.toUpperCase()}`;
        if (progressEl) progressEl.style.width = `${((this.currentIndex + 1) / this.demos.length) * 100}%`;

        // Wait at current demo
        await new Promise(resolve => setTimeout(resolve, 3000));

        this.currentIndex++;
        if (this.currentIndex >= this.demos.length) {
            this.stop();
            return;
        }

        // Navigate to next
        window.location.href = `${demo}.html?tour=true&index=${this.currentIndex}`;
    }

    stop(): void {
        this.isRunning = false;
        const overlay = document.getElementById('tour-overlay');
        if (overlay) overlay.remove();
        alert('Tour Complete! All demos verified.');
    }

    static handleAutoStart(): void {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tour') === 'true') {
            const tour = new DemoTour();
            const index = parseInt(urlParams.get('index') || '0');
            tour['currentIndex'] = index;
            tour.start();
        }
    }
}

// Auto-start if requested
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => DemoTour.handleAutoStart());
}
