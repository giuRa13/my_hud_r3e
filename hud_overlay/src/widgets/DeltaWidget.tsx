import type { WidgetProps, SettingField } from './types';

export const delta_settings: SettingField[] = [
    { key: 'font_size', label: 'Font size', type: 'number', min: 10, max: 64, default: 24, suffix: 'px' },
    { key: 'range', label: 'Full bar at', type: 'number', min: 0.5, max: 5, step: 0.5, default: 2, suffix: ' s' },
    { key: 'width', label: 'Bar width', type: 'number', min: 100, max: 1000, default: 500, suffix: 'px' },
    { key: 'bar_height', label: 'Bar height', type: 'number', min: 6, max: 40, default: 14, suffix: 'px' },
    { key: 'faster_color', label: 'Faster colour', type: 'color', default: '#05e701' },
    { key: 'slower_color', label: 'Slower colour', type: 'color', default: '#e52249' },
];

export default function DeltaWidget({ state, config }: WidgetProps) {
    const d = state.TimeDeltaBestSelf;
    const valid = Number.isFinite(d) && Math.abs(d) < 999; // -1000 = N/A

    const faster = valid && d < 0;
    const pct = valid ? Math.min(1, Math.abs(d) / config.range) : 0;
    const color = faster ? config.faster_color : config.slower_color;

    const text = valid ? `${d > 0 ? '+' : ''}${d.toFixed(3)}` : '--.---';

    return (
        <div className="flex flex-col items-center gap-1" style={{ width: config.width }}>
            <div
                className="relative w-full overflow-hidden bg-white/10"
                style={{ height: config.bar_height }}
            >
                {valid && (
                    <div
                        className="absolute top-0 h-full"
                        style={{
                            background: color,
                            width: `${pct * 50}%`,
                            ...(faster ? { left: '50%' } : { right: '50%' }),
                        }}
                    />
                )}
                {/* zero marker */}
                <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/70" />
            </div>

            <div
                className="font-semibold leading-none tabular-nums text-white"
                style={{ fontSize: config.font_size, color: color}}
            >
                {text}
            </div>
        </div>
    );
};