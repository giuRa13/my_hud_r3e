import type { WidgetProps, SettingField } from './types';

export const pedals_settings: SettingField[] = [
    {
        key: 'orientation', label: 'Orientation', type: 'select', default: 'vertical',
        options: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }],
    },
    { key: 'show_throttle', label: 'Show throttle', type: 'boolean', default: true },
    { key: 'throttle_color', label: 'Throttle colour', type: 'color', default: '#05e701' },
    { key: 'show_brake', label: 'Show brake', type: 'boolean', default: true },
    { key: 'brake_color', label: 'Brake colour', type: 'color', default: '#e52249' },
    { key: 'show_clutch', label: 'Show clutch', type: 'boolean', default: true },
    { key: 'clutch_color', label: 'Clutch colour', type: 'color', default: '#eca40c' },
    { key: 'show_ffb', label: 'Show FFB', type: 'boolean', default: true },
    { key: 'ffb_color', label: 'FFB colour', type: 'color', default: '#727272' },
];

// -1 means N/A in the API, so anything outside 0..1 is clamped
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export default function PedalsWidget({ state, config }: WidgetProps) {

    const vertical = config.orientation !== "horizontal";

    const bars = [
        { key: "clutch", value: clamp01(state.Clutch) },
        { key: "ffb", value: clamp01(Math.abs(state.Player?.SteeringForcePercentage ?? 0)) },
        { key: "brake", value: clamp01(state.Brake) },
        { key: "throttle", value: clamp01(state.Throttle) },
    ].filter((b) => config[`show_${b.key}`]);

    return (
        <div className={`flex gap-1 ${vertical ? "flex-row" : "flex-col"}`}>
            {bars.map((b) => {
                const color = config[`${b.key}_color`];
                return (
                    <div key={b.key}
                    className={`relative overflow-hidden border-2 rounded-sm bg-black/30
                    ${vertical ? "h-[100px] w-[18px]" : 'h-[18px] w-[100px]'}`}
                    style={{ borderColor: "#464646"  }}
                    >
                        <div className='absolute bottom-0 left-0'
                        style={{
                            background: color,
                            ...(vertical 
                                ? {width: "100%", height: `${b.value * 100}%`}
                                : {height: "100%", width: `${b.value * 100}%`}
                            ),
                        }}>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};