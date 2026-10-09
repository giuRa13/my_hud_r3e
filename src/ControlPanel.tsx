import { useState } from 'react';
import { useLayout } from './store/LayoutContext';
import { widgets } from './widgets/registry';
import { hex_to_rgba } from './utils';
import WidgetSettingsModal from './widgets/WidgetSettingModal';

export type Mock = { 
    kmh: number; rpm_pct: number; gear: number;
    throttle: number; brake: number; clutch: number; ffb: number; 
};

type Props = {
  title?: string;
  mock?: Mock; // Only passed in design mode: shows the mock data sliders 
  onMockChange?: (m: Mock) => void;
  onClose?: () => void; // Only passed in game: shows close button 
};

function Slider({ label, value, min, max, suffix = "", onChange }: {
    label: string; 
    value: number; 
    min: number; max: number; 
    suffix?: string;
    onChange: (n: number) => void;
}) {
    return (
        <label className="block">
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
            <span>{label}</span>
            <span className="tabular-nums text-zinc-200">{value}{suffix}</span>
        </div>
        <input
            type="range" min={min} max={max} value={value}
            onChange={(e) => onChange(+e.target.value)}
            className="w-full accent-(--accent)"
        />
        </label>
    );
};

const btn = "px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs";

export default function ControlPanel({ title = "HUD editor", mock, onMockChange, onClose }: Props) {

    const { layout, settings, set_settings, set_visible, reset_all, copy_layout } = useLayout();
    const [copied, setCopied] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const side = settings.panel_side;


    return (
        <aside 
        className={`absolute top-3 bottom-3 w-72 flex flex-col rounded border border-white/10 bg-zinc-900/85 text-zinc-200 shadow-2xl 
            backdrop-blur pointer-events-auto
            ${side === 'left' ? 'left-3' : 'right-3'}`}
            style={{ backgroundColor: hex_to_rgba(settings.bg_color, Math.max(settings.bg_alpha, 0.35)) }}
        >
            <header className="flex items-center justify-between px-4 py-3 border-b border-(--accent) bg-(--accent)/20">
                <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
                <span className="flex items-center gap-2">
                    <button
                        onClick={() => set_settings({ panel_side: side === 'left' ? 'right' : 'left' })}
                        className={btn}
                        title="Move panel to the other side"
                    >
                        {side === 'left' ? '→' : '←'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className={btn} title="Close (Shift+E)">✕</button>
                    )}
                </span>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <section className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-(--accent)">Appearance</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Background colour</span>
                        <input
                            type="color" value={settings.bg_color}
                            onChange={(e) => set_settings({ bg_color: e.target.value })}
                            className="h-6 w-6 cursor-pointer rounded border-2 border-(--graphite) hover:border-(--accent)"
                        />
                    </div>
                    <Slider
                        label="Background alpha" suffix="%"
                        value={Math.round(settings.bg_alpha * 100)} min={0} max={100}
                        onChange={(n) => set_settings({ bg_alpha: n / 100 })}
                    />
                </section>

                {mock && onMockChange && (
                    <section className="space-y-3">
                        <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-(--accent)">Mock data</h3>
                        <Slider label="Speed km/h" value={mock.kmh} min={0} max={350}
                        onChange={(kmh) => onMockChange({ ...mock, kmh })} />
                        <Slider label="RPM %" value={mock.rpm_pct} min={0} max={100}
                        onChange={(rpm_pct) => onMockChange({ ...mock, rpm_pct })} />
                        <Slider label="Gear" value={mock.gear} min={-1} max={7}
                        onChange={(gear) => onMockChange({ ...mock, gear })} />

                        <Slider label="Throttle %" value={mock.throttle} min={0} max={100}
                        onChange={(throttle) => onMockChange({ ...mock, throttle })} />
                        <Slider label="Brake %" value={mock.brake} min={0} max={100}
                        onChange={(brake) => onMockChange({ ...mock, brake })} />
                        <Slider label="Clutch %" value={mock.clutch} min={0} max={100}
                        onChange={(clutch) => onMockChange({ ...mock, clutch })} />
                        <Slider label="FFB %" value={mock.ffb} min={0} max={100}
                        onChange={(ffb) => onMockChange({ ...mock, ffb })} />
                    </section>
                )}

                <section className="space-y-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-(--accent)">Widgets</h3>
                    {Object.entries(widgets).map(([id, w]) => (
                        <div key={id} className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={layout[id].visible}
                            onChange={(e) => set_visible(id, e.target.checked)}
                            className="accent-(--accent)"
                            title="Show / hide"
                        />
                        <span className={`flex-1 truncate ${layout[id].visible ? '' : 'text-zinc-500'}`}>{w.label}</span>
                        <button
                            onClick={() => setOpenId(openId === id ? null : id)}
                            className={`${btn} ${openId === id ? 'bg-sky-500/30' : ''}`}
                        >
                            Config
                        </button>
                        </div>
                    ))}
                    <button
                        onClick={() => set_settings({ locked: !settings.locked })}
                        className={`${btn} w-full ${settings.locked ? 'bg-(--accent)/30' : ''}`}
                    >
                        {settings.locked ? 'Widgets locked: click to unlock' : 'Widgets unlocked: click to lock'}
                    </button>
                    <p className="text-xs text-zinc-500 pt-1">
                        {settings.locked
                            ? 'Widgets ignore the mouse.'
                            : 'Drag to move, scroll over a widget to scale it.'}
                    </p>
                    </section>

                <section className="space-y-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 border-b border-(--accent)">Layout</h3>
                    <div className="flex gap-2">
                        <button
                        className={btn}
                        onClick={() => { copy_layout(); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                        >
                        {copied ? 'Copied!' : 'Copy layout'}
                        </button>
                        <button className={btn} onClick={reset_all}>Reset all</button>
                    </div>
                    <p className="text-xs text-zinc-500">
                        Ctrl+V a copied layout to load it.
                        {onClose
                        ? ' Press Shift+E to hide this panel.'
                        : ' Ctrl+V a Shift+D game state to use it as mock base.'}
                    </p>
                </section>
            </div>

            {openId && <WidgetSettingsModal id={openId} onClose={() => setOpenId(null)} />}

        </aside>
    );
};