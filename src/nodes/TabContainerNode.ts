import { HtmlNode } from './HtmlNode';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, SpaceGraphNodeData } from '../types';
import { DOMUtils } from '../utils/DOMUtils';

export interface TabInfo {
    id: string;
    label: string;
    closable?: boolean;
}

export class TabContainerNode extends HtmlNode {
    private tabs: TabInfo[] = [];
    private activeTabId: string = '';
    private tabBarElement: HTMLElement | null = null;
    private contentAreaElement: HTMLElement | null = null;
    private tabContentMap: Map<string, HTMLElement> = new Map();

    constructor(sg: SpaceGraph, spec: NodeSpec) {
        super(sg, spec);
        this._initializeTabs();
    }

    private _initializeTabs(): void {
        const data = this.data as SpaceGraphNodeData;
        this.tabs = (data?.tabs as TabInfo[]) ?? [{ id: 'tab1', label: 'Tab 1' }];
        this.activeTabId = (data?.activeTab as string) ?? this.tabs[0]?.id ?? '';

        this._createTabBar();
        this._showActiveTab();
    }

    private _createTabBar(): void {
        if (!this.domElement) return;

        const tabBar = DOMUtils.createElement('div');
        tabBar.className = 'tab-container-header';
        Object.assign(tabBar.style, {
            display: 'flex',
            backgroundColor: '#1a1a2e',
            borderBottom: '1px solid #333',
            padding: '4px 8px 0',
            gap: '2px',
        });

        this.tabBarElement = tabBar;
        this.domElement.appendChild(tabBar);

        for (const tab of this.tabs) {
            this._createTabButton(tab);
        }
    }

    private _createTabButton(tab: TabInfo): void {
        if (!this.tabBarElement) return;

        const button = DOMUtils.createElement('button');
        button.textContent = tab.label;
        button.dataset.tabId = tab.id;
        Object.assign(button.style, {
            padding: '6px 12px',
            backgroundColor: tab.id === this.activeTabId ? '#2a2a4e' : 'transparent',
            color: '#fff',
            border: 'none',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
        });

        if (tab.closable !== false) {
            const closeBtn = DOMUtils.createElement('span');
            closeBtn.textContent = ' ×';
            closeBtn.style.marginLeft = '4px';
            closeBtn.style.cursor = 'pointer';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            };
            button.appendChild(closeBtn);
        }

        button.onclick = () => this.setActiveTab(tab.id);
        this.tabBarElement!.appendChild(button);
    }

    setActiveTab(tabId: string): void {
        if (!this.tabs.find(t => t.id === tabId)) return;
        this.activeTabId = tabId;
        this._showActiveTab();
    }

    private _showActiveTab(): void {
        if (this.contentWrapper) {
            this.contentWrapper.innerHTML = '';
            
            const contentEl = this.tabContentMap.get(this.activeTabId);
            if (contentEl) {
                this.contentWrapper.appendChild(contentEl);
            }
        }

        if (this.tabBarElement) {
            const buttons = this.tabBarElement.querySelectorAll('button');
            buttons.forEach(btn => {
                const tabId = btn.dataset.tabId;
                btn.style.backgroundColor = tabId === this.activeTabId ? '#2a2a4e' : 'transparent';
            });
        }
    }

    addTab(label: string, closable = true): string {
        const id = `tab_${Date.now()}`;
        this.tabs.push({ id, label, closable });
        this._createTabButton({ id, label, closable });
        this.setActiveTab(id);
        return id;
    }

    closeTab(tabId: string): void {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;
        
        const tab = this.tabs[index];
        if (tab.closable === false) return;
        
        this.tabs.splice(index, 1);
        this.tabContentMap.delete(tabId);
        
        this.tabBarElement?.querySelector(`button[data-tab-id="${tabId}"]`)?.remove();
        
        if (this.activeTabId === tabId) {
            this.setActiveTab(this.tabs[Math.min(index, this.tabs.length - 1)]?.id ?? '');
        }
    }

    setTabContent(tabId: string, content: string | HTMLElement): void {
        let contentEl: HTMLElement;
        if (typeof content === 'string') {
            contentEl = DOMUtils.createElement('div');
            contentEl.innerHTML = content;
        } else {
            contentEl = content;
        }
        this.tabContentMap.set(tabId, contentEl);
        
        if (tabId === this.activeTabId) {
            this._showActiveTab();
        }
    }

    getActiveTab(): string {
        return this.activeTabId;
    }

    getTabs(): TabInfo[] {
        return [...this.tabs];
    }
}