import type { WidgetProps, SettingField } from './types';

// BASE_URL keeps this working when the build is hosted under a sub-path (e.g. GitHub Pages)
const DEFAULT_WHEEL = `${import.meta.env.BASE_URL}wheel.png`;

export const wheel_settings: SettingField[] = [
    { key: 'size', label: 'Size', type: 'number', min: 60, max: 400, default: 140, suffix: 'px' },
    { key: 'image', label: 'Wheel image', type: 'image', default: '' },
    { key: 'circular', label: 'Circular frame', type: 'boolean', default: true },
    {
        key: 'rotation', label: 'Rotation based on', type: 'select', default: 'wheel',
        options: [
            { value: 'wheel', label: 'Wheel range' },
            { value: 'car', label: 'Car steer lock' },
        ],
    },
    { key: 'invert', label: 'Invert direction', type: 'boolean', default: false },
    { key: 'show_ring', label: 'Show steering ring', type: 'boolean', default: true },
    { key: 'ring_color', label: 'Ring colour', type: 'color', default: "#e52249" },
    { key: 'ring_width', label: 'Ring thickness', type: 'number', min: 2, max: 20, default: 6, suffix: 'px' },
    { key: 'ring_span', label: 'Ring at full lock', type: 'number', min: 10, max: 100, default: 50, suffix: '%' },
];

const TICK_DEG = 4; // the little line seen at 0°

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function WheelWidget({ state, config }: WidgetProps) {

    const input = Number.isFinite(state.SteerInputRaw) ? clamp(state.SteerInputRaw, -1, 1) : 0;

    // Degrees from centre to full lock. Falls back to 450 if the game reports nothing valid
    const half =
        config.rotation === 'car' ? state.SteerLockDegrees : state.SteerWheelRangeDegrees / 2;
    const max_deg = half > 0 && Number.isFinite(half) ? half : 450;
    const dir = config.invert ? -1 : 1;
    const angle = input * max_deg * dir;

    // Ring geometry
    const size: number = config.size;
    const rw: number = config.show_ring ? config.ring_width : 0;
    const r = size / 2 - rw / 2;
    const C = 2 * Math.PI * r;
    const img_size = Math.max(10, size - 2 * (rw + 4)); // wheel image sits inside the ring

    // Ring: starts at the top; right steer clockwise, left anticlockwise
    const steer = input * dir;
    const arc_deg = TICK_DEG + Math.abs(steer) * (config.ring_span / 100) * 360;
    const dash = `${(C * Math.min(360, arc_deg)) / 360} ${C}`;
    const to_top = `rotate(${-90 - TICK_DEG / 2} ${size / 2} ${size / 2})`;
    const mirror = `translate(${size} 0) scale(-1 1)`; // flips the arc to the left side

    return (
        <div className="relative" style={{ width: size, height: size }}>
            {config.show_ring && (
                <svg className="pointer-events-none absolute inset-0" width={size} height={size}>
                    {/* faint track */}
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke="rgba(255,255,255,0.0)" strokeWidth={rw} />
                    <g transform={steer < 0 ? mirror : undefined}>
                        <circle
                            cx={size / 2} cy={size / 2} r={r} fill="none"
                            stroke={config.ring_color} strokeWidth={rw}
                            strokeDasharray={dash} transform={to_top}
                        />
                    </g>
                </svg>
            )}
            <img
                src={config.image || DEFAULT_WHEEL}
                alt=""
                draggable={false}
                className="pointer-events-none absolute block select-none"
                style={{
                    left: (size - img_size) / 2,
                    top: (size - img_size) / 2,
                    width: img_size,
                    height: img_size,
                    objectFit: "contain",
                    transform: `rotate(${angle}deg)`,
                }}
            />
        </div>
    );

};