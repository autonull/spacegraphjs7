import { HUD_COLORS, HUD_ZINDEX } from '../hud/HUDStyles';

/** Styles for the Mermaid diagram HUD, injected once on first use. */
export const MERMAID_HUD_STYLES = `
      .mermaid-hud-container {
        position: absolute;
        top: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: auto;
        z-index: ${HUD_ZINDEX.HUD};
        max-width: 260px;
      }

      .mermaid-hud-section {
        background: ${HUD_COLORS.background};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .mermaid-hud-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: ${HUD_COLORS.primary};
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid ${HUD_COLORS.border};
      }

      .mermaid-hud-section-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .mermaid-hud-select {
        width: 100%;
        padding: 8px 10px;
        background: ${HUD_COLORS.surface};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 6px;
        color: ${HUD_COLORS.text};
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-select:hover { border-color: ${HUD_COLORS.primary}; }
      .mermaid-hud-select:focus {
        outline: none;
        border-color: ${HUD_COLORS.primary};
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
      }

      .mermaid-hud-button {
        width: 100%;
        padding: 9px 14px;
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid ${HUD_COLORS.primary};
        border-radius: 6px;
        color: ${HUD_COLORS.text};
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .mermaid-hud-button:hover {
        background: rgba(139, 92, 246, 0.35);
        transform: translateY(-1px);
      }

      .mermaid-hud-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .mermaid-hud-button-small {
        flex: 1;
        padding: 7px 10px;
        background: ${HUD_COLORS.surface};
        border: 1px solid ${HUD_COLORS.border};
        border-radius: 5px;
        color: ${HUD_COLORS.text};
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s;
      }

      .mermaid-hud-button-small:hover {
        border-color: ${HUD_COLORS.primary};
        background: rgba(139, 92, 246, 0.1);
      }

      .mermaid-hud-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: ${HUD_COLORS.textMuted};
        cursor: pointer;
      }

      .mermaid-hud-checkbox input {
        accent-color: ${HUD_COLORS.primary};
        width: 14px;
        height: 14px;
      }

      .mermaid-hud-hint {
        font-size: 10px;
        color: ${HUD_COLORS.textMuted};
        font-style: italic;
        text-align: center;
        padding: 4px;
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
      }
    `;
