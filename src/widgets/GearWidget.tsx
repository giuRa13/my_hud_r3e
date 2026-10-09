import type IShared from '../data/r3eTypes';
import type { WidgetProps, SettingField } from './types';

export const gear_settings: SettingField[] = [
    { key: 'redline', label: 'Redline threshold', type: 'number', min: 50, max: 120, default: 91, suffix: '%' },
    { key: 'optimal', label: 'Optimal threshold', type: 'number', min: 50, max: 120, default: 95, suffix: '%' },
    { key: 'overrev', label: 'Overrev threshold', type: 'number', min: 50, max: 120, default: 98, suffix: '%' },
    { key: 'redline_color', label: 'Redline colour', type: 'color', default: '#FF1E44' },
    { key: 'optimal_color', label: 'Optimal colour', type: 'color', default: '#00AAFF' },
    { key: 'overrev_color', label: 'Overrev colour', type: 'color', default: '#FF00FF' },
    { key: 'show_rpm', label: 'Show RPM text', type: 'boolean', default: true },
    {
        key: 'speed_unit', label: 'Speed unit', type: 'select', default: 'kmh',
        options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }],
    },
];

const gear_label = (g: number) =>
    g === -2 ? "-" : g === -1 ? "R" : g === 0 ? "N" : String(g);

const rpm_value = (rps: number) => Math.round(rps * 9.549);

export default function GearWidget({ state, config }: WidgetProps) {

    const max = state.MaxEngineRps;
    const ref = state.UpshiftRps > 0 ? state.UpshiftRps : max;

    const rps = Math.max(0, state.EngineRps);
    const shift_ratio = ref > 0 ? rps / ref : 0;      
    const bar_pct = max > 0 ? Math.min(100, (rps / max) * 100) : 0;

    let bg: string | undefined;
    if (shift_ratio >= config.overrev / 100) bg = config.overrev_color;
    else if (shift_ratio >= config.optimal / 100) bg = config.optimal_color;
    else if (shift_ratio >= config.redline / 100) bg = config.redline_color;

    const mph = config.speed_unit === 'mph';
    const speed = Math.max(0, Math.round(state.CarSpeed * (mph ? 2.23694 : 3.6)));

  return (
    <div className="relative flex h-[170px] w-[150px] flex-col items-center justify-center pb-[28px] text-white"
        style={{ backgroundColor: bg }}
    >

        <div className="text-[104px] font-bold leading-none">{gear_label(state.Gear)}</div>

        <div className="mt-1 flex items-baseline gap-1 ">
            <span className="text-xl font-semibold tabular-nums">{speed}</span>
            <span className="text-xs opacity-70">{mph ? "mph" : "km/h"}</span>
        </div>

        <div className='absolute bottom-0 left-0 h-[18px] w-full bg-white/20'>
            <div className='h-full bg-white' style={{ width: `${bar_pct}%` }} />
            {config.show_rpm && (
                <div className="absolute inset-0 flex items-center justify-center text-xs leading-none tabular-nums text-black font-semibold">
                    {rpm_value(rps)} rps
                </div>
            )}
        </div>
    </div>
  )
}

