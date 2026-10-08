import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import { widgets } from '../widgets/registry';

export type WidgetLayout = { x: number; y: number; scale: number };
export type Side = "left" | "right";
export type Settings = { bg_color: string; bg_alpha: number;  panelSide: Side };
type Layout = Record<string, WidgetLayout>; // an object where the keys are strings and every value is a WidgetLayout. const layout: Layout = {speed: {x: 100, y: 500, scale: 1},sectors: {x: 700,y: 500,scale: 0.8} ...};
type State = { layout: Layout; settings: Settings };

const KEY = "hud.layout.v1";
const default_settings: Settings = { bg_color: "#000000", bg_alpha: 0.6, panelSide: "left" };

// give it a widget ID: default_of("gear") - it looks inside registry: widgets["gear"] - and returns its default position: {x: 100, y: 500, scale: 1}
function default_of(id: string): WidgetLayout {
    const w = (widgets as any)[id]; // "as any" don't check the type of widgets here, access it dynamically
    return { x: w.pos.x, y: w.pos.y, scale: 1 };
};

// creates the default layout for every widget
function default_layout(): Layout {
    const out: Layout = {};
    for (const id of Object.keys(widgets)) out[id] = default_of(id);
    return out;
};

function load(): State {
    const base: State = { layout: default_layout(), settings: default_settings };
    try {
        const p = JSON.parse(localStorage.getItem(KEY) || "null");// JSON string"{"layout":{"speed":{"x":300,"y":400,"scale":1.2}}}" -> JSON.parse() -> JavaScript object
        if (!p) return base;
        // if you add a new widget in a future version, the old save file doesn't necessarily have to contain it. The default supplies it.
        return {
            layout: { ...base.layout, ...p.layout },
            settings: { ...base.settings, ...p.settings },
        };
    } 
    catch {
        return base;
    }
};

function legacy_copy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy"); // navigator.clipboard.writeText(text)
    document.body.removeChild(ta);
};

type Ctx = State & {
    set_pos: (id: string, x: number, y: number) => void;
    set_scale: (id: string, scale: number) => void;
    reset_widget: (id: string) => void;
    set_settings: (patch: Partial<Settings>) => void; // "Partial" TypeScript utility type So you can do: set_settings({bg_alpha: 0.8}); without having to specify: bg_color
    reset_all: () => void;
    copy_layout: () => void;
};

// useContext Hook is a technique for passing data down the component tree without having to pass props through components
const LayoutContext = createContext<Ctx | null>(null);

// ReactNode(type representing things React can render as children), is a union of all the possible types that can be passed aschildren in JSX
// (everything inside LayoutProvider can access the context)
export function LayoutProvider({ children }: { children: ReactNode }) {

    const [state, setState] = useState<State>(load);

    useEffect(() => {
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    }, [state]);

    // Ctrl+V a layout copied with "Copy layout"
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            try {
                const d = JSON.parse(e.clipboardData!.getData('Text'));
                if (!d.__hudLayout) return;
                setState((s) => ({
                layout: { ...s.layout, ...d.layout },
                settings: { ...s.settings, ...d.settings },
                }));
            } 
            catch {}
        };
        document.addEventListener("paste", onPaste);
        return () => document.removeEventListener("paste", onPaste);
    }, []);

    const patchWidget = (id: string, patch: Partial<WidgetLayout>) =>
        setState((s) => ({ ...s, layout: { ...s.layout, [id]: { ...s.layout[id], ...patch } } }));

    const set_pos = useCallback((id: string, x: number, y: number) => patchWidget(id, { x, y }), []);
    const set_scale = useCallback((id: string, scale: number) => patchWidget(id, { scale }), []);
    const reset_widget = useCallback(
        (id: string) => setState((s) => ({ ...s, layout: { ...s.layout, [id]: default_of(id) } })),
        [],
    );
    const set_settings = useCallback(
        (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
        [],
    );
    const reset_all = useCallback(() => setState({ layout: default_layout(), settings: default_settings }), []);

    const copy_layout = useCallback(() => {
        const json = JSON.stringify({ __hudLayout: 1, ...state });
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(json).catch(() => legacy_copy(json));
        else legacy_copy(json);
    }, [state]);

    return (
        <LayoutContext.Provider
        value={{ ...state, set_pos, set_scale, reset_widget, set_settings, reset_all, copy_layout }}
        >
            {children}
        </LayoutContext.Provider>
    );
};

export function useLayout() {
    const ctx = useContext(LayoutContext);
    if (!ctx) throw new Error('useLayout must be used inside <LayoutProvider>');
    return ctx;
}