import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLayout } from '../store/LayoutContext'; 
import { widgets } from './registry';
import { hex_to_rgba } from '../utils'; 
import type { SettingField } from './types'; 

const btn = "px-2 py-1 rounded-xs bg-white/10 hover:bg-(--accentB) text-xs"; // hover:bg-white/20

// Downscale so the saved layout stays small (image is stored inside the layout)
function resize_image(file: File, max: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
            img.onload = () => {
            const w = img.naturalWidth || max;
            const h = img.naturalHeight || max;
            const k = Math.min(1, max / Math.max(w, h));
            const c = document.createElement("canvas");
            c.width = Math.max(1, Math.round(w * k));
            c.height = Math.max(1, Math.round(h * k));
            c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL("image/png")); // PNG keeps transparency
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
        img.src = url;
    });
}

function ImageField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [error, setError] = useState("");

    const pick = async (file?: File) => {
        if (!file) return;
        try {
            onChange(await resize_image(file, 512));
            setError('');
        } 
        catch {
            setError('Could not read that image');
        }
    };

    return (
        <div className="space-y-2 text-xs text-zinc-400">
            <div className="flex items-center justify-between">
                <span>{label}</span>
                <span className="flex gap-2">
                <button onClick={() => input.current?.click()} className={btn}>Choose…</button>
                {value && <button onClick={() => onChange('')} className={btn}>Use default</button>}
                </span>
            </div>
            <p className="text-zinc-500">{value ? "Custom image" : "Default image"}</p>
            {error && <p className="text-red-400">{error}</p>}
            <input
                ref={input} type="file" accept="image/*" className="hidden"
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
            />
        </div>
    );
};

function Field({ field, value, onChange }: {
    field: SettingField; value: any; onChange: (v: any) => void;
}) {
    switch (field.type) {
        case "number":
        return (
            <label className="block">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>{field.label}</span>
                <span className="tabular-nums text-zinc-200">{value}{field.suffix ?? ''}</span>
            </div>
            <input
                type="range" min={field.min} max={field.max} step={field.step ?? 1} value={value}
                onChange={(e) => onChange(+e.target.value)}
                className="w-full accent-(--accent)"
            />
            </label>
        );
        case "boolean":
        return (
            <label className="flex items-center justify-between text-xs text-zinc-400">
            <span>{field.label}</span>
            <input
                type="checkbox" checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
                className="accent-(--accent)"
            />
            </label>
        );
        case "color":
        return (
            <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{field.label}</span>
            <input
                type="color" value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border-2 border-(--graphite) hover:border-(--accent)"
            />
            </div>
        );
        case "select":
        return (
            <label className="flex items-center justify-between text-xs text-zinc-400">
            <span>{field.label}</span>
            <select
                value={value} onChange={(e) => onChange(e.target.value)}
                className="bg-zinc-800 px-2 py-1 text-zinc-200"
            >
                {field.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            </label>
        );
        case 'image':
        return <ImageField label={field.label} value={value} onChange={onChange} />;
    }
};


export default function WidgetSettingsModal({ id, onClose }: { id: string; onClose: () => void }) {
  
    const { layout, settings, set_config, reset_config, reset_widget } = useLayout();
    const def = widgets[id];
    const l = layout[id];

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const W = 288; // w-72
    const [pos, setPos] = useState(() => {
        const x = settings.panel_side === "left" ? 12 + W + 12 : window.innerWidth - (12 + W + 12) - W;
        return { x: Math.max(0, x), y: 12 };
    });
    const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

    const onDown = (e: React.PointerEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest("button") || e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    };
    const onMove = (e: React.PointerEvent<HTMLElement>) => {
        const d = drag.current;
        if (!d) return;
        setPos({
            x: Math.min(window.innerWidth - 60, Math.max(0, d.ox + e.clientX - d.sx)),
            y: Math.min(window.innerHeight - 40, Math.max(0, d.oy + e.clientY - d.sy)),
        });
    };
    const onUp = (e: React.PointerEvent<HTMLElement>) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    };

    if (!def || !l) return null;
    const fields = def.settings ?? [];

    // Portal: the panel's backdrop-blur would trap a fixed child inside the panel box
    return createPortal(
        <div
        onDragStart={(e) => e.preventDefault()}
        // sits right next to the panel, on its inner side, with no dimming backdrop
        className={"fixed top-3 z-50 flex max-h-[calc(100vh-1.5rem)] w-72 select-none flex-col rounded border border-white/10 text-zinc-200 shadow-2xl backdrop-blur pointer-events-auto"}
        style={{ 
            left: pos.x,
            top: pos.y,
            backgroundColor: hex_to_rgba(settings.bg_color, Math.max(settings.bg_alpha, 0.35)) }}
        >
        <header 
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="flex cursor-move touch-none items-center justify-between px-4 py-3 border-b border-(--accent) bg-(--accent)/20"
        >
            <h2 className="text-sm font-semibold tracking-wide">{def.label} settings</h2>
            <button onClick={onClose} className={btn} title="Close (Esc)">✕</button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {fields.length === 0 && (
            <p className="text-xs text-zinc-500">This widget has no settings.</p>
            )}
            {fields.map((f) => (
            <Field
                key={f.key}
                field={f}
                value={l.config[f.key] ?? f.default}
                onChange={(v) => set_config(id, { [f.key]: v })}
            />
            ))}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
            <span className="text-xs tabular-nums text-zinc-400">Scale {Math.round(l.scale * 100)}%</span>
            <span className="flex gap-2">
            <button onClick={() => reset_widget(id)} className={btn}>Reset position</button>
            {fields.length > 0 && <button onClick={() => reset_config(id)} className={btn}>Reset settings</button>}
            </span>
        </footer>
        </div>,
        document.body,
    );
};