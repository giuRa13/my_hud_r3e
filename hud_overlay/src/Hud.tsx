import { useEffect, useState } from 'react';
import { useLiveState } from './data/useLiveState.ts';
import HudLayer from './HudLayer.tsx';
import ControlPanel from './ControlPanel.tsx';

// -webdev -webHudUrl=http://localhost:4000/

// Normal play: edit mode is off, so widgets are display-only and don't capture the mouse. Only the HUD is visible.
// Shift+E: the panel appears, widgets become draggable and scalable, and a hover ring shows what's grabbable

// only text-like inputs block the shortcut, so it still works with a slider focused
function is_typing(t: EventTarget | null) {
    const el = t as HTMLElement | null;
    if (!el) return false;
    if (el.tagName === "TEXTAREA" || el.isContentEditable) return true;
    if (el.tagName !== "INPUT") return false;
    const type = (el as HTMLInputElement).type;
    return ["text", "number", "search", "email", "url", "password"].includes(type);
}

export default function Hud() {
    const state = useLiveState();
    const [panel_open, setPanelOpen] = useState(false);

    // Shift+E toggles edit mode (panel + dragging/scaling)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!e.shiftKey || e.key.toLowerCase() !== "e" || is_typing(e.target)) return;
            setPanelOpen((v) => !v);
        };
        window.addEventListener("keyup", onKey);
        return () => window.removeEventListener("keyup", onKey);
    }, []);

    //wraps everything in a pointer-events-none div 
    // (so the HUD doesn’t block the game when edit mode is off), and that setting is inherited by every child
    // Widgets work because WidgetFrame sets pointer-events-auto on itself when editable (and Control Panel too)
    return (
        <div className='fixed inset-0 pointer-events-none'>
            {state && <HudLayer state={state} />}
            {panel_open && <ControlPanel onClose={() => setPanelOpen(false)}  />}
        </div>
    );
};